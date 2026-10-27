<script setup lang="ts">
/**
 * Page Dettes : trois onglets de module (Passifs · Prêts · Entre amis), un chemin par onglet.
 * Recherche, filtres et bouton Ajouter pilotent le panneau de l’onglet courant via la query.
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    LIABILITY_NAME_MAX,
    LIABILITY_STATUSES,
    LIABILITY_STATUS_ALL,
    LIABILITY_TYPES,
    LiabilitiesDirectory,
    debtsPathForTab,
    debtsTabFromPath,
    isLiabilityStatus,
    isLiabilityType,
    matchesLiabilitySearch,
    useLiabilitiesStore,
    type DebtsTab
} from '@/features/liabilities';
import {
    LOAN_DIRECTIONS,
    LOAN_STATUSES,
    LOAN_STATUS_ALL,
    PersonalLoansDirectory,
    isLoanDirection,
    isLoanStatus,
    matchesPersonalLoanSearch,
    usePersonalLoansStore
} from '@/features/personal-loans';
import SharedDebtsPanel from '@/features/shared-debts/components/SharedDebtsPanel.vue';
import { SHARED_DEBT_STATUSES, isSharedDebtStatus } from '@/features/shared-debts';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX = LIABILITY_NAME_MAX;
/** Clés de query propres à chaque onglet (les autres sont conservées telles quelles). */
const FILTER_KEYS = ['q', 'status', 'type', 'direction'] as const;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const liabilitiesStore = useLiabilitiesStore();
const loansStore = usePersonalLoansStore();
const panelRef = ref<{ openCreate: () => void } | null>(null);

const tab = computed(() => debtsTabFromPath(route.path));

const tabs = computed<{ tab: DebtsTab; label: string; to: string }[]>(() => [
    { tab: 'liabilities', label: t('debtsPage.tabs.liabilities'), to: debtsPathForTab('liabilities') },
    { tab: 'loans', label: t('debtsPage.tabs.loans'), to: debtsPathForTab('loans') },
    { tab: 'shared', label: t('debtsPage.tabs.shared'), to: debtsPathForTab('shared') }
]);

const subtitle = computed(() => {
    if (tab.value === 'loans') return t('debtsPage.subtitles.loans');
    if (tab.value === 'shared') return t('sharedDebtsPage.subtitle');
    return t('debtsPage.subtitles.liabilities');
});

const searchPlaceholder = computed(() => {
    if (tab.value === 'loans') return t('debtsPage.searchPlaceholder.loans');
    if (tab.value === 'shared') return t('sharedDebtsPage.searchPlaceholder');
    return t('debtsPage.searchPlaceholder.liabilities');
});

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function patchQuery(patch: Partial<Record<(typeof FILTER_KEYS)[number], string | undefined>>) {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(route.query)) {
        if (typeof value === 'string' && !(FILTER_KEYS as readonly string[]).includes(key)) next[key] = value;
    }
    for (const key of FILTER_KEYS) {
        const value = key in patch ? patch[key] : queryString(key) || undefined;
        if (value) next[key] = key === 'q' ? value.slice(0, SEARCH_MAX) : value;
    }
    void router.replace({ path: route.path, query: next });
}

/* ---------- recherche ---------- */

const searchInput = ref(queryString('q').slice(0, SEARCH_MAX));
const searchOpen = ref(false);
const searchFieldRef = ref<HTMLInputElement | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, SEARCH_MAX);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        patchQuery({ q: searchInput.value.trim() || undefined });
    }, SEARCH_DEBOUNCE_MS);
}

function clearSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = null;
    searchInput.value = '';
    patchQuery({ q: undefined });
}

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, SEARCH_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) searchInput.value = next;
    }
);

watch(searchOpen, (open) => {
    if (!open) return;
    void nextTick(() => searchFieldRef.value?.focus());
});

/* ---------- filtres ---------- */

