<script setup lang="ts">
/**
 * Ajout de justificatifs, sous deux formes :
 * - `menu` (onglet Justificatifs) : un seul bouton « Ajouter » en haut à droite, comme les autres onglets ; son menu
 *   propose « Uploader un PDF » et « Choisir », qui ouvre une fenêtre avec tous les PDF de la bibliothèque,
 *   une recherche et une sélection multiple ;
 * - par défaut (formulaire) : « Choisir dans Fichiers » puis « Uploader un PDF » côte à côte sous la liste.
 */
defineOptions({ name: 'AttachmentActions' });

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, FilePlusIcon, PlusIcon, SearchIcon, UploadIcon } from 'vue-tabler-icons';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { displayFileName } from '@/features/files/file-name-display';
import { fileSizeParts } from '@/features/files/format';
import { FILE_PDF_MIME, type FileDto } from '@/features/files/types';
import { TRANSACTION_FILES_MAX } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        /** Fichiers déjà liés : exclus du choix, comptés pour le plafond. */
        attached: { publicId: string }[];
        library: FileDto[];
        uploading?: boolean;
        acting?: boolean;
        max?: number;
        /** Un seul bouton « Ajouter » avec menu, aligné à droite. */
        menu?: boolean;
    }>(),
    {
        uploading: false,
        acting: false,
        max: TRANSACTION_FILES_MAX,
        menu: false
    }
);

const emit = defineEmits<{
    upload: [file: File];
    pick: [file: FileDto];
    /** Plusieurs fichiers choisis d’un coup dans la fenêtre « Choisir ». */
    pickMany: [files: FileDto[]];
}>();

const { t } = useI18n();
const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const pickerOpen = ref(false);

const maxReached = computed(() => props.attached.length >= props.max);
const attachedIds = computed(() => new Set(props.attached.map((file) => file.publicId)));
const pickable = computed(() => props.library.filter((file) => !attachedIds.value.has(file.publicId)));
const busy = computed(() => props.uploading || props.acting);

function sizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}

function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) emit('upload', file);
}

function openUpload() {
    pickerOpen.value = false;
    inputRef.value?.click();
}

function pick(file: FileDto) {
    pickerOpen.value = false;
    libraryOpen.value = false;
    emit('pick', file);
}

/* ── fenêtre « Choisir » : tous les PDF de la bibliothèque, ceux déjà liés grisés ── */
const libraryOpen = ref(false);
const libraryQuery = ref('');

const libraryRows = computed(() => {
    const needle = libraryQuery.value.trim().toLocaleLowerCase();
    return props.library
        .map((file) => ({
            file,
            name: displayFileName(file.publicId, file.nameOriginal, t('vault.unreadable')),
            linked: attachedIds.value.has(file.publicId)
        }))
        .filter((row) => !needle || row.name.toLocaleLowerCase().includes(needle));
});

/** Sélection multiple : fichiers cochés, dans la limite des places restantes. */
const chosenIds = ref<string[]>([]);
const chosenCount = computed(() => chosenIds.value.length);
const remainingSlots = computed(() => Math.max(0, props.max - props.attached.length));

function toggleChosen(publicId: string) {
    if (chosenIds.value.includes(publicId)) {
        chosenIds.value = chosenIds.value.filter((id) => id !== publicId);
        return;
    }
    if (chosenCount.value >= remainingSlots.value) return;
    chosenIds.value = [...chosenIds.value, publicId];
}

function confirmChosen() {
    const files = props.library.filter((file) => chosenIds.value.includes(file.publicId) && !attachedIds.value.has(file.publicId));
    if (!files.length) return;
    libraryOpen.value = false;
    emit('pickMany', files);
}

function openLibrary() {
    pickerOpen.value = false;
    libraryQuery.value = '';
    chosenIds.value = [];
    libraryOpen.value = true;
}

