<script setup lang="ts">
/**
 * Tableau de liste : en-tête collé au défilement, deux flèches de tri par colonne.
 */
import { useDisplay } from 'vuetify';
import { ChevronDownIcon, ChevronUpIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

export type AppDataTableColumn = {
    key: string;
    label: string;
    sortable?: boolean;
    /** Largeur de colonne (`table-layout: fixed`), par exemple `18%` ou `160px`. */
    width?: string;
};

export type AppDataTableSort = {
    key: string;
    direction: 'asc' | 'desc';
};

const props = defineProps<{
    columns: AppDataTableColumn[];
    sortKey?: string | null;
    sortDirection?: 'asc' | 'desc' | null;
    sortAscLabel?: string;
    sortDescLabel?: string;
    /** Largeur de la colonne d’actions (`#head-end`), 92px par défaut. */
    endWidth?: string;
}>();

const emit = defineEmits<{
    sort: [value: AppDataTableSort];
}>();

function onSort(key: string, direction: 'asc' | 'desc') {
    emit('sort', { key, direction });
}

function toggleSort(column: AppDataTableColumn) {
    if (!column.sortable) return;
    const direction = props.sortKey === column.key && props.sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, direction);
}

const { smAndDown } = useDisplay();
</script>

<template>
    <div class="app-data-table" :style="endWidth ? { '--app-data-table-end': endWidth } : undefined">
        <table class="app-data-table__head">
            <colgroup>
                <col v-for="column in columns" :key="column.key" :style="{ width: column.width }" />
                <col v-if="$slots['head-end']" class="app-data-table__end-col" />
            </colgroup>
            <thead>
                <tr>
                    <th v-for="column in columns" :key="column.key" :class="{ 'is-sortable': column.sortable }">
                        <span class="app-data-table__head-cell">
                            <span v-if="column.sortable" class="app-data-table__arrows">
                                <button
                                    type="button"
                                    class="app-data-table__arrow"
                                    :class="{ 'is-active': sortKey === column.key && sortDirection === 'asc' }"
                                    :aria-label="`${column.label}, ${sortAscLabel || 'asc'}`"
                                    :aria-pressed="sortKey === column.key && sortDirection === 'asc'"
                                    @click="onSort(column.key, 'asc')"
                                >
                                    <ChevronUpIcon :size="10" stroke-width="2.4" />
                                </button>
                                <button
                                    type="button"
                                    class="app-data-table__arrow"
                                    :class="{ 'is-active': sortKey === column.key && sortDirection === 'desc' }"
                                    :aria-label="`${column.label}, ${sortDescLabel || 'desc'}`"
                                    :aria-pressed="sortKey === column.key && sortDirection === 'desc'"
                                    @click="onSort(column.key, 'desc')"
                                >
                                    <ChevronDownIcon :size="10" stroke-width="2.4" />
                                </button>
                            </span>
                            <button v-if="column.sortable" type="button" class="app-data-table__label" @click="toggleSort(column)">
                                {{ column.label }}
                            </button>
                            <span v-else class="app-data-table__label">{{ column.label }}</span>
                        </span>
                    </th>
                    <th v-if="$slots['head-end']" class="app-data-table__end">
                        <slot name="head-end" />
                    </th>
                </tr>
            </thead>
        </table>
        <PerfectScrollbar v-if="!smAndDown" class="app-data-table__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
            <table class="app-data-table__rows">
                <colgroup>
                    <col v-for="column in columns" :key="column.key" :style="{ width: column.width }" />
                    <col v-if="$slots['head-end']" class="app-data-table__end-col" />
                </colgroup>
                <tbody>
                    <slot />
                </tbody>
            </table>
        </PerfectScrollbar>
        <div v-else class="app-data-table__scroll app-data-table__scroll--native">
            <table class="app-data-table__rows">
                <colgroup>
                    <col v-for="column in columns" :key="column.key" :style="{ width: column.width }" />
                    <col v-if="$slots['head-end']" class="app-data-table__end-col" />
                </colgroup>
                <tbody>
                    <slot />
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.app-data-table {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    height: 100%;
}

