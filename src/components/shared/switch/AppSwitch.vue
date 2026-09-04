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
    <v-switch v-model="model" :inset="inset" :color="color" :hide-details="hideDetails" :density="density" v-bind="$attrs">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-switch>
</template>
