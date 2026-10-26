<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import MobileTabBar from './MobileTabBar.vue';
import type { NavItem, NavLeaf } from '../types/navigation';

/**
 * Coquille de layout « Swiss » : sidebar 272 px à gauche, header 72 px en haut,
 * contenu à droite. Fond blanc unique, filets noirs, aucune carte.
 *
 * Elle porte la seule glu nécessaire (état d'ouverture partagé sur mobile, colonnes)
 * pour qu'un projet n'ait qu'à poser `<AppShell :items="…">contenu</AppShell>`.
 */
withDefaults(
    defineProps<{
        items?: NavItem[];
        bottomItems?: NavItem[];
        title?: string;
        notifications?: number;
        headerLinks?: NavLeaf[];
        headerMenus?: NavItem[];
    }>(),
    {
        items: () => [],
        bottomItems: () => [],
        title: 'Menu',
        notifications: 0,
        headerLinks: () => [],
        headerMenus: () => []
    }
);

/** Volet mobile déployé (sur desktop la sidebar est toujours visible). */
const open = defineModel<boolean>('open', { default: false });
const openId = defineModel<string | null>('openId', { default: null });
const activeId = defineModel<string | null>('activeId', { default: null });
const search = defineModel<string>('search', { default: '' });

const emit = defineEmits<{
    select: [leaf: NavLeaf];
    'search-submit': [value: string];
}>();
</script>

<template>
    <div class="shell">
        <div class="shell__aside">
            <AppSidebar
                v-model:open="open"
                v-model:open-id="openId"
                v-model:active-id="activeId"
                :items="items"
                :bottom-items="bottomItems"
                :title="title"
                @select="emit('select', $event)"
            />
        </div>

        <div class="shell__main">
            <slot name="header" :open="open" :toggle="() => (open = !open)">
                <AppHeader
                    v-model:search="search"
                    :menu-open="open"
                    :notifications="notifications"
                    :header-links="headerLinks"
                    :header-menus="headerMenus"
                    @toggle-menu="open = !open"
                    @search-submit="emit('search-submit', $event)"
                />
            </slot>

            <main id="main-content" class="shell__content" tabindex="-1">
                <slot />
            </main>
        </div>

        <MobileTabBar v-model:menu-open="open" :items="[...items, ...bottomItems]" />
    </div>
</template>

<style scoped>
.shell {
    position: relative;
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    height: 100dvh;
    min-height: 100vh;
    overflow: hidden;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-ui);
}

.shell__aside {
    position: relative;
    z-index: 2;
    height: 100dvh;
    background: var(--side-bg);
    border-right: 1px solid var(--line);
}

.shell__main {
    position: relative;
    z-index: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.shell__content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-ui);
    color: var(--ink);
}

.shell__content > :deep(.page-content) {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    max-width: calc(var(--content-max) + 2 * var(--content-pad-x));
    margin: 0;
    overflow: hidden;
    padding: var(--content-pad-y) var(--content-pad-x) 0;
}

.shell__content > :deep(.page-content) > * {
    flex: 1 1 auto;
    min-height: 0;
}

@media (max-width: 1199px) {
    .shell__content > :deep(.page-content) {
        --content-pad-x: 32px;
        --content-pad-y: 32px;
    }
}

@media (max-width: 767px) {
    .shell {
        grid-template-columns: minmax(0, 1fr);
        /* réserve la place de la barre d'onglets fixée en bas */
        padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
    }
    .shell__aside {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0;
        height: 100dvh;
        border-right: 0;
        background: transparent;
    }
    .shell__content > :deep(.page-content) {
        --content-pad-x: 16px;
        --content-pad-y: 20px;
    }
}
</style>
