<script setup lang="ts">
/**
 * Zone scrollable d’un panel de AppModalTabs (PS desktop, scroll natif mobile).
 */
defineOptions({ name: 'AppModalPanelScroll' });

import { useDisplay } from 'vuetify';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { smAndDown } = useDisplay();
</script>

<template>
    <PerfectScrollbar v-if="!smAndDown" class="app-modal-panel-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
        <slot />
    </PerfectScrollbar>
    <div v-else class="app-modal-panel-scroll app-modal-panel-scroll--native">
        <slot />
    </div>
</template>

<style scoped>
.app-modal-panel-scroll {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

.app-modal-panel-scroll--native {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
</style>
