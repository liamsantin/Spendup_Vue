<script setup lang="ts">
/**
 * Barre d’onglets compacte à droite : le dépliement est horizontal, de droite vers la gauche.
 * À la fermeture, les onglets inactifs se replient ; la pastille active reste visible et est tirée vers la flèche.
 */
defineOptions({ name: 'AppFoldableTabs' });

import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon } from 'vue-tabler-icons';

defineProps<{
    ariaLabel: string;
}>();

const { t } = useI18n();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle() {
    if (open.value) close();
    else expand();
}

function expand() {
    open.value = true;
}

function close() {
    open.value = false;
}

function onDocumentPointer(event: PointerEvent) {
    if (!open.value || !root.value) return;
    const target = event.target;
    if (target instanceof Node && root.value.contains(target)) return;
    close();
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close();
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocumentPointer);
    document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
    document.removeEventListener('pointerdown', onDocumentPointer);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <nav ref="root" class="su-tabs su-tabs--foldable" :class="{ 'is-open': open }" :aria-label="ariaLabel">
        <div class="su-tabs__fold">
            <div class="su-tabs__fold-inner">
                <slot />
            </div>
        </div>
        <button
            type="button"
            class="su-tab su-tabs__handle"
            :aria-expanded="open"
            :aria-label="open ? t('common.close') : t('common.open')"
            @click="toggle"
        >
            <ChevronLeftIcon class="su-tabs__chevron" :size="16" stroke-width="1.8" />
        </button>
    </nav>
</template>
