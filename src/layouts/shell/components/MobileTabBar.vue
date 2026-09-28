<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { FriendQrModal, useFriendsStore } from '@/features/friends';
import { BUDGETS_PATHS } from '@/features/budgets/paths';
import { RECURRENCES_PATHS } from '@/features/recurring-payments/paths';
import { SAVINGS_GOALS_PATHS } from '@/features/savings-goals/paths';
import { SHELL_NAV_IDS, idsFromPath } from '../composables/useShellNav';
import {
    BudgetsNavIcon,
    DashboardNavIcon,
    FilesNavIcon,
    FinancesNavIcon,
    FriendsNavIcon,
    GoalsNavIcon,
    MenuNavIcon,
    PlanningNavIcon,
    RecurrencesOverviewNavIcon,
    TransactionsNavIcon
} from '../solarNavIcons';
import BaseIcon from './BaseIcon.vue';
import ShellNavIcon from './ShellNavIcon.vue';
import type { NavIcon, NavItem, NavLeaf } from '../types/navigation';

/**
 * Barre d'onglets fixée en bas, réservée au mobile (masquée par le CSS au-delà du
 * point de rupture, comme les éléments mobiles de la sidebar).
 *
 * Accueil · Finances · [+] · Planning · Menu
 *
 * - Un onglet de section couvre plusieurs pages (Finances = comptes, transactions,
 *   moyens de paiement, récurrences). Le toucher ramène à la dernière page visitée
 *   dans la section ; le retoucher une fois dedans ouvre la liste de ses pages.
 * - « + » ouvre l'ajout rapide : chaque action mène à la page concernée avec son
 *   formulaire de création déjà ouvert (`?create=1`).
 * - « Menu » ouvre le volet complet de la sidebar et reste surligné quand la page
 *   courante n'appartient à aucun autre onglet : on sait toujours où l'on est.
 */
const props = withDefaults(
    defineProps<{
        /** Arborescence de navigation (useShellNav) : source des sous-pages des sections. */
        items?: NavItem[];
    }>(),
    { items: () => [] }
);

/** Volet de la sidebar : l'onglet Menu le pilote. */
const menuOpen = defineModel<boolean>('menuOpen', { default: false });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const friends = useFriendsStore();

interface SectionTab {
    id: string;
    label: string;
    icon: NavIcon;
    /** Sections de useShellNav regroupées sous l'onglet. */
    sections: string[];
    /** Destination par défaut, avant toute visite. */
    root: string;
}

const tabs = computed<{ left: SectionTab[]; right: SectionTab[] }>(() => ({
    left: [
        { id: 'home', label: t('nav.tabBar.home'), icon: DashboardNavIcon, sections: [SHELL_NAV_IDS.dashboard], root: '/app' },
        {
            id: 'finances',
            label: t('nav.tabBar.finances'),
            icon: FinancesNavIcon,
            sections: [SHELL_NAV_IDS.finances, SHELL_NAV_IDS.recurrences],
            root: '/app/finances/transactions'
        }
    ],
    right: [
        {
            id: 'planning',
            label: t('nav.tabBar.planning'),
            icon: PlanningNavIcon,
            sections: [SHELL_NAV_IDS.planning],
            root: BUDGETS_PATHS.list
        }
    ]
}));

const allTabs = computed(() => [...tabs.value.left, ...tabs.value.right]);

/* dérivé de la route et non d'openId : ouvrir un accordéon de la sidebar ne doit
   pas déplacer le surlignage de la barre */
const currentSection = computed(() => {
    const { openId } = idsFromPath(route.path);
    // idsFromPath retombe sur le tableau de bord pour les pages hors menu (notifications,
    // applications…) : ici seul `/app` est l'Accueil, le reste relève de l'onglet Menu.
    if (openId === SHELL_NAV_IDS.dashboard && route.path.replace(/\/$/, '') !== '/app') return null;
    return openId;
});
const currentTab = computed(() => allTabs.value.find((tab) => tab.sections.includes(currentSection.value ?? '')) ?? null);

function isActive(tab: SectionTab): boolean {
    return !menuOpen.value && currentTab.value?.id === tab.id;
}

