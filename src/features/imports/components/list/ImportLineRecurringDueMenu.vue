<script setup lang="ts">
/**
 * Pastille « Loyer du 01.07 » d’une ligne rapprochée, avec menu Changer / Détacher.
 * Candidates chargées à l’ouverture (`GET …/recurring-dues`) ; l’échéance actuelle reste en tête.
 * Les erreurs du PATCH remontent par `store.error` (bandeau de la revue).
 */
defineOptions({ name: 'ImportLineRecurringDueMenu' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, UnlinkIcon } from 'vue-tabler-icons';
import { importsApi } from '@/features/imports/api';
import { formatImportAmount } from '@/features/imports/format';
import { recurringDueKey } from '@/features/imports/payload';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import type { ImportLine, ImportLineRecurringDue } from '@/features/imports/types';
import { formatOperationDate } from '@/features/transactions/format';

const props = defineProps<{
    line: ImportLine & { recurringDue: ImportLineRecurringDue };
    label: string;
    currency?: string | null;
    editable?: boolean;
}>();

const { t, locale } = useI18n();
const store = useImportsStore();

const open = ref(false);
const loading = ref(false);
const candidates = ref<ImportLineRecurringDue[]>([]);

const currentKey = computed(() => recurringDueKey(props.line.recurringDue));

/** L’API n’inclut pas forcément l’échéance actuelle : on l’ajoute en tête. */
const options = computed(() => {
    const list = [props.line.recurringDue];
    for (const due of candidates.value) {
        if (!list.some((item) => recurringDueKey(item) === recurringDueKey(due))) list.push(due);
    }
    return list;
});

function dueDate(due: ImportLineRecurringDue) {
    return formatOperationDate(due.scheduledAt, locale.value);
}

function dueAmount(due: ImportLineRecurringDue) {
    return formatImportAmount(due.plannedAmount, props.line.currency || props.currency, locale.value);
}

async function loadCandidates() {
    const importPublicId = store.current?.publicId;
    if (!importPublicId) return;
    loading.value = true;
    try {
        candidates.value = await importsApi.listLineRecurringDues(importPublicId, props.line.publicId);
    } catch {
        // Liste indicative : sans elle, seules l’échéance actuelle et « Détacher » restent proposées.
        candidates.value = [];
    } finally {
        loading.value = false;
    }
}

function onToggle(value: boolean) {
    open.value = value;
    if (value) void loadCandidates();
}

async function apply(due: ImportLineRecurringDue | null) {
    open.value = false;
    if (due && recurringDueKey(due) === currentKey.value) return;
    try {
        await store.updateLine(props.line.publicId, {
            recurringDue: due ? { recurringPublicId: due.recurringPublicId, scheduledAt: due.scheduledAt } : null
        });
    } catch {
        // Message déjà exposé par `store.error`.
    }
}
</script>

<template>
    <v-menu v-if="editable" :model-value="open" location="bottom start" :offset="6" @update:model-value="onToggle">
        <template #activator="{ props: menuProps }">
            <button
                type="button"
                class="su-chip import-line-badge import-due-pill"
                v-bind="menuProps"
                :disabled="store.acting"
                :title="t('importsPage.lines.dueMenu.title', { label })"
                :aria-label="t('importsPage.lines.dueMenu.title', { label })"
                @click.stop
                @dblclick.stop
            >
                {{ label }}
            </button>
        </template>
        <v-sheet width="300" elevation="0" class="su-menu import-due-menu" @click.stop>
            <p class="import-due-menu__title">{{ t('importsPage.lines.dueMenu.change') }}</p>
            <ul class="import-due-menu__list">
                <li v-for="due in options" :key="recurringDueKey(due)">
                    <button
                        type="button"
                        class="import-due-menu__item"
                        :class="{ 'is-current': recurringDueKey(due) === currentKey }"
                        @click="apply(due)"
                    >
                        <span class="import-due-menu__main">
                            <span class="import-due-menu__name">{{ due.name }}</span>
                            <span class="import-due-menu__meta">{{ dueDate(due) }} · {{ dueAmount(due) }}</span>
                        </span>
                        <CheckIcon v-if="recurringDueKey(due) === currentKey" :size="16" stroke-width="1.8" />
                    </button>
                </li>
            </ul>
            <p v-if="loading" class="import-due-menu__hint"><span class="su-spin" /> {{ t('importsPage.lines.dueMenu.loading') }}</p>
            <p v-else-if="options.length === 1" class="import-due-menu__hint">{{ t('importsPage.lines.dueMenu.noOther') }}</p>
            <div class="import-due-menu__sep" />
            <button type="button" class="import-due-menu__item is-danger" @click="apply(null)">
                <UnlinkIcon :size="16" stroke-width="1.7" />
                <span class="import-due-menu__name">{{ t('importsPage.lines.dueMenu.detach') }}</span>
            </button>
        </v-sheet>
    </v-menu>
    <span v-else class="su-chip import-line-badge" :title="label">{{ label }}</span>
</template>

<style scoped>
/* Pastille d'échéance : carré bleu + texte gris ; menu carré, items 700, « Détacher » en rouge. */
.import-line-badge {
    --chip-color: var(--blue);
    flex: none;
    max-width: 220px;
    height: 20px;
    padding: 0;
    border: 0;
    font: inherit;
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-due-pill {
    cursor: pointer;
}

.import-due-pill:hover:not(:disabled),
.import-due-pill:focus-visible,
.import-due-pill[aria-expanded='true'] {
    color: var(--ink);
    text-decoration: underline;
    outline: none;
}

.import-due-menu.su-menu {
    padding: 8px !important;
}

.import-due-menu__title {
    margin: 4px 10px 6px;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--gray);
}

.import-due-menu__list {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 280px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
}

.import-due-menu__item {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border: 0;
    border-radius: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.import-due-menu__item:hover,
.import-due-menu__item:focus-visible {
    background: var(--soft);
    outline: none;
}

.import-due-menu__item.is-current {
    color: var(--blue-ink);
}

.import-due-menu__item.is-danger {
    justify-content: flex-start;
    color: var(--danger);
}

.import-due-menu__main {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.import-due-menu__name {
    overflow: hidden;
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-due-menu__meta {
    font-size: 13px;
    color: var(--gray);
    font-variant-numeric: tabular-nums;
}

.import-due-menu__hint {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 4px 10px;
    font-size: 13px;
    color: var(--gray);
}

.import-due-menu__sep {
    height: 1px;
    margin: 6px 0;
    background: var(--line);
}
</style>