/** Statut passifs / prêts : vide = défaut `active` (pas de query), `all` lève le filtre. */
const filterStatus = computed({
    get: (): string => {
        const raw = queryString('status');
        if (tab.value === 'shared') return isSharedDebtStatus(raw) ? raw : '';
        if (raw === LIABILITY_STATUS_ALL) return LIABILITY_STATUS_ALL;
        const valid = tab.value === 'loans' ? isLoanStatus(raw) : isLiabilityStatus(raw);
        return valid && raw !== 'active' ? raw : '';
    },
    set: (value: string) => patchQuery({ status: value || undefined })
});

const filterType = computed({
    get: (): string => {
        const raw = queryString('type');
        return isLiabilityType(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ type: value || undefined })
});

const filterDirection = computed({
    get: (): string => {
        const raw = queryString('direction');
        return isLoanDirection(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ direction: value || undefined })
});

const statusItems = computed(() => {
    if (tab.value === 'shared') {
        return [
            { title: t('sharedDebtsPage.filters.allStatuses'), value: '' },
            ...SHARED_DEBT_STATUSES.map((value) => ({ title: t(`sharedDebtsPage.statuses.${value}`), value }))
        ];
    }
    const section = tab.value === 'loans' ? 'personalLoansPage' : 'liabilitiesPage';
    const statuses = tab.value === 'loans' ? LOAN_STATUSES : LIABILITY_STATUSES;
    return [
        ...statuses.map((value) => ({ title: t(`${section}.statuses.${value}`), value: value === 'active' ? '' : value })),
        { title: t('debtsPage.filters.allStatuses'), value: tab.value === 'loans' ? LOAN_STATUS_ALL : LIABILITY_STATUS_ALL }
    ];
});

const typeItems = computed(() => [
    { title: t('debtsPage.filters.allTypes'), value: '' },
    ...LIABILITY_TYPES.map((value) => ({ title: t(`liabilitiesPage.types.${value}`), value }))
]);

const directionItems = computed(() => [
    { title: t('debtsPage.filters.allDirections'), value: '' },
    ...LOAN_DIRECTIONS.map((value) => ({ title: t(`personalLoansPage.directions.${value}`), value }))
]);

const filterCount = computed(() => {
    let count = filterStatus.value ? 1 : 0;
    if (tab.value === 'liabilities' && filterType.value) count += 1;
    if (tab.value === 'loans' && filterDirection.value) count += 1;
    return count;
});

function resetFilters() {
    patchQuery({ status: undefined, type: undefined, direction: undefined });
}

/* ---------- compteur ---------- */

const visibleCount = computed<number | null>(() => {
    const needle = queryString('q').trim();
    if (tab.value === 'liabilities') {
        if (!liabilitiesStore.initialized) return null;
        return needle ? liabilitiesStore.items.filter((item) => matchesLiabilitySearch(item, needle)).length : liabilitiesStore.totalCount;
    }
    if (tab.value === 'loans') {
        if (!loansStore.initialized) return null;
        return needle ? loansStore.items.filter((item) => matchesPersonalLoanSearch(item, needle)).length : loansStore.totalCount;
    }
    return null;
});

const countLabel = computed(() => {
    const count = visibleCount.value;
    if (!count) return null;
    const key = tab.value === 'loans' ? 'debtsPage.count.loans' : 'debtsPage.count.liabilities';
    return t(key, { count }, count);
});

/* ---------- création ---------- */

const acting = computed(() => (tab.value === 'liabilities' ? liabilitiesStore.acting : tab.value === 'loans' ? loansStore.acting : false));

const createLabel = computed(() => (tab.value === 'shared' ? t('sharedDebtsPage.createButton') : t('debtsPage.actions.create')));

function onCreate() {
    if (acting.value) return;
    panelRef.value?.openCreate();
}