/** Clic hors du menu ou Échap : on le ferme. */
function onDocumentPointer(event: PointerEvent) {
    if (pickerOpen.value && event.target instanceof Node && !rootRef.value?.contains(event.target)) pickerOpen.value = false;
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') pickerOpen.value = false;
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocumentPointer);
    document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPointer);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <div ref="rootRef" class="attach-actions" :class="{ 'attach-actions--menu': menu }">
        <input ref="inputRef" class="attach-actions__input" type="file" :accept="`${FILE_PDF_MIME},.pdf`" @change="onFileSelected" />

        <!-- onglet : un bouton « Ajouter », menu ouvert vers la gauche -->
        <div v-if="menu" class="attach-actions__picker">
            <button
                type="button"
                class="su-btn su-btn--ink"
                :disabled="busy || maxReached"
                aria-haspopup="menu"
                :aria-expanded="pickerOpen"
                @click="pickerOpen = !pickerOpen"
            >
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ uploading ? t('transactionsPage.form.attachments.uploading') : t('transactionsPage.form.attachments.add') }}
            </button>
            <div v-if="pickerOpen" class="attach-actions__menu" role="menu">
                <button type="button" class="attach-actions__option" role="menuitem" @click="openUpload">
                    <span><UploadIcon :size="16" stroke-width="1.6" /> {{ t('transactionsPage.form.attachments.upload') }}</span>
                </button>
                <button type="button" class="attach-actions__option" role="menuitem" @click="openLibrary">
                    <span><FilePlusIcon :size="16" stroke-width="1.6" /> {{ t('transactionsPage.form.attachments.choose') }}</span>
                </button>
            </div>
        </div>

        <!-- formulaire : deux boutons, l’envoi (principal) en dernier -->
        <template v-else>
            <div class="attach-actions__picker">
                <button type="button" class="su-btn" :disabled="busy || maxReached || !pickable.length" @click="pickerOpen = !pickerOpen">
                    <FilePlusIcon :size="16" stroke-width="1.6" />
                    {{ t('transactionsPage.form.attachments.pick') }}
                </button>
                <div v-if="pickerOpen" class="attach-actions__menu" role="listbox">
                    <button v-for="file in pickable" :key="file.publicId" type="button" class="attach-actions__option" @click="pick(file)">
                        <span>{{ displayFileName(file.publicId, file.nameOriginal, t('vault.unreadable')) }}</span>
                        <span>{{ sizeLabel(file.sizeBytes) }}</span>
                    </button>
                </div>
            </div>
            <button type="button" class="su-btn su-btn--ink" :disabled="busy || maxReached" @click="openUpload">
                <UploadIcon :size="16" stroke-width="1.6" />
                {{ uploading ? t('transactionsPage.form.attachments.uploading') : t('transactionsPage.form.attachments.upload') }}
            </button>
        </template>

        <AppModalBase
            v-if="menu"
            v-model="libraryOpen"
            :title="t('transactionsPage.form.attachments.chooseTitle')"
            :subtitle="t('transactionsPage.form.attachments.chooseSubtitle')"
            :max-width="640"
            :height="660"
        >
            <label class="su-search attach-actions__search">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    v-model="libraryQuery"
                    class="su-search__input"
                    type="search"
                    :placeholder="t('filesPage.searchPlaceholder')"
                    :aria-label="t('filesPage.searchPlaceholder')"
                    autocomplete="off"
                />
            </label>

            <div v-if="libraryRows.length" class="attach-actions__toolbar">
                <span>{{ t('transactionsPage.form.attachments.chooseSelected', { count: chosenCount }, chosenCount) }}</span>
                <button type="button" class="su-link attach-actions__clear" :disabled="!chosenCount" @click="chosenIds = []">
                    {{ t('transactionsPage.linkTransactions.selectNone') }}
                </button>
            </div>

            <p v-if="!libraryRows.length" class="attach-actions__none">
                {{
                    libraryQuery.trim()
                        ? t('transactionsPage.form.attachments.chooseNoMatch')
                        : t('transactionsPage.form.attachments.libraryEmpty')
                }}
            </p>
            <ul v-else class="attach-actions__library">
                <li v-for="row in libraryRows" :key="row.file.publicId">
                    <button
                        type="button"
                        class="attach-actions__file"
                        :class="{ 'is-selected': chosenIds.includes(row.file.publicId) }"
                        :disabled="row.linked || (!chosenIds.includes(row.file.publicId) && chosenCount >= remainingSlots)"
                        :aria-pressed="chosenIds.includes(row.file.publicId)"
                        @click="toggleChosen(row.file.publicId)"
                    >
                        <span class="attach-actions__check" aria-hidden="true">
                            <CheckIcon v-if="row.linked || chosenIds.includes(row.file.publicId)" :size="14" stroke-width="2.2" />
                        </span>
                        <span class="attach-actions__file-name">{{ row.name }}</span>
                        <span class="attach-actions__file-meta">{{
                            row.linked ? t('transactionsPage.form.attachments.alreadyLinked') : sizeLabel(row.file.sizeBytes)
                        }}</span>
                    </button>
                </li>
            </ul>

            <template #footer="{ close }">
                <button type="button" class="su-btn" @click="close">{{ t('common.cancel') }}</button>
                <button type="button" class="su-btn su-btn--ink" :disabled="!chosenCount" @click="confirmChosen">
                    {{ t('transactionsPage.form.attachments.chooseConfirm', { count: chosenCount }, chosenCount) }}
                </button>
            </template>
        </AppModalBase>

        <p v-if="maxReached" class="attach-actions__max">
            {{ t('transactionsPage.form.attachments.maxFiles', { max }) }}
        </p>
    </div>
