<script setup lang="ts">
/**
 * Corps de page scrollable — perfect-scrollbar (desktop) / natif (mobile),
 * avec gutter à droite pour que le rail ne passe pas sur les cards.
 */
defineOptions({ name: 'AppPageBodyScroll' });

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { smAndDown } = useDisplay();
const scrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const scrollbarOptions = {
    ...PERFECT_SCROLLBAR_OPTIONS,
    wheelPropagation: false
};

let resizeObserver: ResizeObserver | null = null;

async function refreshScrollbar() {
    if (smAndDown.value) return;
    await nextTick();
    scrollbarRef.value?.ps?.update();
}

onMounted(() => {
    const el = contentRef.value;
    if (el && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            void refreshScrollbar();
        });
        resizeObserver.observe(el);
    }
    void refreshScrollbar();
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
});

watch(smAndDown, async (mobile) => {
    if (mobile) return;
    await nextTick();
    const el = contentRef.value;
    if (el && typeof ResizeObserver !== 'undefined') {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => {
            void refreshScrollbar();
        });
        resizeObserver.observe(el);
    }
    void refreshScrollbar();
});

defineExpose({ refreshScrollbar });
</script>

<template>
    <PerfectScrollbar v-if="!smAndDown" ref="scrollbarRef" class="su-body su-body--ps" :options="scrollbarOptions">
        <div ref="contentRef" class="su-body__scroll-inner">
            <slot />
        </div>
    </PerfectScrollbar>
    <div v-else class="su-body su-body--native-page">
        <div ref="contentRef" class="su-body__scroll-inner">
            <slot />
        </div>
    </div>
</template>
