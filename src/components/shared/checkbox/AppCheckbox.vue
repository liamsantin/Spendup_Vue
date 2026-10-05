<script setup lang="ts">
/**
 * Case à cocher Spend.Up : carré arrondi, coche blanche, couleur primaire.
 * Autres props / attrs / slots de `v-checkbox` passent tels quels.
 */
defineOptions({ name: 'AppCheckbox', inheritAttrs: false });

withDefaults(
    defineProps<{
        color?: string;
        hideDetails?: boolean | 'auto';
        density?: 'default' | 'comfortable' | 'compact';
        disabled?: boolean;
        indeterminate?: boolean;
    }>(),
    {
        color: 'primary',
        hideDetails: true,
        density: 'default',
        disabled: false,
        indeterminate: false
    }
);

const model = defineModel<boolean | null>({ default: false });
</script>

<template>
    <v-checkbox
        class="app-checkbox"
        v-model="model"
        :color="color"
        :hide-details="hideDetails"
        :density="density"
        :disabled="disabled"
        :indeterminate="indeterminate"
        false-icon="svg:M0,0Z"
        true-icon="$complete"
        indeterminate-icon="$minus"
        v-bind="$attrs"
    >
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-checkbox>
</template>

<style scoped>
.app-checkbox {
    --v-input-control-height: 32px;
    --app-checkbox-size: 18px;
    --app-checkbox-radius: 6px;
}

.app-checkbox :deep(.v-selection-control) {
    min-height: 32px;
    align-items: center;
    overflow: visible;
}

.app-checkbox :deep(.v-selection-control__wrapper) {
    overflow: visible;
}

.app-checkbox :deep(.v-selection-control--density-default),
.app-checkbox :deep(.v-selection-control--density-comfortable),
.app-checkbox :deep(.v-selection-control--density-compact) {
    --v-selection-control-size: 22px;
}

.app-checkbox :deep(.v-selection-control__input) {
    width: var(--app-checkbox-size);
    height: var(--app-checkbox-size);
    border-radius: var(--app-checkbox-radius);
    border: 1.5px solid var(--thread);
    background: var(--surface-raised);
    color: #fff;
    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}

.app-checkbox :deep(.v-selection-control__input::before) {
    border-radius: var(--app-checkbox-radius);
}

.app-checkbox :deep(.v-selection-control--dirty .v-selection-control__input),
.app-checkbox :deep(.v-selection-control--indeterminate .v-selection-control__input) {
    background: rgb(var(--v-theme-primary));
    border-color: rgb(var(--v-theme-primary));
}

.app-checkbox :deep(.v-selection-control__input .v-icon) {
    font-size: 14px;
    opacity: 0;
    color: #fff !important;
}

.app-checkbox :deep(.v-selection-control--dirty .v-icon),
.app-checkbox :deep(.v-selection-control--indeterminate .v-icon) {
    opacity: 1;
}

.app-checkbox :deep(.v-selection-control .v-label) {
    height: auto;
    margin: 0 !important;
    align-self: center;
    line-height: 1.25;
    padding-inline-start: 14px;
}
</style>
