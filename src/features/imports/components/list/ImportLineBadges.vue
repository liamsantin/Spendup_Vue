<script setup lang="ts">
import type { ImportLineBadge } from '@/features/imports/composables/useImportLineDisplay';

defineProps<{
    badges: ImportLineBadge[];
    wrap?: boolean;
}>();
</script>

<template>
    <span v-if="badges.length" class="import-line-badges" :class="{ 'is-wrap': wrap }">
        <span v-for="badge in badges" :key="badge.key" class="import-line-badge" :class="`is-${badge.tone}`" :title="badge.label">
            {{ badge.label }}
        </span>
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

.import-line-badge.is-info {
    --tint: rgb(var(--v-theme-primary));
}
</style>
