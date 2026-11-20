<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseIcon from './BaseIcon.vue';
import BurgerButton from './BurgerButton.vue';
import NavRow from './NavRow.vue';
import Logo from '@/layouts/full/logo/Logo.vue';
import { useIsMobile } from '../composables/useBreakpoint';
import { useScrollLock } from '../composables/useScrollLock';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

/**
 * Sidebar Swiss : logo, puis navigation en groupes (libellé 12 px gris, entrées
 * de 40 px séparées par un filet fin). En bas, filet 2 px noir puis « Paramètres ».
 * Sur desktop elle se replie en rail d'icônes (burger ou clic sur le logo) ; sur
 * mobile elle devient un volet.
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

/** Desktop : colonne déployée (sinon rail d'icônes) ; mobile : volet ouvert. */
const open = defineModel<boolean>('open', { default: false });
/** Section dépliée (une seule à la fois) : suit la route, puis les clics. */
const openId = defineModel<string | null>('openId', { default: null });
/** Entrée terminale sélectionnée. */
const activeId = defineModel<string | null>('activeId', { default: null });

const emit = defineEmits<{ select: [leaf: NavLeafType] }>();

const { t } = useI18n();
const isMobile = useIsMobile();
const surface = ref<HTMLElement | null>(null);

/** Sur mobile le volet est toujours déployé : seul le desktop connaît le rail replié. */
const expandedRail = computed(() => open.value || isMobile.value);

function toggle() {
    open.value = !open.value;
}

/* accordéon : un clic sur une section la déplie et replie l'autre ; un second clic la referme */
function toggleItem(item: NavItem) {
    openId.value = openId.value === item.id ? null : item.id;
}

function selectLeaf(leaf: NavLeafType) {
    if (leaf.disabled) return;
    activeId.value = leaf.id;
    emit('select', leaf);
    if (isMobile.value) open.value = false;
}

/* rail replié : l'icône d'une section déploie la colonne sur cette section ; une entrée seule navigue */
function openTab(item: NavItem) {
    if (!item.children?.length) {
        selectLeaf(item);
        return;
    }
    open.value = true;
    openId.value = item.id;
}

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
                    <span class="head__toggle">
                        <BurgerButton class="head__burger" :open="open" :label="t('nav.toggleMenu')" @click="toggle" />
                    </span>
                    <!-- desktop : le logo replie / déploie la colonne ; mobile : il reste un lien -->
                    <button
                        v-if="!isMobile"
                        type="button"
                        class="head__brand"
                        :aria-expanded="open"
                        :aria-label="t('nav.toggleMenu')"
                        @click="toggle"
                    >
                        <Logo plain />
                    </button>
                    <Logo v-else />
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
                            :open="openId === item.id"
                            :active-id="activeId"
                            :expanded="expandedRail"
                            :index="i"
                            @toggle="toggleItem"
                            @select="selectLeaf"
                            @tab="openTab"
                        />
                    </ul>
                </div>

                <div v-if="bottomItems.length" class="rail__bottom">
                    <ul class="nav nav--bottom">
                        <NavRow
                            v-for="(item, i) in bottomItems"
                            :key="item.id"
                            :item="item"
                            :open="openId === item.id"
                            :active-id="activeId"
                            :expanded="expandedRail"
                            :index="i + items.length"
                            @toggle="toggleItem"
                            @select="selectLeaf"
                            @tab="openTab"
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
    transition: padding var(--dur-expand) var(--ease);
}

.head {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    margin-bottom: 20px;
}

/* les barres du burger s'alignent sur la gouttière, comme les icônes des entrées */
.head__toggle {
    flex: none;
    display: flex;
    margin-left: -11px;
    transition: margin-left var(--dur-expand) var(--ease);
}

.head__burger {
    --burger-size: 40px;
}

.head__brand {
    appearance: none;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        opacity 0.2s var(--ease) 0.1s,
        visibility 0s linear 0s;
}

.head__brand:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.head__close {
    display: none;
}

/* ── rail replié (desktop) : gouttière réduite, burger seul en tête, logo effacé ── */
.sidebar:not(.is-expanded) .rail {
    padding-inline: 20px;
}

.sidebar:not(.is-expanded) .head__toggle {
    margin-left: 0;
}

.sidebar:not(.is-expanded) .head__brand {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
        opacity 0.15s var(--ease),
        visibility 0s linear 0.15s;
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

    .rail,
    .sidebar:not(.is-expanded) .rail {
        padding: 16px 20px 20px;
    }

    .head {
        justify-content: space-between;
        height: 40px;
        margin-bottom: 20px;
    }

    /* le burger vit dans le header sur mobile : ici une croix suffit */
    .head__toggle {
        display: none;
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
