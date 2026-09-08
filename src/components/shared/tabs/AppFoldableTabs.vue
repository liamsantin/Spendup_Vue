<script setup lang="ts">
/**
 * Barre d’onglets compacte à droite : le dépliement est horizontal, de droite vers la gauche.
 * Pastille courante et flèche sont deux contrôles distincts.
 */
defineOptions({ name: 'AppFoldableTabs' });

import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronLeftIcon } from 'vue-tabler-icons';

defineProps<{
    ariaLabel: string;
}>();

/** Durée du repli : la pastille compacte n’apparaît qu’à l’arrivée visuelle de l’onglet actif. */
const PEEK_REVEAL_MS = 520;

const { t } = useI18n();
const open = ref(false);
const closing = ref(false);
const root = ref<HTMLElement | null>(null);
let peekTimer: ReturnType<typeof setTimeout> | null = null;

function clearPeekTimer() {
    if (peekTimer) {
        clearTimeout(peekTimer);
        peekTimer = null;
    }
}

function toggle() {
    if (open.value) close();
    else expand();
}

function expand() {
    clearPeekTimer();
    closing.value = false;
    open.value = true;
}

function close() {
    if (!open.value && !closing.value) return;
    open.value = false;
    closing.value = true;
    clearPeekTimer();
    peekTimer = setTimeout(() => {
        closing.value = false;
        peekTimer = null;
    }, PEEK_REVEAL_MS);
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
    clearPeekTimer();
    document.removeEventListener('pointerdown', onDocumentPointer);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <nav
        ref="root"
        class="su-tabs su-tabs--foldable"
        :class="{ 'is-open': open, 'is-closing': closing }"
        :aria-label="ariaLabel"
    >
        <div class="su-tabs__fold">
            <div class="su-tabs__fold-inner">
                <slot />
            </div>
        </div>
        <div class="su-tabs__peek">
            <span class="su-tab is-active su-tabs__peek-pill">
                <slot name="summary" />
            </span>
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
