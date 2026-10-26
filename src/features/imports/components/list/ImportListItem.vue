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
    <!-- Ligne su-person : pictogramme dans un carré 36 px teinté, nom 700, sous-lignes grises, statut en carré + texte. -->
    <div
        class="su-person import-row"
        role="link"
        tabindex="0"
        :data-import-id="item.publicId"
        @click="onActivate"
        @keydown.enter.self="emit('open', item)"
    >
        <span class="su-person__avatar su-person__avatar--tile" :class="item.sourceType === 'excel' ? 'su-tile--green' : 'su-tile--blue'">
            <FileSpreadsheetIcon v-if="item.sourceType === 'excel'" :size="18" stroke-width="1.7" />
            <FileTextIcon v-else :size="18" stroke-width="1.7" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">{{ item.fileName }}</p>
            <p class="su-person__sub">
                <span>{{ accountLabel }}</span>
                <span v-if="periodLabel"> · {{ periodLabel }}</span>
                <span> · {{ formatImportTimestamp(item.createdAt, locale) }}</span>
            </p>
            <p class="su-person__sub">
                {{ summary }}
                <span v-if="expiresLabel"> · {{ expiresLabel }}</span>
            </p>
        </div>
        <ImportStatusChip class="import-row__status" :status="item.status" kind="import" />
        <div class="su-person__actions import-row__actions">
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
.import-row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.import-row__status {
    flex: none;
}

.import-row__actions {
    width: 40px;
}

@media (max-width: 767px) {
    .import-row {
        flex-wrap: wrap;
        gap: 8px 14px;
    }

    .import-row .su-person__meta {
        flex-basis: calc(100% - 104px);
    }

    .import-row__status {
        margin-left: 50px;
    }
}
</style>
