<script setup lang="ts">
import ImportLineRecurringDueMenu from '@/features/imports/components/list/ImportLineRecurringDueMenu.vue';
import type { ImportLineBadge } from '@/features/imports/composables/useImportLineDisplay';
import type { ImportLine } from '@/features/imports/types';

defineProps<{
    badges: ImportLineBadge[];
    wrap?: boolean;
    /** Pastille d’échéance interactive (Changer / Détacher) quand la ligne est éditable. */
    line?: ImportLine;
    currency?: string | null;
    editable?: boolean;
}>();
</script>

<template>
    <span v-if="badges.length" class="import-line-badges" :class="{ 'is-wrap': wrap }">
        <template v-for="badge in badges" :key="badge.key">
            <ImportLineRecurringDueMenu
                v-if="badge.key === 'recurringDue' && line?.recurringDue"
                :line="{ ...line, recurringDue: line.recurringDue }"
                :label="badge.label"
                :currency="currency"
                :editable="editable"
            />
            <span v-else class="import-line-badge" :class="`is-${badge.tone}`" :title="badge.label">
                {{ badge.label }}
            </span>
        </template>
    </span>
</template>

<style scoped>
.import-line-badges {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
}

.import-line-badges.is-wrap {
    flex-wrap: wrap;
}

.import-line-badge {
    --tint: var(--ink-muted);
    flex: none;
    max-width: 220px;
    padding: 1px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tint) 12%, transparent);
    color: var(--tint);
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-line-badge.is-warning {
    --tint: rgb(var(--v-theme-warning));
}

.import-line-badge.is-error {
    --tint: rgb(var(--v-theme-error));
}

.import-line-badge.is-success {
    --tint: rgb(var(--v-theme-success));
}

.import-line-badge.is-info {
    --tint: rgb(var(--v-theme-primary));
}
</style>
