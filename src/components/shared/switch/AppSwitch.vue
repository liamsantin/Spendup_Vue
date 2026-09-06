<script setup lang="ts">
/**
 * Wrapper autour de `v-switch` (Vuetify).
 * Piste verre, curseur blanc, couleur active = primaire du thème.
 * Autres props / attrs / slots de `v-switch` passent tels quels.
 */
defineOptions({ name: 'AppSwitch', inheritAttrs: false });

withDefaults(
    defineProps<{
        /** Piste arrondie enveloppant le curseur. */
        inset?: boolean;
        /** Couleur Vuetify appliquée à l’état actif. */
        color?: string;
        /** Visibilité de la zone de détails / validation. */
        hideDetails?: boolean | 'auto';
        /** Densité Vuetify — `default` requis pour le style du thème. */
        density?: 'default' | 'comfortable' | 'compact';
    }>(),
    {
        inset: true,
        color: 'primary',
        hideDetails: true,
        density: 'default'
    }
);

const model = defineModel<boolean>({ default: false });
</script>

<template>
    <v-switch class="app-switch" v-model="model" :inset="inset" :color="color" :hide-details="hideDetails" :density="density" v-bind="$attrs">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-switch>
</template>

<style scoped>
.app-switch {
    --v-input-control-height: 32px;
}

.app-switch :deep(.v-selection-control) {
    min-height: 32px;
    align-items: center;
}

.app-switch :deep(.v-selection-control .v-label) {
    height: auto;
    margin: 0 !important;
    align-self: center;
    line-height: 1.25;
    padding-inline-start: 14px;
}

.app-switch.v-switch--inset :deep(.v-switch__track) {
    height: 28px;
    min-width: 48px;
}

.app-switch.v-switch--inset :deep(.v-switch__thumb) {
    height: 22px;
    width: 22px;
}

.app-switch.v-switch--inset :deep(.v-selection-control--dirty .v-switch__thumb) {
    transform: scale(0.78);
}
</style>