const menuActive = computed(() => menuOpen.value || !currentTab.value);

/** Sous-pages navigables d'un onglet, groupées par section. */
function groupsOf(tab: SectionTab): { id: string; title: string; leaves: NavLeaf[] }[] {
    return tab.sections
        .map((id) => props.items.find((item) => item.id === id))
        .filter((item): item is NavItem => !!item?.children?.length)
        .map((item) => ({ id: item.id, title: item.label, leaves: item.children ?? [] }));
}

/* ── mémoire de la dernière page par onglet (filtres compris) ── */
const lastVisited = reactive<Record<string, string>>({});

watch(
    () => route.fullPath,
    (fullPath) => {
        if (currentTab.value) lastVisited[currentTab.value.id] = fullPath;
    },
    { immediate: true }
);

const pagesSheet = ref<SectionTab | null>(null);
const pagesGroups = computed(() => (pagesSheet.value ? groupsOf(pagesSheet.value) : []));
const currentLeafId = computed(() => idsFromPath(route.path).activeId);

function onTab(tab: SectionTab) {
    menuOpen.value = false;
    if (currentTab.value?.id === tab.id) {
        // déjà dans la section : on propose ses pages, ou on revient à la racine
        if (groupsOf(tab).length) pagesSheet.value = tab;
        else if (route.fullPath !== tab.root) void router.push(tab.root);
        return;
    }
    void router.push(lastVisited[tab.id] ?? tab.root);
}

function openLeaf(leaf: NavLeaf) {
    if (leaf.disabled || !leaf.to) return;
    pagesSheet.value = null;
    void router.push(leaf.to);
}

/* ── ajout rapide ──────────────────────────────────────── */
const addOpen = ref(false);
const qrOpen = ref(false);

function openAdd() {
    menuOpen.value = false;
    addOpen.value = true;
}

function create(path: string) {
    addOpen.value = false;
    void router.push({ path, query: { create: '1' } });
}

async function openAddFriend() {
    addOpen.value = false;
    await nextTick();
    qrOpen.value = true;
}

async function onQrScanned(publicId: string) {
    try {
        await router.push({ path: '/app/friends', query: { tab: 'Discover' } });
        await friends.searchUsers(publicId);
    } catch {
        // erreur via store.error
    }
}

const quickActions = computed<{ id: string; icon: Component; label: string; run: () => void }[]>(() => [
    {
        id: 'transaction',
        icon: TransactionsNavIcon,
        label: t('nav.quickAdd.transaction'),
        run: () => create('/app/finances/transactions')
    },
    {
        id: 'recurrence',
        icon: RecurrencesOverviewNavIcon,
        label: t('nav.quickAdd.recurrence'),
        run: () => create(RECURRENCES_PATHS.overview)
    },
    { id: 'budget', icon: BudgetsNavIcon, label: t('nav.quickAdd.budget'), run: () => create(BUDGETS_PATHS.list) },
    { id: 'goal', icon: GoalsNavIcon, label: t('nav.quickAdd.goal'), run: () => create(SAVINGS_GOALS_PATHS.list) },
    {
        id: 'file',
        icon: FilesNavIcon,
        label: t('nav.quickAdd.file'),
        run: () => {
            addOpen.value = false;
            void router.push({ path: '/app/gestion/files', query: { upload: '1' } });
        }
    },
    { id: 'friend', icon: FriendsNavIcon, label: t('nav.quickAdd.friend'), run: openAddFriend }
]);
</script>