.app-data-table__head {
    flex: none;
    margin-bottom: 6px;
    border-bottom: 1px dashed rgba(16, 16, 20, 0.16);
}

.app-data-table table.app-data-table__head {
    width: calc(100% - 14px);
    border-spacing: 0;
}

.app-data-table__scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    padding-right: 14px;
    overflow: hidden;
}

.app-data-table__scroll--native {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.app-data-table table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0 4px;
    text-align: left;
}

.app-data-table th {
    padding: 18px 16px 16px;
    background: transparent;
    font-size: 0.8rem;
    font-weight: 500;
    color: #8a8172;
    white-space: nowrap;
}

.app-data-table__label {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
}

button.app-data-table__label {
    cursor: pointer;
}

button.app-data-table__label:hover {
    color: var(--ink);
}

.app-data-table th:first-child {
    padding-left: 18px;
}

.app-data-table__end,
.app-data-table__end-col {
    width: var(--app-data-table-end, 92px);
}

.app-data-table :deep(td:not(:last-child)) {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 0;
}

.app-data-table__head-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.app-data-table__arrows {
    display: inline-flex;
    flex-direction: column;
    gap: 0;
    margin-top: -1px;
}

.app-data-table__arrow {
    appearance: none;
    display: grid;
    place-items: center;
    width: 12px;
    height: 7px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(16, 16, 20, 0.28);
    cursor: pointer;
    line-height: 0;
}

.app-data-table__arrow.is-active {
    color: var(--ink);
}

.app-data-table__arrow:hover {
    color: var(--ink-soft);
}

/* Lignes : classes partagées par les `<tr>` passés en slot. `--tint` colore avatar et pastille. */
.app-data-table :deep(.app-data-table__row) {
    --row: transparent;
    --tint: rgb(var(--v-theme-primary));
}

.app-data-table :deep(.app-data-table__row > td) {
    height: 58px;
    padding: 10px 16px;
    background: var(--row);
    vertical-align: middle;
    font-size: 0.86rem;
    color: var(--ink);
    white-space: nowrap;
    transition: background 0.22s var(--ease, ease);
}

.app-data-table :deep(.app-data-table__row > td:first-child) {
    border-radius: 16px 0 0 16px;
    padding-left: 18px;
}

.app-data-table :deep(.app-data-table__row > td:last-child) {
    border-radius: 0 16px 16px 0;
    padding-right: 12px;
}

.app-data-table :deep(.app-data-table__row > td.app-data-table__actions-cell) {
    padding-left: 4px;
}

@media (hover: hover) and (pointer: fine) {
    .app-data-table :deep(.app-data-table__row:hover) {
        --row: rgba(16, 16, 20, 0.055);
        cursor: pointer;
    }
}

.app-data-table :deep(.app-data-table__row.is-muted > td:not(.app-data-table__actions-cell)) {
    opacity: 0.6;
}

.app-data-table :deep(.app-data-table__name) {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.app-data-table :deep(.app-data-table__avatar) {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: var(--tint);
}

.app-data-table :deep(.app-data-table__identity) {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
}

.app-data-table :deep(.app-data-table__title) {
    font-size: 0.88rem;
    font-weight: 560;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__muted) {
    color: #8a8172;
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__strong) {
    font-weight: 650;
    letter-spacing: -0.01em;
}

.app-data-table :deep(.app-data-table__pill) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 28px;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 600;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: var(--tint);
}

.app-data-table :deep(.app-data-table__pill::before) {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.app-data-table :deep(.app-data-table__pill-label) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__actions) {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.18s var(--ease, ease);
}

.app-data-table :deep(.app-data-table__row:hover .app-data-table__actions),
.app-data-table :deep(.app-data-table__row:focus-within .app-data-table__actions) {
    opacity: 1;
}
</style>
