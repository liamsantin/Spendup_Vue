<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon, ArrowsSortIcon } from 'vue-tabler-icons';
import AppFoldableTabs from '@/components/shared/tabs/AppFoldableTabs.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    TIER_NATURES,
    TIER_ROLES,
    TIER_SEARCH_MAX,
    TIER_SORTS,
    TIER_SORT_DEFAULT,
    TiersDirectory,
    isTierNature,
    isTierRole,
    isTierSort,
    matchesTierSearch,
    parseTierSort,
    useTiersStore
} from '@/features/tiers';
import { TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
import type { TierNature } from '@/features/tiers/types';
import TierCreateMenu from '@/features/tiers/components/TierCreateMenu.vue';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();
const directoryRef = ref<{ openCreate: (nature?: TierNature | null) => void } | null>(null);

const roleItems = computed(() => [
    { title: t('tiersPage.filters.allRoles'), value: '' },
    ...TIER_ROLES.map((value) => ({ title: t(`tiersPage.roles.${value}`), value }))
]);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, TIER_SEARCH_MAX));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const filterNature = computed({
    get: (): TierNature | '' => {
        const nature = queryString('nature');
        return isTierNature(nature) ? nature : '';
    },
    set: (value: string) => patchQuery({ nature: value || undefined })
});

const filterRole = computed({
    get: () => (isTierRole(queryString('role')) ? queryString('role') : ''),
    set: (value: string) => patchQuery({ role: value || undefined })
});

const listSort = computed({
    get: () => parseTierSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === TIER_SORT_DEFAULT ? undefined : value })
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((tier) => matchesTierSearch(tier, needle)).length;
});

const sortCount = computed(() => (listSort.value === TIER_SORT_DEFAULT ? 0 : 1));
const filterCount = computed(() => (filterRole.value ? 1 : 0));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const nature = 'nature' in patch ? patch.nature : queryString('nature') || undefined;
    const role = 'role' in patch ? patch.role : queryString('role') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (q) next.q = q.slice(0, TIER_SEARCH_MAX);
    if (nature && isTierNature(nature)) next.nature = nature;
    if (role && isTierRole(role)) next.role = role;
    if (sort && isTierSort(sort) && sort !== TIER_SORT_DEFAULT) next.sort = sort;
    void router.replace({ path: '/app/gestion/tiers', query: next });
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, TIER_SEARCH_MAX);
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

function onCreate(nature?: TierNature) {
    if (store.acting) return;
    const resolved = nature ?? (isTierNature(filterNature.value) ? filterNature.value : null);
    directoryRef.value?.openCreate(resolved);
}

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, TIER_SEARCH_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) {
            searchInput.value = next;
        }
    }
);
</script>

<template>
    <AppPageShell :title="t('tiersPage.title')" :subtitle="t('tiersPage.subtitle')">
        <template #tabs>
            <AppFoldableTabs :ariaLabel="t('tiersPage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': !filterNature }" @click="filterNature = ''">
                    <span class="su-tab__body">{{ t('tiersPage.tabs.all') }}</span>
                </button>
                <button
                    v-for="nature in TIER_NATURES"
                    :key="nature"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': filterNature === nature }"
                    @click="filterNature = nature"
                >
                    <span class="su-tab__body">
                        <component :is="TIER_NATURE_ICONS[nature]" :size="16" stroke-width="1.7" />
                        {{ t(`tiersPage.natures.${nature}`) }}
                    </span>
                </button>
            </AppFoldableTabs>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="TIER_SEARCH_MAX"
                    :placeholder="t('tiersPage.searchPlaceholder')"
                    :aria-label="t('tiersPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('tiersPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count">
                {{ t('tiersPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('tiersPage.actions.sort')"
                    :icon="ArrowsSortIcon"
                    :min-width="240"
                    close-on-content-click
                    :count="sortCount"
                    :reset-disabled="listSort === TIER_SORT_DEFAULT"
                    @reset="listSort = TIER_SORT_DEFAULT"
                >
                    <v-list class="py-0">
                        <v-list-item
                            v-for="value in TIER_SORTS"
                            :key="value"
                            :active="listSort === value"
                            color="primary"
                            @click="listSort = value"
                        >
                            <v-list-item-title>{{ t(`tiersPage.sort.${value}`) }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('tiersPage.actions.filter')"
                    :min-width="280"
                    :count="filterCount"
                    :reset-disabled="!filterRole"
                    @reset="filterRole = ''"
                >
                    <div class="pa-3 d-flex flex-column ga-3">
                        <AppSelect v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" hide-details />
                    </div>
                </AppDropdownFilter>
                <TierCreateMenu
                    v-if="!filterNature"
                    :label="t('tiersPage.actions.create')"
                    :disabled="store.acting"
                    @select="onCreate"
                />
                <button v-else type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate()">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('tiersPage.actions.create') }}
                </button>
            </div>
        </template>

        <TiersDirectory ref="directoryRef" />
    </AppPageShell>
</template>