useCreateFromQuery(onCreate, () => !acting.value && !!panelRef.value);

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <AppPageShell :title="t('debtsPage.title')" :subtitle="subtitle">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('debtsPage.tabs.label')">
                <RouterLink
                    v-for="item in tabs"
                    :key="item.tab"
                    :to="item.to"
                    class="su-tab"
                    :class="{ 'is-active': tab === item.tab }"
                    :aria-current="tab === item.tab ? 'page' : undefined"
                >
                    {{ item.label }}
                </RouterLink>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover debts-search--desktop">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="SEARCH_MAX"
                    :placeholder="searchPlaceholder"
                    :aria-label="searchPlaceholder"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('debtsPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="countLabel" class="su-toolbar__count debts-toolbar__count">{{ countLabel }}</span>
            <v-menu v-model="searchOpen" location="bottom start" :close-on-content-click="false" :offset="8" class="debts-search--mobile">
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="su-btn debts-search-btn debts-search--mobile"
                        :class="{ 'is-active': searchOpen || !!searchInput }"
                        v-bind="menuProps"
                        :aria-expanded="searchOpen"
                    >
                        <SearchIcon :size="16" stroke-width="1.6" />
                        {{ t('debtsPage.actions.search') }}
                    </button>
                </template>
                <v-sheet elevation="0" class="su-search su-search-pop">
                    <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                    <input
                        ref="searchFieldRef"
                        class="su-search__input"
                        type="search"
                        :value="searchInput"
                        :maxlength="SEARCH_MAX"
                        :placeholder="searchPlaceholder"
                        :aria-label="searchPlaceholder"
                        autocomplete="off"
                        @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="searchInput"
                        type="button"
                        class="su-search__orb"
                        :aria-label="t('debtsPage.actions.clearSearch')"
                        @click="clearSearch"
                    >
                        <XIcon :size="16" stroke-width="1.8" />
                    </button>
                </v-sheet>
            </v-menu>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('debtsPage.actions.filter')"
                    :min-width="280"
                    :count="filterCount"
                    :reset-disabled="!filterCount"
                    @reset="resetFilters"
                >
                    <div class="pa-3 d-flex flex-column ga-3 debts-filter-fields">
                        <AppSelect
                            v-if="tab === 'liabilities'"
                            v-model="filterType"
                            :items="typeItems"
                            :label="t('debtsPage.filters.type')"
                            hide-details
                        />
                        <AppSelect
                            v-if="tab === 'loans'"
                            v-model="filterDirection"
                            :items="directionItems"
                            :label="t('debtsPage.filters.direction')"
                            hide-details
                        />
                        <AppSelect v-model="filterStatus" :items="statusItems" :label="t('debtsPage.filters.status')" hide-details />
                    </div>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ createLabel }}
                </button>
            </div>
        </template>

        <LiabilitiesDirectory v-if="tab === 'liabilities'" ref="panelRef" />
        <PersonalLoansDirectory v-else-if="tab === 'loans'" ref="panelRef" />
        <SharedDebtsPanel v-else ref="panelRef" />
    </AppPageShell>
</template>

<style scoped>
/* onglets en liens (RouterLink) : pas de soulignement natif, seul l'onglet actif est souligné par le kit */
.su-tabs--links .su-tab {
    text-decoration: none;
}

/* bouton « Rechercher » (mobile) : actif = fond gris doux */
.debts-search-btn.is-active {
    background: var(--soft);
}

@media (max-width: 767px) {
    .debts-toolbar__count {
        display: none !important;
    }

    /* recherche toujours visible en pleine largeur, actions alignées à droite dessous */
    .debts-search--desktop {
        flex: 1 1 100% !important;
        max-width: 100% !important;
    }

    .debts-search--mobile {
        display: none !important;
    }
}

.debts-search--mobile {
    display: none;
}
</style>

<style>
@media (max-width: 767px) {
    .debts-filter-fields .app-select__legend {
        font-size: 11px;
    }

    .debts-filter-fields .app-select__control,
    .debts-filter-fields .app-select__ghost,
    .debts-filter-fields .app-select__input {
        font-size: 0.75rem;
    }
}
</style>
