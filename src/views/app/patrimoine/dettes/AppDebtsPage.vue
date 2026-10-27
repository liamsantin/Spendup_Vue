<script setup lang="ts">
/**
 * Page Dettes : trois onglets de module (Passifs · Prêts · Entre amis), un chemin par onglet.
 * Recherche, filtres et bouton Ajouter pilotent le panneau de l’onglet courant via la query.
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, PencilIcon, PlusIcon, ProgressCheckIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
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
    LiabilityDetail,
    debtsPathForTab,
    debtsTabFromPath,
    isLiabilityStatus,
    isLiabilityType,
    liabilityPublicIdFromPath,
    matchesLiabilitySearch,
    personalLoanPublicIdFromPath,
    sharedDebtPublicIdFromPath,
    useLiabilitiesStore,
    type DebtsTab
} from '@/features/liabilities';
import {
    LOAN_DIRECTIONS,
    LOAN_STATUSES,
    LOAN_STATUS_ALL,
    PersonalLoanDetail,
    PersonalLoansDirectory,
    isLoanDirection,
    isLoanStatus,
    matchesPersonalLoanSearch,
    usePersonalLoansStore
} from '@/features/personal-loans';
import SharedDebtDetail from '@/features/shared-debts/components/SharedDebtDetail.vue';
import SharedDebtsPanel from '@/features/shared-debts/components/SharedDebtsPanel.vue';
import {
    SHARED_DEBT_STATUSES,
    canCancelSharedDebt,
    canDeleteSharedDebt,
    canEditSharedDebt,
    canSettleSharedDebt,
    isSharedDebtStatus,
    useSharedDebtsStore
} from '@/features/shared-debts';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX = LIABILITY_NAME_MAX;
/** Clés de query propres à chaque onglet (les autres sont conservées telles quelles). */
const FILTER_KEYS = ['q', 'status', 'type', 'direction'] as const;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const liabilitiesStore = useLiabilitiesStore();
const loansStore = usePersonalLoansStore();
const sharedStore = useSharedDebtsStore();
const panelRef = ref<{ openCreate: () => void } | null>(null);
const detailRef = ref<{
    openEdit: () => void;
    openRemaining?: () => void;
    openSettle?: () => void;
    openCancel?: () => void;
    openDelete?: () => void;
} | null>(null);
const notFound = ref(false);

const liabilityId = computed(() => liabilityPublicIdFromPath(route.path));
const loanId = computed(() => personalLoanPublicIdFromPath(route.path));
const sharedId = computed(() => sharedDebtPublicIdFromPath(route.path));
const detailKind = computed<DebtsTab | null>(() => {
    if (liabilityId.value) return 'liabilities';
    if (loanId.value) return 'loans';
    if (sharedId.value) return 'shared';
    return null;
});
const detailLiability = computed(() => (liabilityId.value ? liabilitiesStore.findByPublicId(liabilityId.value) : null));
const detailLoan = computed(() => (loanId.value ? loansStore.findByPublicId(loanId.value) : null));
const detailShared = computed(() => (sharedId.value ? sharedStore.findByPublicId(sharedId.value) : null));

const detailTitle = computed(() => {
    if (notFound.value || !detailKind.value) return t('debtsPage.title');
    if (detailKind.value === 'liabilities') {
        return detailLiability.value ? t('debtsPage.detailTitle.liabilities', { name: detailLiability.value.name }) : t('debtsPage.title');
    }
    if (detailKind.value === 'loans') {
        const name = detailLoan.value?.label?.trim() || detailLoan.value?.counterpartName?.trim();
        return name ? t('debtsPage.detailTitle.loans', { name }) : t('debtsPage.title');
    }
    return detailShared.value ? t('debtsPage.detailTitle.shared', { name: detailShared.value.label }) : t('debtsPage.title');
});

const detailNotFound = computed(() => {
    if (detailKind.value === 'loans') return t('personalLoansPage.errors.notFound');
    if (detailKind.value === 'shared') return t('sharedDebtsPage.errors.notFound');
    return t('liabilitiesPage.errors.notFound');
});

const showEdit = computed(() => {
    if (notFound.value) return false;
    if (detailKind.value === 'liabilities') return !!detailLiability.value;
    if (detailKind.value === 'loans') return !!detailLoan.value;
    return !!detailShared.value && canEditSharedDebt(detailShared.value);
});

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
    if (acting.value || detailKind.value) return;
    panelRef.value?.openCreate();
}

