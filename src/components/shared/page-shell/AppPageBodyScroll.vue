<script setup lang="ts">
/**
 * Corps de page scrollable — perfect-scrollbar (desktop) / natif (mobile).
 *
 * Pas de ResizeObserver → ps.update() : ça boucle (rail / sélection texte) et
 * peut figer l’onglet. On rafraîchit au mount, au breakpoint, et via
 * MutationObserver (ajout/retrait de contenu) coalescé en rAF.
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

let mutationObserver: MutationObserver | null = null;
let rafId = 0;
let updating = false;

function refreshScrollbar() {
    if (smAndDown.value || updating) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        rafId = 0;
        updating = true;
        try {
            scrollbarRef.value?.ps?.update();
        } finally {
            requestAnimationFrame(() => {
                updating = false;
            });
        }
    });
}

function bindContentObserver() {
    mutationObserver?.disconnect();
    mutationObserver = null;
    const el = contentRef.value;
    if (!el || smAndDown.value || typeof MutationObserver === 'undefined') return;
    mutationObserver = new MutationObserver(() => {
        refreshScrollbar();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });
}

onMounted(async () => {
    await nextTick();
    bindContentObserver();
    refreshScrollbar();
});

onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    mutationObserver?.disconnect();
    mutationObserver = null;
});

watch(smAndDown, async (mobile) => {
    if (mobile) {
        mutationObserver?.disconnect();
        mutationObserver = null;
        return;
    }
    await nextTick();
    bindContentObserver();
    refreshScrollbar();
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
