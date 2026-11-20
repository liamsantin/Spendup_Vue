<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import MobileTabBar from './MobileTabBar.vue';
import { useIsMobile } from '../composables/useBreakpoint';
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

/** Desktop : sidebar déployée (sinon rail d'icônes) ; mobile : volet ouvert. */
const open = defineModel<boolean>('open', { default: false });
const openId = defineModel<string | null>('openId', { default: null });
const activeId = defineModel<string | null>('activeId', { default: null });
const search = defineModel<string>('search', { default: '' });

const emit = defineEmits<{
    select: [leaf: NavLeaf];
    'search-submit': [value: string];
}>();

/* ── repli desktop mémorisé ──────────────────────────────
 * Le même booléen sert de volet sur mobile (fermé au chargement) et de repli sur
 * desktop (déployé par défaut, puis selon le dernier choix de l'utilisateur). */
const STORAGE_KEY = 'spendup_shell_sidebar';
const isMobile = useIsMobile();
/** Les transitions ne démarrent qu'après le premier rendu, pour ne pas animer l'état initial. */
const ready = ref(false);

function readStoredOpen(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === null ? true : stored === 'open';
    } catch {
        return true;
    }
}

function storeOpen(value: boolean) {
    try {
        localStorage.setItem(STORAGE_KEY, value ? 'open' : 'closed');
    } catch {
        /* stockage indisponible : le choix ne survit pas au rechargement */
    }
}

onMounted(() => {
    if (!isMobile.value) open.value = readStoredOpen();
    requestAnimationFrame(() => {
        ready.value = true;
    });
});

watch(open, (value) => {
    if (!isMobile.value) storeOpen(value);
});

/* au passage d'un point de rupture à l'autre, le booléen change de sens */
watch(isMobile, (mobile) => {
    open.value = mobile ? false : readStoredOpen();
});
</script>

<template>
    <div class="shell" :class="{ 'is-collapsed': !open, 'is-ready': ready }">
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
    column-gap: var(--shell-pad);
    height: 100dvh;
    min-height: 100vh;
    overflow: hidden;
    /* cadre gris très clair : la sidebar et le header flottent dessus en cartes */
    padding: var(--shell-pad);
    background: var(--shell-bg);
    color: var(--ink);
    font-family: var(--font-ui);
}

/* rail d'icônes : la colonne de grille se resserre, le header et le contenu suivent */
.shell.is-collapsed {
    --sidebar-w: var(--sidebar-collapsed-w);
}

.shell.is-ready {
    transition: grid-template-columns var(--dur-expand) var(--ease);
}

.shell__aside {
    position: relative;
    z-index: 2;
    height: calc(100dvh - 2 * var(--shell-pad));
    background: var(--side-bg);
    box-shadow: var(--shadow-card);
}

.shell__main {
    position: relative;
    z-index: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    row-gap: var(--shell-pad);
}

.shell__content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    font-family: var(--font-ui);
    color: var(--ink);
}

/* en sombre l'ombre se voit à peine : un filet fin délimite la carte */
[class*='v-theme--DARK_'] .shell__aside {
    border: 1px solid var(--line);
}

/* pleine colonne : le bord droit reste celui de la carte, sidebar ouverte ou repliée */
.shell__content > :deep(.page-content) {
    flex: 1 1 auto;
    align-self: stretch;
    min-height: 0;
    width: 100%;
    max-width: none;
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
        --content-pad-y: 24px;
    }
}

@media (max-width: 767px) {
    .shell {
        grid-template-columns: minmax(0, 1fr);
        /* plus de cadre : le header colle en haut, le volet est fixé */
        padding: 0;
        /* réserve la place de la barre d'onglets fixée en bas */
        padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
        background: var(--bg);
    }
    .shell__aside {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0;
        height: 100dvh;
        background: transparent;
        box-shadow: none;
        border: 0;
    }
    .shell__main {
        row-gap: 0;
    }
    .shell__content > :deep(.page-content) {
        --content-pad-x: 16px;
        --content-pad-y: 20px;
    }
}
</style>
