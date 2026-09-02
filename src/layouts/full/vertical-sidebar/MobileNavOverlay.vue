<script setup lang="ts">
defineOptions({ name: 'MobileNavOverlay' });

import { onUnmounted, watch } from 'vue';
import { CONTENT_SIDEBAR_WIDTH, THEME_RAIL_WIDTH } from './sidebarItem';
import ThemeRail from './ThemeRail.vue';
import VerticalSidebar from './VerticalSidebar.vue';

const open = defineModel<boolean>({ required: true });

watch(
    open,
    (isOpen) => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
    },
    { immediate: true }
);

onUnmounted(() => {
    document.body.style.overflow = '';
});
</script>

<template>
    <Transition name="mobile-dual">
        <div v-if="open" class="mobile-dual-overlay">
            <div class="mobile-dual-overlay__scrim" @click="open = false" />
            <div class="theme-rail theme-rail--embedded mobile-dual-overlay__rail" :style="{ width: `${THEME_RAIL_WIDTH}px` }">
                <ThemeRail />
            </div>
            <div
                class="leftSidebar leftSidebar--embedded mobile-dual-overlay__menu"
                :style="{ width: `${CONTENT_SIDEBAR_WIDTH}px`, left: `${THEME_RAIL_WIDTH}px` }"
            >
                <VerticalSidebar />
            </div>
        </div>
    </Transition>
</template>
