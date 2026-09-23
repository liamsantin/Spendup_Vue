<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    SAVINGS_GOALS_PATHS,
    SavingsGoalsDirectory,
    SAVINGS_GOAL_NAME_MAX,
    isSavingsGoalStatus,
    canLinkSavingsGoalAccount,
    useSavingsGoalsStore
} from '@/features/savings-goals';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { SavingsGoalStatus } from '@/features/savings-goals/types';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSavingsGoalsStore();
const accountsStore = useAccountsStore();
const directoryRef = ref<{ openCreate: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, SAVINGS_GOAL_NAME_MAX));
const searchOpen = ref(false);
const searchFieldRef = ref<HTMLInputElement | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const filterStatus = computed({
    get: (): SavingsGoalStatus | '' => {
        const raw = queryString('status');
        return isSavingsGoalStatus(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ status: value || undefined })
});

const filterAccount = computed({
    get: () => queryString('account'),
    set: (value: string) => patchQuery({ account: value || undefined })
});

const accountItems = computed(() => {
    const none = [{ title: t('savingsGoalsPage.filters.allAccounts'), value: '' }];
    const owned = accountsStore.accounts
        .filter((item) => canLinkSavingsGoalAccount(item) || item.publicId === filterAccount.value)
        .map((item) => ({ title: item.name, value: item.publicId }));
    return [...none, ...owned];
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((goal) => goal.name.toLowerCase().includes(needle.toLowerCase())).length;
});

const filterCount = computed(() => (filterAccount.value ? 1 : 0));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const status = 'status' in patch ? patch.status : queryString('status') || undefined;
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    if (q) next.q = q.slice(0, SAVINGS_GOAL_NAME_MAX);
    if (status && isSavingsGoalStatus(status)) next.status = status;
    if (account) next.account = account;
    void router.replace({ path: route.path.startsWith(SAVINGS_GOALS_PATHS.list) ? route.path : SAVINGS_GOALS_PATHS.list, query: next });
}

function resetFilters() {
    filterAccount.value = '';
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, SAVINGS_GOAL_NAME_MAX);
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

function onCreate() {
    if (store.acting) return;
    directoryRef.value?.openCreate();
}

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, SAVINGS_GOAL_NAME_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) {
            searchInput.value = next;
        }
    }
);

watch(searchOpen, (open) => {
    if (!open) return;
    void nextTick(() => searchFieldRef.value?.focus());
});

if (!accountsStore.initialized) {
    void accountsStore.loadAccounts().catch(() => undefined);
}
</script>

<template>
    <AppPageShell :title="t('savingsGoalsPage.title')">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('savingsGoalsPage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': !filterStatus }" @click="filterStatus = ''">
                    {{ t('savingsGoalsPage.tabs.all') }}
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': filterStatus === 'active' }" @click="filterStatus = 'active'">
                    {{ t('savingsGoalsPage.tabs.active') }}
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': filterStatus === 'atteint' }" @click="filterStatus = 'atteint'">
                    {{ t('savingsGoalsPage.tabs.atteint') }}
                </button>
                <button
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': filterStatus === 'abandonne' }"
                    @click="filterStatus = 'abandonne'"
                >
                    {{ t('savingsGoalsPage.tabs.abandonne') }}
                </button>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover savings-goals-search--desktop">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="SAVINGS_GOAL_NAME_MAX"
                    :placeholder="t('savingsGoalsPage.searchPlaceholder')"
                    :aria-label="t('savingsGoalsPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('savingsGoalsPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count savings-goals-toolbar__count">
                {{ t('savingsGoalsPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <v-menu
                v-model="searchOpen"
                location="bottom start"
                :close-on-content-click="false"
                :offset="8"
                class="savings-goals-search--mobile"
            >
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="su-btn savings-goals-search-btn savings-goals-search--mobile"
                        :class="{ 'is-active': searchOpen || !!searchInput }"
                        v-bind="menuProps"
                        :aria-expanded="searchOpen"
                    >
                        <SearchIcon :size="16" stroke-width="1.6" />
                        {{ t('savingsGoalsPage.actions.search') }}
                    </button>
                </template>
                <v-sheet elevation="0" class="su-search su-search-pop">
                    <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                    <input
                        ref="searchFieldRef"
                        class="su-search__input"
                        type="search"
                        :value="searchInput"
                        :maxlength="SAVINGS_GOAL_NAME_MAX"
                        :placeholder="t('savingsGoalsPage.searchPlaceholder')"
                        :aria-label="t('savingsGoalsPage.searchPlaceholder')"
                        autocomplete="off"
                        @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="searchInput"
                        type="button"
                        class="su-search__orb"
                        :aria-label="t('savingsGoalsPage.actions.clearSearch')"
                        @click="clearSearch"
                    >
                        <XIcon :size="16" stroke-width="1.8" />
                    </button>
                </v-sheet>
            </v-menu>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('savingsGoalsPage.actions.filter')"
                    :min-width="280"
                    :count="filterCount"
                    :reset-disabled="!filterAccount"
                    @reset="resetFilters"
                >
                    <div class="pa-3 d-flex flex-column ga-3 savings-goals-filter-fields">
                        <AppSelect
                            v-model="filterAccount"
                            :items="accountItems"
                            :label="t('savingsGoalsPage.filters.account')"
                            searchable
                            hide-details
                        />
                    </div>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('savingsGoalsPage.actions.create') }}
                </button>
            </div>
        </template>

        <SavingsGoalsDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
.savings-goals-search-btn.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: none;
}

@media (max-width: 767px) {
    .savings-goals-search--desktop,
    .savings-goals-toolbar__count {
        display: none !important;
    }
}

@media (min-width: 768px) {
    .savings-goals-search--mobile {
        display: none;
    }
}
</style>

<style>
@media (max-width: 767px) {
    .savings-goals-filter-fields .app-select__legend {
        font-size: 11px;
    }

    .savings-goals-filter-fields .app-select__control,
    .savings-goals-filter-fields .app-select__ghost,
    .savings-goals-filter-fields .app-select__input {
        font-size: 0.75rem;
    }
}
</style>
