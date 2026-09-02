<script setup lang="ts">
defineOptions({ name: 'MobileNavOverlay' });

import { nextTick, onUnmounted, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { createBodyScrollLock, trapOverlayTab } from './nav-overlay';
import ThemeRail from './ThemeRail.vue';
import VerticalSidebar from './VerticalSidebar.vue';

const open = defineModel<boolean>({ required: true });
const { t } = useI18n();
const overlayRef = useTemplateRef<HTMLElement>('overlayEl');
const scrollLock = createBodyScrollLock();
let restoreFocus: HTMLElement | null = null;

function onKeydown(event: KeyboardEvent) {
    if (!open.value) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        open.value = false;
        return;
    }
    const root = overlayRef.value;
    if (root) trapOverlayTab(event, root);
}

watch(
    open,
    async (isOpen) => {
        if (isOpen) {
            restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            scrollLock.lock();
            document.addEventListener('keydown', onKeydown);
            await nextTick();
            const root = overlayRef.value;
            const first = root?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
            first?.focus();
            return;
        }
        document.removeEventListener('keydown', onKeydown);
        scrollLock.unlock();
        restoreFocus?.focus();
        restoreFocus = null;
    },
    { immediate: true }
);

onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown);
    scrollLock.unlock();
});
</script>

<template>
    <Transition name="mobile-dual">
        <div
            v-if="open"
            ref="overlayEl"
            class="mobile-dual-overlay"
            role="dialog"
            aria-modal="true"
            :aria-label="t('nav.toggleMenu')"
        >
            <div class="mobile-dual-overlay__scrim" @click="open = false" />
            <div class="theme-rail theme-rail--embedded mobile-dual-overlay__rail">
                <ThemeRail />
            </div>
            <div class="leftSidebar leftSidebar--embedded mobile-dual-overlay__menu">
                <VerticalSidebar />
            </div>
        </div>
    </Transition>
</template>
