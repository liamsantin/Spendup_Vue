<script setup lang="ts">
/**
 * Pictogramme à gauche du titre d’une fiche (slot `title-icon` d’`AppPageShell`) : carré teinté 44 px,
 * même pictogramme et même teinte que la ligne de la liste.
 */
defineOptions({ name: 'AppTitleTile' });

import type { Component } from 'vue';

withDefaults(
    defineProps<{
        icon: Component;
        /** Teinte du kit (`su-tile--…`) ; `gray` ou absent : carré gris par défaut. */
        tone?: 'blue' | 'violet' | 'amber' | 'teal' | 'rose' | 'green' | 'gray' | null;
    }>(),
    { tone: null }
);
</script>

<template>
    <span class="su-tile app-title-tile" :class="tone && tone !== 'gray' ? `su-tile--${tone}` : ''" aria-hidden="true">
        <component :is="icon" :size="22" stroke-width="1.7" />
    </span>
</template>

<style scoped>
/* un peu plus grand que dans une liste, à l’échelle du titre */
.app-title-tile {
    width: 44px;
    height: 44px;
}

.app-title-tile > svg {
    width: 22px;
    height: 22px;
}
</style>
