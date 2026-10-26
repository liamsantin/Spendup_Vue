<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseIcon from './BaseIcon.vue';
import NavRow from './NavRow.vue';
import Logo from '@/layouts/full/logo/Logo.vue';
import { useIsMobile } from '../composables/useBreakpoint';
import { useScrollLock } from '../composables/useScrollLock';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

/**
 * Sidebar Swiss : logo, puis navigation en groupes (libellé 12 px gris, entrées
 * de 40 px séparées par un filet fin). En bas, filet 2 px noir puis « Paramètres ».
 * Sur desktop elle est toujours visible ; sur mobile elle devient un volet.
 */
const props = withDefaults(
    defineProps<{
        items?: NavItem[];
        /** Groupes épinglés en bas, après le filet 2 px (Paramètres). */
        bottomItems?: NavItem[];
        title?: string;
    }>(),
    { items: () => [], bottomItems: () => [], title: 'Menu' }
);

/** Volet mobile déployé. */
const open = defineModel<boolean>('open', { default: false });
/** Conservé pour l'API du shell : groupe « courant » (dérivé de la route). */
const openId = defineModel<string | null>('openId', { default: null });
/** Entrée terminale sélectionnée. */
const activeId = defineModel<string | null>('activeId', { default: null });

const emit = defineEmits<{ select: [leaf: NavLeafType] }>();

const { t } = useI18n();
const isMobile = useIsMobile();
const surface = ref<HTMLElement | null>(null);

/* groupes repliables (annoncés) : fermés par défaut, ouverts à la demande ou quand ils portent la page courante */
const expanded = ref<Set<string>>(new Set());

function isGroupOpen(item: NavItem): boolean {
    return expanded.value.has(item.id) || openId.value === item.id;
}

function toggleItem(item: NavItem) {
    const next = new Set(expanded.value);
    if (isGroupOpen(item)) {
        next.delete(item.id);
        if (openId.value === item.id) openId.value = null;
    } else {
        next.add(item.id);
    }
    expanded.value = next;
}

function selectLeaf(leaf: NavLeafType) {
    if (leaf.disabled) return;
    activeId.value = leaf.id;
    emit('select', leaf);
    if (isMobile.value) open.value = false;
}

const generalLabel = computed(() => t('nav.headers.general'));

/* ── overlay mobile : scroll, focus, échappement ───────── */
useScrollLock(() => open.value && isMobile.value);

let lastFocused: HTMLElement | null = null;

watch(open, async (isOpen) => {
    if (!isMobile.value) return;
    if (isOpen) {
        lastFocused = document.activeElement as HTMLElement | null;
        await nextTick();
        surface.value?.focus();
    } else {
        lastFocused?.focus?.();
        lastFocused = null;
    }
});

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open.value && isMobile.value) open.value = false;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

defineExpose({ toggleItem });
void props;
</script>

<template>
    <div class="sidebar" :class="{ 'is-expanded': open }">
        <div
            ref="surface"
            class="surface"
            tabindex="-1"
            :role="isMobile ? 'dialog' : undefined"
            :aria-modal="isMobile && open ? 'true' : undefined"
            :aria-label="isMobile ? title : undefined"
        >
            <nav class="rail" :aria-label="title">
                <header class="head">
                    <Logo />
                    <button class="head__close" type="button" :aria-label="t('nav.closeMenu')" @click="open = false">
                        <BaseIcon name="close" :size="18" />
                    </button>
                </header>

                <div class="rail__scroll">
                    <ul class="nav">
                        <NavRow
                            v-for="(item, i) in items"
                            :key="item.id"
                            :item="item"
                            :open="isGroupOpen(item)"
                            :active-id="activeId"
                            :expanded="true"
                            :index="i"
                            :group-label="generalLabel"
                            @toggle="toggleItem"
                            @select="selectLeaf"
                        />
                    </ul>
                </div>

                <div v-if="bottomItems.length" class="rail__bottom">
                    <ul class="nav nav--bottom">
                        <NavRow
                            v-for="(item, i) in bottomItems"
                            :key="item.id"
                            :item="item"
                            :open="isGroupOpen(item)"
                            :active-id="activeId"
                            :expanded="true"
                            :index="i + items.length"
                            row-toggle
                            @toggle="toggleItem"
                            @select="selectLeaf"
                        />
                    </ul>
                </div>
            </nav>
        </div>

        <!-- voile de fond, uniquement sur mobile -->
        <div class="scrim" @click="open = false" />
    </div>
</template>

<style scoped>
.sidebar {
    position: relative;
    display: flex;
    align-items: stretch;
    height: 100%;
    font-family: var(--font-ui);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
}

.surface {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--side-bg);
}

.surface:focus {
    outline: none;
}

.rail {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 24px var(--gutter) 24px;
    overflow: hidden;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 24px;
    margin-bottom: 28px;
}

.head__close {
    display: none;
}

.rail__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    /* le filet du dernier groupe ne doit pas se coller au bord */
    padding-bottom: 24px;
}

.rail__scroll::-webkit-scrollbar {
    display: none;
}

.nav {
    list-style: none;
    margin: 0;
    padding: 0;
}

.rail__bottom {
    flex: none;
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid var(--line);
}

/* ── éléments réservés au mobile ───────────────────────── */
.scrim {
    display: none;
}

@media (max-width: 767px) {
    .scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 4;
        background: var(--scrim);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s var(--ease);
    }
    .is-expanded .scrim {
        opacity: 1;
        pointer-events: auto;
    }

    .surface {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 5;
        width: min(calc(100vw - 48px), 320px);
        border-right: 1px solid var(--ink);
        transform: translateX(-100%);
        pointer-events: none;
        transition: transform 0.28s var(--ease);
    }
    .is-expanded .surface {
        transform: none;
        pointer-events: auto;
    }

    .rail {
        padding: 16px 20px 20px;
    }

    .head {
        height: 40px;
        margin-bottom: 20px;
    }

    .head__close {
        display: grid;
        place-items: center;
        flex: none;
        width: 40px;
        height: 40px;
        padding: 0;
        border: 1px solid var(--ink);
        background: transparent;
        color: var(--ink);
        cursor: pointer;
    }
}
</style>
