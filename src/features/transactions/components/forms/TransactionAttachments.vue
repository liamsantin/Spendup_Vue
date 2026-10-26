<script setup lang="ts">
defineOptions({ name: 'TransactionAttachments' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { FilePlusIcon, PaperclipIcon, UploadIcon, XIcon } from 'vue-tabler-icons';
import { fileSizeParts } from '@/features/files/format';
import { FILE_PDF_MIME, type FileDto } from '@/features/files/types';
import { TRANSACTION_FILES_MAX, type TransactionFile } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        files: TransactionFile[];
        library: FileDto[];
        canEdit: boolean;
        uploading?: boolean;
        acting?: boolean;
    }>(),
    {
        uploading: false,
        acting: false
    }
);

const emit = defineEmits<{
    upload: [file: File];
    pick: [file: FileDto];
    detach: [file: TransactionFile];
    open: [file: TransactionFile];
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);
const pickerOpen = ref(false);

const maxReached = computed(() => props.files.length >= TRANSACTION_FILES_MAX);
const attachedIds = computed(() => new Set(props.files.map((file) => file.publicId)));
const pickable = computed(() => props.library.filter((file) => !attachedIds.value.has(file.publicId)));
const busy = computed(() => props.uploading || props.acting);

function sizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}

function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    const file = files[0];
    if (file) emit('upload', file);
}

function pick(file: FileDto) {
    pickerOpen.value = false;
    emit('pick', file);
}
</script>

<template>
    <section class="tx-files">
        <p class="tx-files__hint">{{ t('transactionsPage.form.attachments.hint', { max: TRANSACTION_FILES_MAX }) }}</p>

        <ul v-if="files.length" class="tx-files__list">
            <li v-for="file in files" :key="file.publicId" class="tx-files__chip">
                <button type="button" class="tx-files__open" :disabled="busy" @click="emit('open', file)">
                    <PaperclipIcon :size="16" stroke-width="1.6" />
                    <span class="tx-files__name">{{ file.nameOriginal }}</span>
                    <span class="tx-files__size">{{ sizeLabel(file.sizeBytes) }}</span>
                </button>
                <button
                    v-if="canEdit"
                    type="button"
                    class="su-orb"
                    :disabled="busy"
                    :aria-label="t('transactionsPage.form.attachments.detach')"
                    @click="emit('detach', file)"
                >
                    <XIcon :size="14" stroke-width="1.8" />
                </button>
            </li>
        </ul>
        <p v-else class="tx-files__empty">{{ t('transactionsPage.form.attachments.empty') }}</p>

        <div v-if="canEdit" class="tx-files__actions">
            <input ref="inputRef" class="tx-files__input" type="file" :accept="`${FILE_PDF_MIME},.pdf`" @change="onFileSelected" />
            <button type="button" class="su-btn su-btn--ink" :disabled="busy || maxReached" @click="inputRef?.click()">
                <UploadIcon :size="16" stroke-width="1.6" />
                {{ uploading ? t('transactionsPage.form.attachments.uploading') : t('transactionsPage.form.attachments.upload') }}
            </button>
            <div class="tx-files__picker">
                <button type="button" class="su-btn" :disabled="busy || maxReached || !pickable.length" @click="pickerOpen = !pickerOpen">
                    <FilePlusIcon :size="16" stroke-width="1.6" />
                    {{ t('transactionsPage.form.attachments.pick') }}
                </button>
                <div v-if="pickerOpen" class="tx-files__menu" role="listbox">
                    <button v-for="file in pickable" :key="file.publicId" type="button" class="tx-files__option" @click="pick(file)">
                        <span>{{ file.nameOriginal }}</span>
                        <span>{{ sizeLabel(file.sizeBytes) }}</span>
                    </button>
                </div>
            </div>
            <p v-if="maxReached" class="tx-files__max">
                {{ t('transactionsPage.form.attachments.maxReached', { max: TRANSACTION_FILES_MAX }) }}
            </p>
        </div>
    </section>
</template>

<style scoped>
/* Justificatifs : lignes à filet fin, menu de choix carré (bordure noire, ombre décalée). */
.tx-files {
    min-height: 0;
}

.tx-files__hint,
.tx-files__empty,
.tx-files__max,
.tx-files__size {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.tx-files__empty {
    margin-top: 12px;
}

.tx-files__list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--line);
}

.tx-files__chip {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    border-bottom: 1px solid var(--line);
}

.tx-files__open {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
    min-height: 44px;
    padding: 8px 4px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.tx-files__open:hover:not(:disabled) {
    background: var(--soft);
}

.tx-files__open > svg {
    flex: none;
    color: var(--gray);
}

.tx-files__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.tx-files__size {
    margin: 0 0 0 auto;
    flex: none;
    font-variant-numeric: tabular-nums;
}

.tx-files__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
}

.tx-files__input {
    display: none;
}

.tx-files__picker {
    position: relative;
}

.tx-files__menu {
    position: absolute;
    z-index: 4;
    top: calc(100% + 4px);
    left: 0;
    min-width: 260px;
    max-height: 220px;
    overflow: auto;
    padding: 8px;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: var(--raise);
    box-shadow: var(--shadow-offset);
}

.tx-files__option {
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

.tx-files__option + .tx-files__option {
    border-top: 1px solid var(--line);
}

.tx-files__option:hover,
.tx-files__option:focus-visible {
    background: var(--soft);
    outline: none;
}

.tx-files__option span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tx-files__option span:last-child {
    flex: none;
    color: var(--gray);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
}

.tx-files__max {
    flex: 1 1 100%;
    margin: 0;
}
</style>
