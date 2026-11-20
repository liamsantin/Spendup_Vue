<script setup lang="ts">
/**
 * Ligne de formulaire des modales immobilier (maquette 04) : libellé 170 px | champ, aide ou erreur dessous.
 */
defineOptions({ name: 'RealEstateFormRow' });

withDefaults(
    defineProps<{
        label: string;
        forId?: string;
        required?: boolean;
        hint?: string | null;
        error?: string | null;
    }>(),
    {
        forId: undefined,
        required: false,
        hint: null,
        error: null
    }
);
</script>

<template>
    <div class="re-form-row">
        <label class="re-form-row__label" :for="forId"> {{ label }}<span v-if="required" aria-hidden="true"> *</span> </label>
        <div class="re-form-row__field">
            <slot />
            <p v-if="error" class="re-form-row__error" role="alert">{{ error }}</p>
            <p v-else-if="hint" class="re-form-row__hint">{{ hint }}</p>
        </div>
    </div>
</template>

<style scoped>
.re-form-row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.re-form-row__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.re-form-row__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.re-form-row__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.re-form-row__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.re-form-row__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.re-form-row__hint,
.re-form-row__error {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--gray);
}

.re-form-row__error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .re-form-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
