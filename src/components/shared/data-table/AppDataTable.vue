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
    <div class="app-data-table">
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
                            <button
                                v-if="column.sortable"
                                type="button"
                                class="app-data-table__label"
                                @click="toggleSort(column)"
                            >
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
    width: 92px;
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
</style>
