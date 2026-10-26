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
            <span v-else class="su-chip import-line-badge" :class="`is-${badge.tone}`" :title="badge.label">
                <span class="import-line-badge__label">{{ badge.label }}</span>
            </span>
        </template>
    </span>
</template>

<style scoped>
/* Indicateurs de ligne : petit carré de couleur + texte gris 12.5 px (pas de pilule). */
.import-line-badges {
    display: flex;
    gap: 14px;
    min-width: 0;
    overflow: hidden;
}

.import-line-badges.is-wrap {
    flex-wrap: wrap;
    gap: 4px 14px;
}

.import-line-badge {
    --chip-color: var(--gray);
    flex: none;
    max-width: 220px;
    height: 20px;
    font-size: 12.5px;
}

.import-line-badge__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.import-line-badge.is-warning {
    --chip-color: var(--violet);
}

.import-line-badge.is-error {
    --chip-color: var(--danger);
}

.import-line-badge.is-success,
.import-line-badge.is-info {
    --chip-color: var(--blue);
}
</style>
