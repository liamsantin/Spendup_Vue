<script setup lang="ts">
/**
 * Bouton tonal + menu de filtres (ne se ferme pas au clic dans le contenu).
 * Le slot reçoit les lignes de filtre (`v-list-item`, `AppSwitch`, etc.).
 */
defineOptions({ name: 'AppDropdownFilter' });

import { computed } from 'vue';
import { AdjustmentsHorizontalIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        /** Libellé du bouton déclencheur. */
        label: string;
        /** Icône vue-tabler à gauche du libellé. */
        icon?: unknown;
        location?: string;
        minWidth?: number | string;
    }>(),
    {
        icon: undefined,
        location: 'bottom end',
        minWidth: 260
    }
);

const resolvedIcon = computed(() => props.icon ?? AdjustmentsHorizontalIcon);
</script>

<template>
    <v-menu :location="location" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
            <v-btn color="primary" variant="tonal" flat v-bind="menuProps">
                <component :is="resolvedIcon" size="18" class="mr-1" />
                {{ label }}
            </v-btn>
        </template>
        <v-list density="compact" :min-width="minWidth" class="py-1">
            <slot />
        </v-list>
    </v-menu>
</template>
