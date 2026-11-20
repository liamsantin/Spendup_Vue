<script setup lang="ts">
/**
 * Lecteur PDF maison (pdf.js) : pages dessinées sur canvas, l’une sous l’autre, à la largeur du conteneur.
 * Même rendu sur le web, le mobile et l’app de bureau, sans la barre d’outils du lecteur natif.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowAutofitWidthIcon, MinusIcon, PlusIcon } from 'vue-tabler-icons';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

/** pdf.js chargé à la première ouverture : il touche `DOMMatrix` dès l’import, et pèse lourd dans le bundle. */
let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfjs() {
    pdfjsReady ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs;
    });
    return pdfjsReady;
}

const props = defineProps<{
    /** PDF déjà déchiffré. */
    file: Blob;
    title: string;
}>();

const { t } = useI18n();

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const PAGE_GAP = 16;
/** Largeur max d’une page à 100 % : au-delà, une page A4 devient trop grande à l’écran. */
const MAX_FIT_WIDTH = 960;

const scroller = ref<HTMLElement | null>(null);
const doc = shallowRef<PDFDocumentProxy | null>(null);
const pageCount = ref(0);
const currentPage = ref(1);
/** Zoom d’ouverture : 75 % de la largeur disponible, une page entière reste lisible sans défiler autant. */
const DEFAULT_ZOOM = 0.75;
const zoom = ref(DEFAULT_ZOOM);
const containerWidth = ref(0);
/** Ratio hauteur / largeur de chaque page, pour réserver la place avant le rendu. */
const ratios = ref<number[]>([]);
const failed = ref(false);

let loadingTask: PDFDocumentLoadingTask | null = null;
let resizeObserver: ResizeObserver | null = null;
let pageObserver: IntersectionObserver | null = null;
let resizeFrame = 0;
/** Numéro de l’ouverture en cours : une ouverture dépassée ne touche plus à l’état. */
let openId = 0;
const canvases = new Map<number, HTMLCanvasElement>();
/** Largeur de rendu de chaque page déjà dessinée, pour ne redessiner qu’au changement. */
const renderedWidth = new Map<number, number>();
const renderTasks = new Map<number, { cancel: () => void }>();
const visible = new Set<number>();

