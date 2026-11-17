<script setup lang="ts">
/**
 * Montre d'où vient un montant lu : la page du PDF, rendue sur l'appareil (pdf.js), avec la zone du code et du montant
 * en surbrillance. Le fichier vient de la bibliothèque (déchiffré par le Coffre au besoin) ; rien n'est envoyé.
 */
defineOptions({ name: 'TaxPdfZoneModal' });

import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { loadReadablePdf } from '@/features/files/content';
import { openPdfDocument } from '@/features/tax/reader/pdf';
import type { TaxReadBox } from '@/features/tax/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const open = defineModel<boolean>({ required: true });

const props = defineProps<{
    filePublicId: string | null;
    boxes: TaxReadBox[];
    title: string;
}>();

const { t } = useI18n();

/** Largeur d'affichage d'une page (px CSS) ; la page est rendue plus fine sur un écran haute densité. */
const PAGE_WIDTH = 720;
/** Marge autour de la zone (points PDF), pour qu'elle ne colle pas au texte. */
const PAD = 3;

interface RenderedPage {
    page: number;
    width: number;
    height: number;
    zones: { left: number; top: number; width: number; height: number }[];
}

const loading = ref(false);
const failure = ref('');
const pages = ref<RenderedPage[]>([]);
const canvases = ref<HTMLCanvasElement[]>([]);
const doc = shallowRef<{ id: string; pdf: PDFDocumentProxy } | null>(null);
let run = 0;

async function documentFor(id: string): Promise<PDFDocumentProxy> {
    if (doc.value?.id === id) return doc.value.pdf;
    void doc.value?.pdf.destroy();
    doc.value = null;
    const pdf = await openPdfDocument(await loadReadablePdf(id));
    doc.value = { id, pdf };
    return pdf;
}

async function render() {
    const current = ++run;
    failure.value = '';
    pages.value = [];
    if (!props.filePublicId || !props.boxes.length) {
        failure.value = t('taxPage.zone.unavailable');
        return;
    }
    loading.value = true;
    try {
        const pdf = await documentFor(props.filePublicId);
        const numbers = [...new Set(props.boxes.map((box) => box.page))].sort((a, b) => a - b);
        const loaded = await Promise.all(numbers.map((number) => pdf.getPage(number)));
        if (current !== run) return;
        const viewports = loaded.map((page) => page.getViewport({ scale: PAGE_WIDTH / page.getViewport({ scale: 1 }).width }));
        pages.value = loaded.map((page, index) => {
            const viewport = viewports[index];
            return {
                page: numbers[index],
                width: viewport.width,
                height: viewport.height,
                zones: props.boxes
                    .filter((box) => box.page === numbers[index])
                    .map((box) => {
                        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
                            box.x - PAD,
                            box.y - PAD,
                            box.x + box.w + PAD,
                            box.y + box.h + PAD
                        ]);
                        return {
                            left: Math.min(x1, x2),
                            top: Math.min(y1, y2),
                            width: Math.abs(x2 - x1),
                            height: Math.abs(y2 - y1)
                        };
                    })
            };
        });
        await nextTick();
        const ratio = window.devicePixelRatio || 1;
        await Promise.all(
            loaded.map((page, index) => {
                const canvas = canvases.value[index];
                const context = canvas?.getContext('2d');
                if (!canvas || !context) return Promise.resolve();
                const viewport = viewports[index];
                canvas.width = Math.floor(viewport.width * ratio);
                canvas.height = Math.floor(viewport.height * ratio);
                return page.render({
                    canvas,
                    canvasContext: context,
                    viewport,
                    transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]
                }).promise;
            })
        );
        if (current !== run) return;
        await nextTick();
        document.querySelector('.tax-pdf-zone__mark')?.scrollIntoView({ block: 'center' });
    } catch (e) {
        if (current === run) failure.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        if (current === run) loading.value = false;
    }
}

watch(open, (isOpen) => {
    if (isOpen) void render();
    else run++;
});

onBeforeUnmount(() => {
    run++;
    void doc.value?.pdf.destroy();
    doc.value = null;
});
</script>

<template>
    <AppModalBase v-model="open" :title="t('taxPage.zone.title')" :subtitle="title" :max-width="800" scrollable mobile-layout="fullscreen">
        <p v-if="loading" class="tax-muted">{{ t('taxPage.zone.loading') }}</p>
        <p v-if="failure" class="tax-error" role="alert">{{ failure }}</p>
        <div v-for="item in pages" :key="item.page" class="tax-pdf-zone">
            <p class="tax-muted">{{ t('taxPage.zone.page', { page: item.page }) }}</p>
            <div class="tax-pdf-zone__page" :style="{ width: `${item.width}px`, height: `${item.height}px` }">
                <canvas ref="canvases" class="tax-pdf-zone__canvas" :style="{ width: `${item.width}px`, height: `${item.height}px` }" />
                <span
                    v-for="(zone, index) in item.zones"
                    :key="index"
                    class="tax-pdf-zone__mark"
                    :style="{ left: `${zone.left}px`, top: `${zone.top}px`, width: `${zone.width}px`, height: `${zone.height}px` }"
                    aria-hidden="true"
                />
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('taxPage.zone.close') }}</button>
        </template>
    </AppModalBase>
</template>
