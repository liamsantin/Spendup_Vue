<script setup lang="ts">
/**
 * Justificatifs portés par des transactions : un groupe par transaction (libellé + date), puis ses PDF.
 * Utilisé par la fiche d’une récurrence et par celle d’un actif.
 */
defineOptions({ name: 'LinkedTransactionFiles' });

import { useI18n } from 'vue-i18n';
import { PaperclipIcon } from 'vue-tabler-icons';
import { displayFileName } from '@/features/files/file-name-display';
import { fileSizeParts } from '@/features/files/format';
import { formatOperationDate } from '@/features/transactions/format';
import type { Transaction, TransactionFile } from '@/features/transactions/types';

defineProps<{
    groups: { transaction: Transaction; files: TransactionFile[] }[];
    loading?: boolean;
    emptyText: string;
}>();

const emit = defineEmits<{
    'open-transaction': [transaction: Transaction];
    'open-file': [file: TransactionFile];
}>();

const { t, locale } = useI18n();

function fileSizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}
</script>

<template>
    <div v-if="loading" class="su-loading"><span class="su-spin" /></div>
    <p v-else-if="!groups.length" class="tx-files__empty">{{ emptyText }}</p>
    <div v-else class="tx-files">
        <article v-for="group in groups" :key="group.transaction.publicId" class="tx-files__group">
            <button type="button" class="tx-files__tx" @click="emit('open-transaction', group.transaction)">
                <span class="tx-files__label">{{ group.transaction.label }}</span>
                <span class="tx-files__date">{{ formatOperationDate(group.transaction.operationDate, locale) }}</span>
            </button>
            <ul class="tx-files__list">
                <li v-for="file in group.files" :key="file.publicId" class="tx-files__item">
                    <button type="button" class="tx-files__open" @click="emit('open-file', file)">
                        <PaperclipIcon :size="16" stroke-width="1.6" />
                        <span class="tx-files__name">{{ displayFileName(file.publicId, file.nameOriginal, t('vault.unreadable')) }}</span>
                        <span class="tx-files__size">{{ fileSizeLabel(file.sizeBytes) }}</span>
                    </button>
                </li>
            </ul>
        </article>
    </div>
</template>

<style scoped>
.tx-files__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.tx-files {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.tx-files__group {
    min-width: 0;
}

/* libellé de la transaction : 700, cliquable pour ouvrir la transaction */
.tx-files__tx {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    min-width: 0;
    margin: 0 0 4px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.tx-files__tx:hover .tx-files__label {
    text-decoration: underline;
}

.tx-files__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.tx-files__date,
.tx-files__size {
    flex: none;
    color: var(--gray);
    font-size: 13px;
}

.tx-files__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.tx-files__item {
    display: flex;
    min-width: 0;
}

/* une ligne par PDF : trombone, nom, taille à droite, filet fin */
.tx-files__open {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    min-height: 40px;
    padding: 8px 0;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.tx-files__open:hover {
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
}

.tx-files__size {
    margin: 0 0 0 auto;
}
</style>
