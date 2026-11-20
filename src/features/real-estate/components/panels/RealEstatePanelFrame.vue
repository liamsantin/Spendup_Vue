<script setup lang="ts">
/**
 * Cadre d’un panneau de sous-liste : ligne de tête (compteur gris, filtres, Ajouter), alerte, chargement / vide, tableau.
 */
defineOptions({ name: 'RealEstatePanelFrame' });

import { useI18n } from 'vue-i18n';
import { PlusIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

withDefaults(
    defineProps<{
        countLabel?: string | null;
        addLabel: string;
        loading?: boolean;
        empty?: boolean;
        emptyText: string;
        error?: string | null;
        disabled?: boolean;
    }>(),
    {
        countLabel: null,
        loading: false,
        empty: false,
        error: null,
        disabled: false
    }
);

const emit = defineEmits<{
    add: [];
    dismiss: [];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="re-panel">
        <div class="re-panel__head">
            <p class="re-panel__count">{{ countLabel }}</p>
            <div class="re-panel__actions">
                <slot name="filters" />
                <button type="button" class="su-btn su-btn--ink" :disabled="disabled" @click="emit('add')">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ addLabel }}
                </button>
            </div>
        </div>

        <AppAlert v-if="error" type="error" class="su-alert re-panel__alert" closable @dismiss="emit('dismiss')">
            {{ error }}
        </AppAlert>

        <div v-if="loading && empty" class="su-loading" :aria-label="t('realEstatePage.loading')">
            <span class="su-spin" />
        </div>
        <div v-else-if="empty" class="su-empty">
            <p>{{ emptyText }}</p>
        </div>
        <div v-else class="su-table-wrap re-panel__table">
            <slot />
        </div>
        <slot name="footer" />
    </section>
</template>

<style scoped>
.re-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.re-panel__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.re-panel__count {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.re-panel__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

.re-panel__alert {
    margin: 0;
}

/* tableau éditorial : filets fins, nom 700, actions alignées à droite */
.re-panel__table :deep(.su-table td.is-strong) {
    font-weight: 700;
}

.re-panel__table :deep(.su-table .is-muted) {
    color: var(--gray);
}

.re-panel__table :deep(.su-table .is-sub) {
    display: block;
    margin-top: 2px;
    color: var(--gray);
    font-size: 13px;
    font-weight: 400;
}

.re-panel__table :deep(.su-table td.is-actions) {
    width: 48px;
    padding-top: 4px;
    padding-bottom: 4px;
    text-align: right;
}

.re-panel__table :deep(.su-table td),
.re-panel__table :deep(.su-table th) {
    white-space: nowrap;
}

.re-panel__table :deep(.su-table td.is-wrap) {
    white-space: normal;
    min-width: 180px;
}

@media (max-width: 767px) {
    .re-panel__table {
        overflow-x: auto;
    }
}
</style>
