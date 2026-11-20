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
 *   moyens de paiement, import, récurrences). Le toucher ramène à la dernière page visitée
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
            sections: [SHELL_NAV_IDS.planning, SHELL_NAV_IDS.wealth],
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
    const groups: { id: string; title: string; leaves: NavLeaf[] }[] = [];
    for (const id of tab.sections) {
        const item = props.items.find((entry) => entry.id === id);
        if (!item?.children?.length) continue;
        for (const leaf of item.children) {
            const title = leaf.group ?? '';
            const last = groups[groups.length - 1];
            if (!last || last.title !== title) {
                groups.push({ id: `${item.id}:${title || 'root'}:${groups.length}`, title, leaves: [leaf] });
            } else {
                last.leaves.push(leaf);
            }
        }
    }
    return groups;
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
                <h3 v-if="group.title" class="pages__title">{{ group.title }}</h3>
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
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        align-items: center;
        height: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
        padding: 0 4px env(safe-area-inset-bottom, 0px);
        background: var(--bg);
        border-top: 1px solid var(--ink);
        font-family: var(--font-ui);
        -webkit-tap-highlight-color: transparent;
    }
}

.tab {
    appearance: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    cursor: pointer;
    transition: color 0.15s var(--ease);
}

.tab__icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 44px;
    height: 26px;
}

.tab__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 400;
}

.tab.is-active {
    color: var(--ink);
}
.tab.is-active .tab__label {
    font-weight: 700;
}
.tab.is-active .tab__icon {
    color: var(--blue);
}
/* onglet actif à sous-pages : un carré signale qu'un second appui les liste */
.tab.is-active.has-pages .tab__icon::after {
    content: '';
    position: absolute;
    top: -4px;
    right: 4px;
    width: 5px;
    height: 5px;
    background: var(--blue);
}
.tab:focus-visible {
    outline: none;
}
.tab:focus-visible .tab__icon {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

/* ── bouton central : carré bleu ───────────────────────── */
.add {
    appearance: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--blue-btn);
    color: #ffffff;
    cursor: pointer;
    transition: transform 0.2s var(--ease);
}
.add.is-open {
    transform: rotate(45deg);
}
.add:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
}

/* ── panneaux du bas ───────────────────────────────────── */
.sheet {
    max-height: 80dvh;
    overflow-y: auto;
    padding: 12px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--ink);
    background: var(--raise);
    color: var(--ink);
    font-family: var(--font-ui);
}
.sheet__grip {
    display: none;
}
.sheet__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 8px;
}
.sheet__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.025em;
}
.sheet__close {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: transparent;
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
    gap: 8px;
}
.tile {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 14px 6px 12px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition: background 0.15s var(--ease);
}
.tile:hover,
.tile:active {
    background: var(--soft);
    border-color: var(--ink);
}
.tile__icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 0;
    background: var(--t-blue-bg);
    color: var(--t-blue-ink);
}
.tile__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
}

/* pages d'une section */
.pages + .pages {
    margin-top: 16px;
}
.pages__title {
    margin: 0;
    padding: 6px 0 6px;
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
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
    min-height: 46px;
    padding: 0;
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
}
.pages__list > li:last-child .page {
    border-bottom: 1px solid var(--line);
}
.page:not(:disabled):active {
    background: var(--soft);
}
.page.is-active {
    font-weight: 700;
}
.page.is-active .page__icon {
    color: var(--blue);
}
.page.is-active::after {
    content: '';
    margin-left: auto;
    width: 6px;
    height: 6px;
    background: var(--blue);
}
.page:disabled {
    color: var(--gray);
    cursor: default;
}
.page__icon {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    color: var(--ink-mute);
}
.page__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.page__caption {
    margin-left: auto;
    color: var(--gray);
    font-size: 12px;
}
</style>
