<script setup lang="ts">
/**
 * Ligne de formulaire de fenêtre modale (maquette 04) : libellé à gauche sur 170 px | champ carré,
 * puis message d’erreur (champs sans `error-messages` natif) et aide grise.
 */
defineOptions({ name: 'AssetFormRow' });

withDefaults(
    defineProps<{
        label: string;
        forId?: string;
        required?: boolean;
        hint?: string | null;
        /** Pour les champs qui n’affichent pas eux-mêmes l’erreur (date, sélecteur de tier, interrupteur). */
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
    <div class="asset-form-row">
        <label class="asset-form-row__label" :for="forId"> {{ label }}<template v-if="required"> *</template> </label>
        <div class="asset-form-row__field">
            <slot />
            <p v-if="error" class="asset-form-row__error">{{ error }}</p>
            <p v-if="hint" class="asset-form-row__hint">{{ hint }}</p>
        </div>
    </div>
</template>

<style scoped>
.asset-form-row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.asset-form-row__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.asset-form-row__field {
    min-width: 0;
}

/* champ texte Vuetify : 42 px, carré (bordure et focus gérés par le kit) */
.asset-form-row__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.asset-form-row__field :deep(.v-input--density-default .v-field--variant-outlined) {
    --v-input-control-height: 42px;
}

.asset-form-row__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.asset-form-row__hint,
.asset-form-row__error {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.35;
}

.asset-form-row__hint {
    color: var(--gray);
}

.asset-form-row__error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .asset-form-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
