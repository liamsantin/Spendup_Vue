<script setup lang="ts">
defineOptions({ name: 'TransactionAttachments' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { displayFileName } from '@/features/files/file-name-display';
import { PaperclipIcon, XIcon } from 'vue-tabler-icons';
import AttachmentActions from '@/features/transactions/components/forms/AttachmentActions.vue';
import { fileSizeParts } from '@/features/files/format';
import type { FileDto } from '@/features/files/types';
import { TRANSACTION_FILES_MAX, type TransactionFile } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        files: TransactionFile[];
        library: FileDto[];
        canEdit: boolean;
        uploading?: boolean;
        acting?: boolean;
        /** Plafond de fichiers (5 sur une transaction, davantage sur un actif). */
        max?: number;
        /** Boutons posés ailleurs (barre en haut à droite d’un onglet, voir `AttachmentActions`). */
        hideActions?: boolean;
    }>(),
    {
        uploading: false,
        acting: false,
        max: TRANSACTION_FILES_MAX,
        hideActions: false
    }
);

const emit = defineEmits<{
    upload: [file: File];
    pick: [file: FileDto];
    detach: [file: TransactionFile];
    open: [file: TransactionFile];
}>();

const { t } = useI18n();

const busy = computed(() => props.uploading || props.acting);

function sizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}
</script>

<template>
    <section class="tx-files">
        <p class="tx-files__hint">{{ t('transactionsPage.form.attachments.hint', { max }) }}</p>

        <ul v-if="files.length" class="tx-files__list">
            <li v-for="file in files" :key="file.publicId" class="tx-files__chip">
                <button type="button" class="tx-files__open" :disabled="busy" @click="emit('open', file)">
                    <PaperclipIcon :size="16" stroke-width="1.6" />
                    <span class="tx-files__name">{{ displayFileName(file.publicId, file.nameOriginal, t('vault.unreadable')) }}</span>
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

        <AttachmentActions
            v-if="canEdit && !hideActions"
            class="tx-files__actions"
            :attached="files"
            :library="library"
            :uploading="uploading"
            :acting="acting"
            :max="max"
            @upload="emit('upload', $event)"
            @pick="emit('pick', $event)"
        />
    </section>
</template>

<style scoped>
/* Justificatifs : lignes à filet fin ; les boutons d’ajout vivent dans AttachmentActions. */
.tx-files {
    min-height: 0;
}

.tx-files__hint,
.tx-files__empty,
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
    margin-top: 16px;
}
</style>
