<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { BUDGETS_PATHS, BudgetsDirectory, isBudgetPeriode, BUDGET_NAME_MAX, BUDGET_PERIODES, useBudgetsStore } from '@/features/budgets';
import { categorySelectItems } from '@/features/categories/payload';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import type { BudgetPeriode } from '@/features/budgets/types';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const directoryRef = ref<{ openCreate: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, BUDGET_NAME_MAX));
const searchOpen = ref(false);
const searchFieldRef = ref<HTMLInputElement | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const filterStatus = computed({
    get: () => {
        const raw = queryString('status');
        return raw === 'active' || raw === 'paused' ? raw : '';
    },
    set: (value: string) => patchQuery({ status: value || undefined })
});

const filterPeriode = computed({
    get: (): BudgetPeriode | '' => {
        const raw = queryString('periode');
        return isBudgetPeriode(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ periode: value || undefined })
});

const filterCategory = computed({
    get: () => queryString('category'),
    set: (value: string) => patchQuery({ category: value || undefined })
});

const periodeItems = computed(() => [
    { title: t('budgetsPage.filters.allPeriodes'), value: '' },
    ...BUDGET_PERIODES.map((value) => ({ title: t(`budgetsPage.periodes.${value}`), value }))
]);

const categoryItems = computed(() => {
    const allowed = new Set(['depense', 'mixte']);
    const roots = categoriesStore.items.filter((item) => allowed.has(item.type));
    const filtered = roots.map((root) => ({
        ...root,
        children: (root.children ?? []).filter((child) => allowed.has(child.type))
    }));
    return categorySelectItems(filtered, { noneTitle: t('budgetsPage.filters.allCategories') });
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((budget) => budget.name.toLowerCase().includes(needle.toLowerCase())).length;
});

const filterCount = computed(() => (filterPeriode.value ? 1 : 0) + (filterCategory.value ? 1 : 0));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const status = 'status' in patch ? patch.status : queryString('status') || undefined;
    const periode = 'periode' in patch ? patch.periode : queryString('periode') || undefined;
    const category = 'category' in patch ? patch.category : queryString('category') || undefined;
    if (q) next.q = q.slice(0, BUDGET_NAME_MAX);
    if (status === 'active' || status === 'paused') next.status = status;
    if (periode && isBudgetPeriode(periode)) next.periode = periode;
    if (category) next.category = category;
    void router.replace({ path: route.path.startsWith(BUDGETS_PATHS.list) ? route.path : BUDGETS_PATHS.list, query: next });
}

function resetFilters() {
    filterPeriode.value = '';
    filterCategory.value = '';
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, BUDGET_NAME_MAX);
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
        const next = value.slice(0, BUDGET_NAME_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) {
            searchInput.value = next;
        }
    }
);

watch(searchOpen, (open) => {
    if (!open) return;
    void nextTick(() => searchFieldRef.value?.focus());
});

if (!categoriesStore.initialized) {
    void categoriesStore.loadList().catch(() => undefined);
}
</script>

<template>
    <AppPageShell :title="t('budgetsPage.title')">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('budgetsPage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': !filterStatus }" @click="filterStatus = ''">
                    {{ t('budgetsPage.tabs.all') }}
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': filterStatus === 'active' }" @click="filterStatus = 'active'">
                    {{ t('budgetsPage.tabs.active') }}
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': filterStatus === 'paused' }" @click="filterStatus = 'paused'">
                    {{ t('budgetsPage.tabs.paused') }}
                </button>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover budgets-search--desktop">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="BUDGET_NAME_MAX"
                    :placeholder="t('budgetsPage.searchPlaceholder')"
                    :aria-label="t('budgetsPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('budgetsPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count budgets-toolbar__count">
                {{ t('budgetsPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <v-menu
                v-model="searchOpen"
                location="bottom start"
                :close-on-content-click="false"
                :offset="8"
                class="budgets-search--mobile"
            >
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="su-btn budgets-search-btn budgets-search--mobile"
                        :class="{ 'is-active': searchOpen || !!searchInput }"
                        v-bind="menuProps"
                        :aria-label="t('budgetsPage.searchPlaceholder')"
                        :aria-expanded="searchOpen"
                    >
                        <SearchIcon :size="16" stroke-width="1.6" />
                    </button>
                </template>
                <v-sheet elevation="0" class="su-search su-search-pop">
                    <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                    <input
                        ref="searchFieldRef"
                        class="su-search__input"
                        type="search"
                        :value="searchInput"
                        :maxlength="BUDGET_NAME_MAX"
                        :placeholder="t('budgetsPage.searchPlaceholder')"
                        :aria-label="t('budgetsPage.searchPlaceholder')"
                        autocomplete="off"
                        @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="searchInput"
                        type="button"
                        class="su-search__orb"
                        :aria-label="t('budgetsPage.actions.clearSearch')"
                        @click="clearSearch"
                    >
                        <XIcon :size="16" stroke-width="1.8" />
                    </button>
                </v-sheet>
            </v-menu>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('budgetsPage.actions.filter')"
                    :min-width="280"
                    :count="filterCount"
                    :reset-disabled="!filterPeriode && !filterCategory"
                    @reset="resetFilters"
                >
                    <div class="pa-3 d-flex flex-column ga-3">
                        <AppSelect v-model="filterPeriode" :items="periodeItems" :label="t('budgetsPage.filters.periode')" hide-details />
                        <AppSelect
                            v-model="filterCategory"
                            :items="categoryItems"
                            :label="t('budgetsPage.filters.category')"
                            searchable
                            hide-details
                        />
                    </div>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('budgetsPage.actions.create') }}
                </button>
            </div>
        </template>

        <BudgetsDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
.budgets-search-btn {
    width: 34px;
    min-width: 34px;
    padding: 0;
    border-radius: 50%;
}

.budgets-search-btn.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: none;
}

@media (max-width: 767px) {
    .budgets-search--desktop,
    .budgets-toolbar__count {
        display: none !important;
    }
}

@media (min-width: 768px) {
    .budgets-search--mobile {
        display: none;
    }
}
</style>
