<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon, ArrowsSortIcon, ChevronDownIcon, CheckIcon, LayoutGridIcon } from 'vue-tabler-icons';
import AppFoldableTabs from '@/components/shared/tabs/AppFoldableTabs.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppSortChoices from '@/components/shared/dropdown-filter/AppSortChoices.vue';
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
const searchOpen = ref(false);
const natureMenuOpen = ref(false);
const searchFieldRef = ref<HTMLInputElement | null>(null);
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

const natureTabLabel = computed(() =>
    filterNature.value ? t(`tiersPage.natures.${filterNature.value}`) : t('tiersPage.tabs.all')
);

const natureTabIcon = computed(() =>
    filterNature.value ? TIER_NATURE_ICONS[filterNature.value] : LayoutGridIcon
);

function selectNature(value: TierNature | '') {
    filterNature.value = value;
    natureMenuOpen.value = false;
}

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

watch(searchOpen, (open) => {
    if (!open) return;
    void nextTick(() => searchFieldRef.value?.focus());
});
</script>

<template>
    <AppPageShell class="tiers-page" :title="t('tiersPage.title')" :subtitle="t('tiersPage.subtitle')">
        <template #tabs>
            <AppFoldableTabs class="su-tabs--links tiers-tabs--desktop" :ariaLabel="t('tiersPage.tabs.label')">
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
            <v-menu v-model="natureMenuOpen" location="bottom end" :offset="12" scrim class="tiers-tabs--mobile">
                <template #activator="{ props: menuProps }">
                    <nav class="tiers-tabs--mobile tiers-nature-tabs" :aria-label="t('tiersPage.tabs.label')">
                        <button
                            type="button"
                            class="tiers-nature-trigger"
                            v-bind="menuProps"
                            :aria-expanded="natureMenuOpen"
                            :aria-haspopup="true"
                        >
                            <span
                                class="su-tab is-active tiers-nature-trigger__pill"
                                :class="filterNature ? `is-${filterNature}` : 'is-all'"
                            >
                                <span class="su-tab__body">
                                    <component :is="natureTabIcon" :size="16" stroke-width="1.7" />
                                    {{ natureTabLabel }}
                                </span>
                            </span>
                            <ChevronDownIcon
                                class="tiers-nature-menu__chevron"
                                :class="{ 'is-open': natureMenuOpen }"
                                :size="16"
                                stroke-width="1.8"
                            />
                        </button>
                    </nav>
                </template>
                <v-sheet elevation="0" class="su-menu tiers-nature-menu">
                    <p class="tiers-nature-menu__label">{{ t('tiersPage.tabs.label') }}</p>
                    <button
                        type="button"
                        class="tiers-nature-menu__item is-all"
                        :class="{ 'is-active': !filterNature }"
                        @click="selectNature('')"
                    >
                        <span class="tiers-nature-menu__icon">
                            <LayoutGridIcon :size="18" stroke-width="1.75" />
                        </span>
                        <span class="tiers-nature-menu__name">{{ t('tiersPage.tabs.all') }}</span>
                        <CheckIcon v-if="!filterNature" class="tiers-nature-menu__check" :size="16" stroke-width="2" />
                    </button>
                    <button
                        v-for="nature in TIER_NATURES"
                        :key="nature"
                        type="button"
                        class="tiers-nature-menu__item"
                        :class="[`is-${nature}`, { 'is-active': filterNature === nature }]"
                        @click="selectNature(nature)"
                    >
                        <span class="tiers-nature-menu__icon">
                            <component :is="TIER_NATURE_ICONS[nature]" :size="18" stroke-width="1.75" />
                        </span>
                        <span class="tiers-nature-menu__name">{{ t(`tiersPage.natures.${nature}`) }}</span>
                        <CheckIcon
                            v-if="filterNature === nature"
                            class="tiers-nature-menu__check"
                            :size="16"
                            stroke-width="2"
                        />
                    </button>
                </v-sheet>
            </v-menu>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover tiers-search--desktop">
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
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count tiers-toolbar__count">
                {{ t('tiersPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <v-menu
                v-model="searchOpen"
                location="bottom start"
                :close-on-content-click="false"
                :offset="8"
                class="tiers-search--mobile"
            >
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="su-btn tiers-search-btn tiers-search--mobile"
                        :class="{ 'is-active': searchOpen || !!searchInput }"
                        v-bind="menuProps"
                        :aria-label="t('tiersPage.actions.search')"
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
                </v-sheet>
            </v-menu>
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
                    <AppSortChoices v-model="listSort" :items="TIER_SORTS" :label-for="(value) => t(`tiersPage.sort.${value}`)" />
                </AppDropdownFilter>
                <AppDropdownFilter
                    :label="t('tiersPage.actions.filter')"
                    :min-width="280"
                    :count="filterCount"
                    :reset-disabled="!filterRole"
                    @reset="filterRole = ''"
                >
                    <div class="pa-3 d-flex flex-column ga-3 tiers-filter-fields">
                        <AppSelect v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" hide-details />
                    </div>
                </AppDropdownFilter>
                <TierCreateMenu v-if="!filterNature" :label="t('tiersPage.actions.create')" :disabled="store.acting" @select="onCreate" />
                <button v-else type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate()">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('tiersPage.actions.create') }}
                </button>
            </div>
        </template>

        <TiersDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
.tiers-search-btn {
    width: 34px;
    padding: 0;
    flex: none;
}

.tiers-search-btn.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: none;
}

.tiers-nature-menu__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.28s var(--ease, ease);
}

.tiers-nature-menu__chevron.is-open {
    transform: rotate(180deg);
}

.tiers-nature-tabs {
    display: flex;
    margin-left: auto;
}

.tiers-nature-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.tiers-nature-trigger__pill {
    --nature-tint: rgb(var(--v-theme-primary));
    pointer-events: none;
    height: 32px;
    color: var(--nature-tint) !important;
    background: color-mix(in srgb, var(--nature-tint) 14%, transparent) !important;
    box-shadow: none !important;
}

.tiers-nature-trigger__pill.is-person {
    --nature-tint: rgb(var(--v-theme-success));
}

.tiers-nature-trigger__pill.is-organization {
    --nature-tint: rgb(var(--v-theme-secondary));
}

.tiers-nature-trigger__pill.is-administration {
    --nature-tint: rgb(var(--v-theme-warning));
}

.tiers-nature-trigger__pill.is-unknown {
    --nature-tint: var(--ink-muted);
}

.tiers-nature-trigger__pill .su-tab__body {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

@media (max-width: 767px) {
    .tiers-page :deep(.su-hero > p) {
        display: none;
    }

    .tiers-search--desktop,
    .tiers-toolbar__count,
    .tiers-tabs--desktop {
        display: none !important;
    }

    .tiers-search-btn {
        margin-right: auto;
    }
}

@media (min-width: 768px) {
    .tiers-search--mobile,
    .tiers-tabs--mobile {
        display: none;
    }
}
</style>

<!-- Menu filtre téléporté hors du scoped : styles mobiles dédiés. -->
<style>
@media (max-width: 767px) {
    .tiers-filter-fields .app-select__legend {
        font-size: 11px;
    }

    .tiers-filter-fields .app-select__control,
    .tiers-filter-fields .app-select__ghost,
    .tiers-filter-fields .app-select__input {
        font-size: 0.75rem;
    }
}

.tiers-nature-menu.su-menu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: min(280px, calc(100vw - 24px));
    padding: 10px 8px 8px !important;
}

.tiers-nature-menu__label {
    margin: 2px 10px 8px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.tiers-nature-menu__item {
    --nature-tint: rgb(var(--v-theme-primary));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 8px 10px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s var(--ease, ease);
}

.tiers-nature-menu__item.is-person {
    --nature-tint: rgb(var(--v-theme-success));
}

.tiers-nature-menu__item.is-organization {
    --nature-tint: rgb(var(--v-theme-secondary));
}

.tiers-nature-menu__item.is-administration {
    --nature-tint: rgb(var(--v-theme-warning));
}

.tiers-nature-menu__item.is-unknown {
    --nature-tint: var(--ink-muted);
}

.tiers-nature-menu__item:hover,
.tiers-nature-menu__item:focus-visible {
    background: color-mix(in srgb, var(--nature-tint) 10%, transparent);
    outline: none;
}

.tiers-nature-menu__item.is-active {
    background: color-mix(in srgb, var(--nature-tint) 14%, transparent);
}

.tiers-nature-menu__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: color-mix(in srgb, var(--nature-tint) 16%, var(--surface-raised));
    color: var(--nature-tint);
}

.tiers-nature-menu__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.9rem;
    font-weight: 620;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.tiers-nature-menu__check {
    flex: none;
    color: var(--nature-tint);
}
</style>
