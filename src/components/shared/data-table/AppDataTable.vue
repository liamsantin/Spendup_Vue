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
    /** `right` pour une colonne de chiffres : l'en-tête s'aligne sur ses cellules. */
    align?: 'left' | 'right';
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
                    <th
                        v-for="column in columns"
                        :key="column.key"
                        :class="{ 'is-sortable': column.sortable, 'is-right': column.align === 'right' }"
                    >
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
/* Tableau Swiss : en-tête 12.5 px gris sur filet 2 px noir, lignes à filet fin, chiffres à droite, survol gris. */
.app-data-table {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    height: 100%;
    font-variant-numeric: tabular-nums;
}

.app-data-table__head {
    flex: none;
    margin-bottom: 0;
    border-bottom: 1px solid var(--line);
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
    border-collapse: collapse;
    border-spacing: 0;
    text-align: left;
}

.app-data-table th {
    padding: 0 8px 10px;
    background: transparent;
    font-size: 12.5px;
    font-weight: 400;
    color: var(--gray);
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
    padding-left: 0;
}

.app-data-table th.is-right {
    text-align: right;
}

.app-data-table th.is-right .app-data-table__head-cell {
    flex-direction: row-reverse;
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
    color: var(--line);
    cursor: pointer;
    line-height: 0;
}

.app-data-table__arrow.is-active {
    color: var(--ink);
}

.app-data-table__arrow:hover {
    color: var(--gray);
}

/* Lignes : classes partagées par les `<tr>` passés en slot. `--tint` colore l'icône et le carré. */
.app-data-table :deep(.app-data-table__row) {
    --row: transparent;
    --tint: var(--blue);
}

.app-data-table :deep(.app-data-table__row > td) {
    height: 56px;
    padding: 12px 8px;
    border-bottom: 1px solid var(--line);
    background: var(--row);
    vertical-align: middle;
    font-size: 14px;
    color: var(--ink);
    white-space: nowrap;
    transition: background 0.15s var(--ease, ease);
}

.app-data-table :deep(.app-data-table__row > td:first-child) {
    border-radius: 0;
    padding-left: 0;
}

.app-data-table :deep(.app-data-table__row > td:last-child) {
    border-radius: 0;
    padding-right: 0;
}

.app-data-table :deep(.app-data-table__row > td.app-data-table__actions-cell) {
    padding-left: 4px;
}

@media (hover: hover) and (pointer: fine) {
    .app-data-table :deep(.app-data-table__row:hover) {
        --row: var(--soft);
        cursor: pointer;
    }
}

.app-data-table :deep(.app-data-table__row.is-muted > td:not(.app-data-table__actions-cell)) {
    opacity: 0.6;
}

.app-data-table :deep(.app-data-table__name) {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

/* pictogramme dans un carré 36 px teinté */
.app-data-table :deep(.app-data-table__avatar) {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 0;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: color-mix(in srgb, var(--tint) 72%, var(--ink));
}

.app-data-table :deep(.app-data-table__identity) {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
}

.app-data-table :deep(.app-data-table__title) {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.006em;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__muted) {
    color: var(--gray);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__strong) {
    font-weight: 700;
    letter-spacing: -0.006em;
}

.app-data-table :deep(.app-data-table__num) {
    text-align: right;
    font-variant-numeric: tabular-nums;
}

/* catégorie / type : petit carré de couleur + nom en gris (pas de pilule) */
.app-data-table :deep(.app-data-table__pill) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    height: auto;
    padding: 0;
    border-radius: 0;
    font-size: 14px;
    font-weight: 400;
    background: transparent;
    color: var(--gray);
}

.app-data-table :deep(.app-data-table__pill::before) {
    content: '';
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 0;
    background: var(--tint);
}

.app-data-table :deep(.app-data-table__pill-label) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-data-table :deep(.app-data-table__actions) {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s var(--ease, ease);
}

.app-data-table :deep(.app-data-table__row:hover .app-data-table__actions),
.app-data-table :deep(.app-data-table__row:focus-within .app-data-table__actions) {
    opacity: 1;
}
</style>
