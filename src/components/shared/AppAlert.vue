<script setup lang="ts">
/**
 * Wrapper fin autour de `v-alert` (Vuetify).
 * Toutes les variantes Modernize (`tonal`, `outlined`, filled/`type`, `closable`,
 * `border`, slots `prepend` / `append`, `title`…) restent disponibles via props / attrs / slots.
 */
defineOptions({ name: 'AppAlert' });

withDefaults(
    defineProps<{
        /** Densité Vuetify — compact par défaut (formulaires auth, feedback court). */
        density?: 'default' | 'comfortable' | 'compact';
    }>(),
    { density: 'compact' }
);
</script>

<template>
    <v-alert :density="density">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-alert>
</template>