<template>
    <nav class="tabbar" :aria-label="t('nav.tabBar.label')">
        <button
            v-for="tab in tabs.left"
            :key="tab.id"
            type="button"
            class="tab"
            :class="{ 'is-active': isActive(tab), 'has-pages': groupsOf(tab).length > 0 }"
            :aria-current="isActive(tab) ? 'page' : undefined"
            @click="onTab(tab)"
        >
            <span class="tab__icon"><ShellNavIcon :icon="tab.icon" :size="24" /></span>
            <span class="tab__label">{{ tab.label }}</span>
        </button>

        <div class="tab tab--add">
            <button
                type="button"
                class="add"
                :class="{ 'is-open': addOpen }"
                :aria-label="t('nav.tabBar.add')"
                aria-haspopup="dialog"
                :aria-expanded="addOpen"
                @click="openAdd"
            >
                <BaseIcon name="plus" :size="26" />
            </button>
        </div>

        <button
            v-for="tab in tabs.right"
            :key="tab.id"
            type="button"
            class="tab"
            :class="{ 'is-active': isActive(tab), 'has-pages': groupsOf(tab).length > 0 }"
            :aria-current="isActive(tab) ? 'page' : undefined"
            @click="onTab(tab)"
        >
            <span class="tab__icon"><ShellNavIcon :icon="tab.icon" :size="24" /></span>
            <span class="tab__label">{{ tab.label }}</span>
        </button>

        <button type="button" class="tab" :class="{ 'is-active': menuActive }" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span class="tab__icon"><ShellNavIcon :icon="MenuNavIcon" :size="24" /></span>
            <span class="tab__label">{{ t('nav.tabBar.menu') }}</span>
        </button>
    </nav>

    <!-- ajout rapide -->
    <v-bottom-sheet v-model="addOpen" :aria-label="t('nav.quickAdd.title')">
        <div class="sheet">
            <div class="sheet__grip" aria-hidden="true" />
            <header class="sheet__head">
                <h2 class="sheet__title">{{ t('nav.quickAdd.title') }}</h2>
                <button type="button" class="sheet__close" :aria-label="t('nav.quickAdd.close')" @click="addOpen = false">
                    <BaseIcon name="close" :size="18" />
                </button>
            </header>
            <ul class="grid">
                <li v-for="action in quickActions" :key="action.id">
                    <button type="button" class="tile" @click="action.run">
                        <span class="tile__icon"><component :is="action.icon" :size="26" /></span>
                        <span class="tile__label">{{ action.label }}</span>
                    </button>
                </li>
            </ul>
        </div>
    </v-bottom-sheet>

    <!-- pages de la section courante -->
    <v-bottom-sheet
        :model-value="!!pagesSheet"
        :aria-label="pagesSheet ? t('nav.tabBar.pagesOf', { section: pagesSheet.label }) : undefined"
        @update:model-value="!$event && (pagesSheet = null)"
    >
        <div v-if="pagesSheet" class="sheet">
            <div class="sheet__grip" aria-hidden="true" />
            <header class="sheet__head">
                <h2 class="sheet__title">{{ pagesSheet.label }}</h2>
                <button type="button" class="sheet__close" :aria-label="t('nav.quickAdd.close')" @click="pagesSheet = null">
                    <BaseIcon name="close" :size="18" />
                </button>
            </header>
            <section v-for="group in pagesGroups" :key="group.id" class="pages">
                <h3 v-if="pagesGroups.length > 1" class="pages__title">{{ group.title }}</h3>
                <ul class="pages__list">
                    <li v-for="leaf in group.leaves" :key="leaf.id">
                        <button
                            type="button"
                            class="page"
                            :class="{ 'is-active': leaf.id === currentLeafId }"
                            :disabled="leaf.disabled"
                            :aria-current="leaf.id === currentLeafId ? 'page' : undefined"
                            @click="openLeaf(leaf)"
                        >
                            <span class="page__icon"><ShellNavIcon :icon="leaf.icon" :size="22" /></span>
                            <span class="page__label">{{ leaf.label }}</span>
                            <span v-if="leaf.caption" class="page__caption">{{ leaf.caption }}</span>
                        </button>
                    </li>
                </ul>
            </section>
        </div>
    </v-bottom-sheet>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>

<style scoped>
/* masquée hors mobile : le markup ne dépend pas d'un matchMedia (premier paint) */
.tabbar {
    display: none;
}