</template>

<style scoped>
/* rangée de boutons ; dans un onglet elle s’aligne à droite comme les autres barres d’actions */
.attach-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.attach-actions--menu {
    justify-content: flex-end;
}

.attach-actions__input {
    display: none;
}

.attach-actions__picker {
    position: relative;
}

/* menu carré : bordure noire, ombre décalée */
.attach-actions__menu {
    position: absolute;
    z-index: 4;
    top: calc(100% + 4px);
    left: 0;
    min-width: 240px;
    max-height: 280px;
    overflow: auto;
    padding: 8px;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: var(--raise);
    box-shadow: var(--shadow-offset);
}

.attach-actions--menu .attach-actions__menu {
    right: 0;
    left: auto;
}

.attach-actions__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.attach-actions__option + .attach-actions__option {
    border-top: 1px solid var(--line);
}

.attach-actions__option:hover,
.attach-actions__option:focus-visible {
    background: var(--soft);
    outline: none;
}

.attach-actions__option span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.attach-actions__option span:first-child > svg {
    flex: none;
    color: var(--gray);
}

.attach-actions__option span:last-child:not(:first-child) {
    flex: none;
    color: var(--gray);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
}

.attach-actions__none {
    margin: 0;
    padding: 4px 10px 8px;
    color: var(--gray);
    font-size: 13px;
}

/* fenêtre de choix : recherche en ligne, puis une ligne par PDF à filet fin */
/* recherche alignée à gauche, sur toute la largeur de la fenêtre */
.attach-actions__search {
    width: 100%;
    margin: 0 0 12px;
}

.attach-actions__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
    color: var(--gray);
    font-size: 13px;
}

.attach-actions__clear {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

.attach-actions__clear:disabled {
    color: var(--gray);
    cursor: default;
}

/* case à cocher carrée : vide, cochée (encre), ou déjà liée (grise) */
.attach-actions__check {
    display: grid;
    place-items: center;
    flex: none;
    width: 18px;
    height: 18px;
    border: 1px solid var(--ink);
    color: var(--bg);
}

.attach-actions__file.is-selected .attach-actions__check {
    background: var(--ink);
}

.attach-actions__file.is-selected {
    background: var(--soft);
}

.attach-actions__file:disabled .attach-actions__check {
    border-color: var(--line);
    color: var(--gray);
}

.attach-actions__library {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.attach-actions__file {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 4px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.attach-actions__file:hover:not(:disabled),
.attach-actions__file:focus-visible {
    background: var(--soft);
    outline: none;
}

.attach-actions__file:disabled {
    color: var(--gray);
    cursor: default;
}

.attach-actions__file > svg {
    flex: none;
    color: var(--gray);
}

.attach-actions__file-name {
    min-width: 0;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.attach-actions__file:disabled .attach-actions__file-name {
    font-weight: 400;
}

.attach-actions__file-meta {
    flex: none;
    margin-left: auto;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.attach-actions__max {
    flex: 1 1 100%;
    margin: 0;
    color: var(--gray);
    font-size: 13px;
}

.attach-actions--menu .attach-actions__max {
    text-align: right;
}
</style>