const pageWidth = computed(() => {
    const fit = Math.min(containerWidth.value - 2 * PAGE_GAP, MAX_FIT_WIDTH);
    return Math.max(120, Math.round(fit * zoom.value));
});
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)} %`);
const canZoomOut = computed(() => zoom.value > ZOOM_STEPS[0]);
const canZoomIn = computed(() => zoom.value < ZOOM_STEPS[ZOOM_STEPS.length - 1]);

function pageHeight(index: number) {
    return Math.round(pageWidth.value * (ratios.value[index] ?? 1.414));
}

async function open(file: Blob) {
    close();
    const id = ++openId;
    failed.value = false;
    try {
        const data = new Uint8Array(await file.arrayBuffer());
        if (id !== openId) return;
        const { getDocument } = await loadPdfjs();
        if (id !== openId) return;
        loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;
        const nextRatios: number[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const viewport = (await pdf.getPage(i)).getViewport({ scale: 1 });
            nextRatios.push(viewport.height / viewport.width);
        }
        if (id !== openId) return;
        doc.value = pdf;
        ratios.value = nextRatios;
        pageCount.value = pdf.numPages;
        currentPage.value = 1;
        await nextTick();
        observePages();
    } catch (e: unknown) {
        if (id !== openId || (e as { name?: string } | null)?.name === 'AbortException') return;
        failed.value = true;
    }
}

function close() {
    openId += 1;
    pageObserver?.disconnect();
    renderTasks.forEach((task) => task.cancel());
    renderTasks.clear();
    renderedWidth.clear();
    visible.clear();
    void loadingTask?.destroy();
    loadingTask = null;
    doc.value = null;
    pageCount.value = 0;
    ratios.value = [];
}

function setCanvas(index: number, el: unknown) {
    if (el instanceof HTMLCanvasElement) canvases.set(index, el);
    else canvases.delete(index);
}

async function renderPage(index: number) {
    const pdf = doc.value;
    const canvas = canvases.get(index);
    if (!pdf || !canvas) return;
    const width = pageWidth.value;
    if (renderedWidth.get(index) === width) return;
    renderTasks.get(index)?.cancel();
    renderedWidth.set(index, width);

    const page = await pdf.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const viewport = page.getViewport({ scale: (width / base.width) * dpr });
    // pdf.js ne dimensionne pas le canvas : sans cela il reste en 300 × 150 et n’affiche qu’un coin blanc
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const task = page.render({ canvas, viewport });
    renderTasks.set(index, task);
    try {
        await task.promise;
    } catch {
        // rendu annulé (zoom ou fermeture) : la page sera redessinée au besoin
        if (renderedWidth.get(index) === width) renderedWidth.delete(index);
    } finally {
        if (renderTasks.get(index) === task) renderTasks.delete(index);
    }
}

function observePages() {
    pageObserver?.disconnect();
    const root = scroller.value;
    if (!root) return;
    pageObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const index = Number((entry.target as HTMLElement).dataset.index);
                if (entry.isIntersecting) {
                    visible.add(index);
                    void renderPage(index);
                } else {
                    visible.delete(index);
                }
            }
        },
        { root, rootMargin: '600px 0px' }
    );
    root.querySelectorAll('.pdf-viewer__page').forEach((el) => pageObserver?.observe(el));
}

/** Page courante : celle qui occupe le premier tiers de la zone visible. */
function onScroll() {
    const root = scroller.value;
    if (!root || !pageCount.value) return;
    const probe = root.scrollTop + root.clientHeight / 3;
    let bottom = PAGE_GAP;
    for (let i = 0; i < pageCount.value; i++) {
        bottom += pageHeight(i) + PAGE_GAP;
        if (probe < bottom) {
            currentPage.value = i + 1;
            return;
        }
    }
    currentPage.value = pageCount.value;
}

/** Change le zoom en gardant la même position relative dans le document. */
async function setZoom(next: number) {
    const root = scroller.value;
    const ratio = root && root.scrollHeight ? root.scrollTop / root.scrollHeight : 0;
    zoom.value = next;
    await nextTick();
    if (root) root.scrollTop = ratio * root.scrollHeight;
    visible.forEach((index) => void renderPage(index));
}

function zoomIn() {
    const next = ZOOM_STEPS.find((step) => step > zoom.value + 0.001);
    if (next) void setZoom(next);
}

function zoomOut() {
    const next = [...ZOOM_STEPS].reverse().find((step) => step < zoom.value - 0.001);
    if (next) void setZoom(next);
}

onMounted(() => {
    const root = scroller.value;
    if (!root) return;
    containerWidth.value = root.clientWidth;
    resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(async () => {
            containerWidth.value = root.clientWidth;
            await nextTick();
            visible.forEach((index) => void renderPage(index));
        });
    });
    resizeObserver.observe(root);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(resizeFrame);
    resizeObserver?.disconnect();
    close();
});

watch(
    () => props.file,
    (file) => void open(file),
    { immediate: true }
);
</script>

<template>
    <div class="pdf-viewer">
        <div class="pdf-viewer__bar">
            <span class="pdf-viewer__name" :title="title">{{ title }}</span>
            <span v-if="pageCount" class="pdf-viewer__pages" aria-live="polite">
                {{ t('filesPage.preview.pageOf', { current: currentPage, total: pageCount }) }}
            </span>
            <div class="pdf-viewer__zoom">
                <button type="button" class="su-orb" :disabled="!canZoomOut" :aria-label="t('filesPage.preview.zoomOut')" @click="zoomOut">
                    <MinusIcon :size="18" stroke-width="1.6" />
                </button>
                <span class="pdf-viewer__zoom-value">{{ zoomLabel }}</span>
                <button type="button" class="su-orb" :disabled="!canZoomIn" :aria-label="t('filesPage.preview.zoomIn')" @click="zoomIn">
                    <PlusIcon :size="18" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="zoom === 1"
                    :aria-label="t('filesPage.preview.fitWidth')"
                    :title="t('filesPage.preview.fitWidth')"
                    @click="setZoom(1)"
                >
                    <ArrowAutofitWidthIcon :size="18" stroke-width="1.6" />
                </button>
            </div>
        </div>

        <div ref="scroller" class="pdf-viewer__scroller" @scroll.passive="onScroll">
            <p v-if="failed" class="pdf-viewer__state">{{ t('filesPage.preview.unavailable') }}</p>
            <div v-else-if="!pageCount" class="pdf-viewer__state"><span class="su-spin" /></div>
            <template v-else>
                <div
                    v-for="(_, index) in ratios"
                    :key="index"
                    class="pdf-viewer__page"
                    :data-index="index"
                    :style="{ width: `${pageWidth}px`, height: `${pageHeight(index)}px` }"
                >
                    <canvas
                        :ref="(el) => setCanvas(index, el)"
                        class="pdf-viewer__canvas"
                        role="img"
                        :aria-label="t('filesPage.preview.pageOf', { current: index + 1, total: pageCount })"
                    />
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.pdf-viewer {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
}

/* barre : nom à gauche, numéro de page, zoom à droite, filet 2 px dessous */
.pdf-viewer__bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 24px;
    min-height: 52px;
    padding: 0 8px 0 16px;
    border-bottom: 2px solid var(--ink);
}

.pdf-viewer__name {
    overflow: hidden;
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.pdf-viewer__pages,
.pdf-viewer__zoom-value {
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.pdf-viewer__zoom {
    display: flex;
    align-items: center;
    gap: 4px;
}

.pdf-viewer__zoom-value {
    min-width: 48px;
    text-align: center;
}

/* zone de lecture : pages centrées sur fond doux, défilement vertical (et horizontal une fois zoomé) */
.pdf-viewer__scroller {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    gap: 16px;
    min-height: 0;
    padding: 16px;
    overflow: auto;
    background: var(--soft);
}

.pdf-viewer__page {
    flex: 0 0 auto;
    margin-inline: auto;
    background: #fff; /* une page imprimée reste blanche, même en mode sombre */
    border: 1px solid var(--line);
}

.pdf-viewer__canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.pdf-viewer__state {
    display: grid;
    place-items: center;
    flex: 1;
    min-height: 240px;
    margin: 0;
    color: var(--gray);
}

@media (max-width: 767px) {
    .pdf-viewer__bar {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
    }

    .pdf-viewer__pages {
        display: none;
    }

    .pdf-viewer__scroller {
        gap: 8px;
        padding: 8px;
    }
}
</style>