@media (max-width: 767px) {
    .tabbar {
        position: fixed;
        left: 8px;
        right: 8px;
        bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        align-items: center;
        height: var(--tabbar-h);
        padding: 0 4px;
        border-radius: var(--radius-header-mobile);
        background: var(--surface-overlay);
        border: 1px solid var(--stroke);
        backdrop-filter: var(--blur);
        box-shadow: var(--shadow-lifted);
        font-family: var(--font-ui);
        -webkit-tap-highlight-color: transparent;
        animation: tabbar-in 0.8s var(--ease) both;
    }
}

@keyframes tabbar-in {
    from {
        opacity: 0;
        transform: translateY(18px);
    }
}

.tab {
    appearance: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    font: inherit;
    cursor: pointer;
    transition: color 0.3s var(--ease);
}

.tab__icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 52px;
    height: 30px;
    border-radius: 15px;
    transition:
        background 0.35s var(--ease),
        transform 0.45s var(--spring);
}

.tab__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 560;
    letter-spacing: 0.01em;
}

.tab.is-active {
    color: rgb(var(--v-theme-primary));
}
.tab.is-active .tab__icon {
    background: rgba(var(--v-theme-primary), 0.12);
}
/* onglet actif à sous-pages : un tiret signale qu'un second appui les liste */
.tab.is-active.has-pages .tab__icon::after {
    content: '';
    position: absolute;
    top: -7px;
    left: 50%;
    width: 14px;
    height: 3px;
    margin-left: -7px;
    border-radius: 2px;
    background: currentColor;
    opacity: 0.45;
}
.tab:active .tab__icon {
    transform: scale(0.9);
}
.tab:focus-visible {
    outline: none;
}
.tab:focus-visible .tab__icon {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
}

/* ── bouton central ────────────────────────────────────── */
.add {
    appearance: none;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin-top: -22px;
    padding: 0;
    border: 3px solid var(--surface-raised);
    border-radius: 50%;
    background: rgb(var(--v-theme-primary));
    color: #ffffff;
    box-shadow: 0 12px 24px -10px rgba(var(--v-theme-primary), 0.75);
    cursor: pointer;
    transition: transform 0.45s var(--spring);
}
.add:active {
    transform: scale(0.92);
}
.add.is-open {
    transform: rotate(45deg);
}
.add:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 3px;
}

/* ── panneaux du bas ───────────────────────────────────── */
.sheet {
    max-height: 80dvh;
    overflow-y: auto;
    padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    border-radius: var(--radius-overlay) var(--radius-overlay) 0 0;
    background: var(--surface-raised);
    color: var(--ink);
    font-family: var(--font-ui);
}
.sheet__grip {
    width: 40px;
    height: 4px;
    margin: 0 auto 10px;
    border-radius: 2px;
    background: var(--thread);
}
.sheet__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 10px;
}
.sheet__title {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    letter-spacing: -0.02em;
}
.sheet__close {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--hair);
    color: var(--ink);
    cursor: pointer;
}

/* ajout rapide : grille de tuiles au pouce */
.grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
.tile {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 14px 6px 12px;
    border: 1px solid var(--hair);
    border-radius: var(--radius-leaf);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
        background 0.25s var(--ease),
        transform 0.35s var(--spring);
}
.tile:hover {
    background: var(--hair);
}
.tile:active {
    transform: scale(0.95);
}
.tile__icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}
.tile__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13.5px;
    font-weight: 600;
}

/* pages d'une section */
.pages + .pages {
    margin-top: 10px;
}
.pages__title {
    margin: 0;
    padding: 6px 12px 4px;
    color: var(--ink-muted);
    font-size: 13px;
    font-weight: 560;
}
.pages__list {
    list-style: none;
    margin: 0;
    padding: 0;
}
.page {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 10px 12px;
    border: 0;
    border-radius: var(--radius-leaf);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15.5px;
    font-weight: 540;
    text-align: left;
    cursor: pointer;
}
.page:not(:disabled):active {
    background: var(--hair);
}
.page.is-active {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    font-weight: 620;
}
.page:disabled {
    color: var(--ink-muted);
    cursor: default;
}
.page__icon {
    display: grid;
    place-items: center;
    flex: none;
}
.page__label {
    flex: 1;
    min-width: 0;
}
.page__caption {
    flex: none;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--hair);
    font-size: 12px;
}
</style>
