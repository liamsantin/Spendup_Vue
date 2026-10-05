<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileSpreadsheetIcon, FileTextIcon, TrashIcon } from 'vue-tabler-icons';
import { formatOperationDate } from '@/features/transactions/format';
import { canDeleteImport, formatImportTimestamp, isImportOpen } from '@/features/imports/format';
import ImportStatusChip from '@/features/imports/components/list/ImportStatusChip.vue';
import type { Import } from '@/features/imports/types';

const props = defineProps<{
    item: Import;
    acting?: boolean;
}>();

const emit = defineEmits<{
    open: [item: Import];
    delete: [item: Import];
}>();

const { t, locale } = useI18n();

const accountLabel = computed(() => props.item.accountName ?? t('importsPage.list.deletedAccount'));

const periodLabel = computed(() => {
    const { periodFrom, periodTo } = props.item;
    if (!periodFrom || !periodTo) return null;
    if (periodFrom === periodTo) return formatOperationDate(periodFrom, locale.value);
    return t('importsPage.list.period', {
        from: formatOperationDate(periodFrom, locale.value),
        to: formatOperationDate(periodTo, locale.value)
    });
});

const summary = computed(() => {
    const { counts, status } = props.item;
    if (status === 'erreur') return t('importsPage.list.needsMapping');
    if (status === 'valide') return t('importsPage.list.imported', { count: counts.validated }, counts.validated);
    if (status === 'annule') return t('importsPage.list.lines', { count: counts.total }, counts.total);
    const pending = counts.toReview + counts.errors;
    if (pending) return t('importsPage.list.pending', { count: pending }, pending);
    return t('importsPage.list.ready', { count: counts.validated }, counts.validated);
});

const expiresLabel = computed(() => {
    if (!isImportOpen(props.item) || !props.item.expiresAt) return null;
    return t('importsPage.list.expires', { date: formatImportTimestamp(props.item.expiresAt, locale.value) });
});

function onActivate(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.item);
}
</script>

<template>
    <div
        class="import-row"
        role="link"
        tabindex="0"
        :data-import-id="item.publicId"
        @click="onActivate"
        @keydown.enter.self="emit('open', item)"
    >
        <span class="import-row__icon" :class="`is-${item.sourceType}`">
            <FileSpreadsheetIcon v-if="item.sourceType === 'excel'" :size="18" stroke-width="1.7" />
            <FileTextIcon v-else :size="18" stroke-width="1.7" />
        </span>
        <div class="import-row__meta">
            <p class="import-row__name">{{ item.fileName }}</p>
            <p class="import-row__sub">
                <span>{{ accountLabel }}</span>
                <span v-if="periodLabel"> · {{ periodLabel }}</span>
                <span> · {{ formatImportTimestamp(item.createdAt, locale) }}</span>
            </p>
            <p class="import-row__summary">
                {{ summary }}
                <span v-if="expiresLabel" class="import-row__expires"> · {{ expiresLabel }}</span>
            </p>
        </div>
        <ImportStatusChip class="import-row__status" :status="item.status" kind="import" />
        <div class="import-row__actions">
            <button
                v-if="canDeleteImport(item)"
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('importsPage.actions.delete')"
                @click.stop="emit('delete', item)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.import-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-width: 0;
    min-height: 64px;
    padding: 10px 12px;
    box-sizing: border-box;
    border-radius: 14px;
    color: inherit;
    cursor: pointer;
    transition: background 0.2s ease;
}

.import-row:hover,
.import-row:focus-visible {
    background: var(--surface-hover-soft);
    outline: none;
}

.import-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.import-row__icon.is-excel {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.import-row__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.import-row__name,
.import-row__sub,
.import-row__summary {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.import-row__name {
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
}

.import-row__sub {
    margin-top: 2px;
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.import-row__summary {
    margin-top: 2px;
    font-size: 0.78rem;
    color: var(--ink-soft);
}

.import-row__expires {
    color: var(--ink-muted);
}

.import-row__status {
    flex: none;
}

.import-row__actions {
    display: flex;
    flex: none;
    justify-content: flex-end;
    width: 36px;
}

@media (max-width: 767px) {
    .import-row {
        flex-wrap: wrap;
        gap: 8px 10px;
    }

    .import-row__meta {
        flex-basis: calc(100% - 100px);
    }

    .import-row__status {
        margin-left: 48px;
    }
}
</style>