function listQuery(): Record<string, string> {
    const next: Record<string, string> = {};
    for (const key of ['q', 'status', 'type', 'direction', 'role'] as const) {
        const value = queryString(key);
        if (value) next[key] = key === 'q' ? value.slice(0, SEARCH_MAX) : value;
    }
    return next;
}

function backToList() {
    const kind = detailKind.value ?? 'liabilities';
    void router.push({ path: debtsPathForTab(kind), query: listQuery() });
}

useCreateFromQuery(onCreate, () => !acting.value && !detailKind.value && !!panelRef.value);

watch(detailKind, () => {
    notFound.value = false;
});

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <AppPageShell v-if="detailKind" :key="`detail-${detailKind}-${liabilityId || loanId || sharedId}`" :title="detailTitle">
        <template #actions>
            <button type="button" class="su-btn" @click="backToList">
                <ArrowLeftIcon :size="16" stroke-width="1.6" />
                {{ t('debtsPage.actions.back') }}
            </button>
            <button
                v-if="detailShared && canDeleteSharedDebt(detailShared)"
                type="button"
                class="su-btn su-btn--danger"
                :disabled="sharedStore.acting"
                @click="detailRef?.openDelete?.()"
            >
                {{ t('sharedDebtsPage.actions.delete') }}
            </button>
            <button
                v-if="detailShared && canCancelSharedDebt(detailShared)"
                type="button"
                class="su-btn su-btn--warn"
                :disabled="sharedStore.acting"
                @click="detailRef?.openCancel?.()"
            >
                {{ t('sharedDebtsPage.actions.cancel') }}
            </button>
            <button
                v-if="detailLiability && detailLiability.status !== 'annule'"
                type="button"
                class="su-btn"
                :disabled="liabilitiesStore.acting"
                @click="detailRef?.openRemaining?.()"
            >
                <ProgressCheckIcon :size="16" stroke-width="1.6" />
                {{ t('liabilitiesPage.actions.updateRemaining') }}
            </button>
            <button
                v-if="showEdit"
                type="button"
                class="su-btn"
                :class="{ 'su-btn--ink': !detailShared || !canSettleSharedDebt(detailShared) }"
                :disabled="acting || sharedStore.acting"
                @click="detailRef?.openEdit()"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
                {{ t('debtsPage.actions.edit') }}
            </button>
            <button
                v-if="detailShared && canSettleSharedDebt(detailShared)"
                type="button"
                class="su-btn su-btn--ink"
                :disabled="sharedStore.acting"
                @click="detailRef?.openSettle?.()"
            >
                {{ t('sharedDebtsPage.actions.settle') }}
            </button>
        </template>

        <template #hero-extra>
            <nav v-if="!notFound" class="su-tabs su-tabs--links debts-page__detail-tabs" :aria-label="t('debtsPage.detail.tabs.label')">
                <button type="button" class="su-tab is-active" aria-current="page">
                    <span class="su-tab__label" :data-label="t('debtsPage.detail.tabs.informations')">{{
                        t('debtsPage.detail.tabs.informations')
                    }}</span>
                </button>
            </nav>
        </template>

        <div v-if="notFound" class="su-empty debts-page__not-found">
            <p>{{ detailNotFound }}</p>
            <button type="button" class="su-link debts-page__back" @click="backToList">{{ t('debtsPage.actions.backToList') }}</button>
        </div>
        <LiabilityDetail v-else-if="liabilityId" ref="detailRef" :liability-public-id="liabilityId" @not-found="notFound = true" />
        <PersonalLoanDetail v-else-if="loanId" ref="detailRef" :loan-public-id="loanId" @not-found="notFound = true" />
        <SharedDebtDetail
            v-else-if="sharedId"
            ref="detailRef"
            :shared-debt-public-id="sharedId"
            @not-found="notFound = true"
            @deleted="backToList"
        />
    </AppPageShell>

    <AppPageShell v-else :title="t('debtsPage.title')" :subtitle="subtitle">
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
                    <span class="su-tab__label" :data-label="item.label">{{ item.label }}</span>
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
.debts-page__detail-tabs {
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
    margin-left: 0;
    justify-content: flex-start;
    flex-wrap: wrap;
}

.debts-page__not-found {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.debts-page__back {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

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
