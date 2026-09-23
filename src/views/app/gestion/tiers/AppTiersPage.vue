<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { PlusIcon, SearchIcon, XIcon, ChevronDownIcon, CheckIcon, LayoutGridIcon, FileExportIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    TIER_NATURES,
    TIER_ROLES,
    TIER_SEARCH_MAX,
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
const { width: viewportWidth } = useDisplay();
const compactNotch = computed(() => viewportWidth.value < 768);
const directoryRef = ref<{ openCreate: (nature?: TierNature | null) => void; exportCsv: () => void } | null>(null);

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

const filterCount = computed(() => (filterRole.value ? 1 : 0));

const natureTabLabel = computed(() => (filterNature.value ? t(`tiersPage.natures.${filterNature.value}`) : t('tiersPage.tabs.all')));

const natureTabIcon = computed(() => (filterNature.value ? TIER_NATURE_ICONS[filterNature.value] : LayoutGridIcon));

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
    <AppPageShell class="tiers-page" :title="t('tiersPage.title')" :body-scroll="false">
        <section class="tiers-board">
            <div class="tiers-board__top">
            <div class="tiers-board__bar">
            <div class="tiers-board__filters">
            <v-menu v-model="natureMenuOpen" location="bottom start" :offset="8" scrim>
                <template #activator="{ props: menuProps }">
                    <nav class="tiers-nature-tabs" :aria-label="t('tiersPage.tabs.label')">
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
                        <CheckIcon v-if="filterNature === nature" class="tiers-nature-menu__check" :size="16" stroke-width="2" />
                    </button>
                </v-sheet>
            </v-menu>
            <AppDropdownFilter
                :label="t('tiersPage.filters.role')"
                :min-width="280"
                :count="filterCount"
                :reset-disabled="!filterRole"
                @reset="filterRole = ''"
            >
                <div class="pa-3 d-flex flex-column ga-3 tiers-filter-fields">
                    <AppSelect v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" hide-details />
                </div>
            </AppDropdownFilter>
            </div>
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
                scrim
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
            </div>
            <div class="tiers-board__notch">
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!store.items.length"
                    :aria-label="t('tiersPage.actions.export')"
                    @click="directoryRef?.exportCsv()"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="tiers-board__notch-label">{{ t('tiersPage.actions.export') }}</span>
                </button>
                <TierCreateMenu
                    v-if="!filterNature"
                    :compact="compactNotch"
                    :label="t('tiersPage.actions.create')"
                    :disabled="store.acting"
                    @select="onCreate"
                />
                <button
                    v-else
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting"
                    :aria-label="t('tiersPage.actions.create')"
                    @click="onCreate()"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="tiers-board__notch-label">{{ t('tiersPage.actions.create') }}</span>
                </button>
            </div>
            </div>

            <TiersDirectory ref="directoryRef" @sort="listSort = $event" />
        </section>
    </AppPageShell>
</template>

<style scoped>
.tiers-page :deep(.su-hero) {
    padding: 2px 6px 0;
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
}

.tiers-page :deep(.su-body) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    padding-top: 8px;
}

.tiers-board {
    --board-shell: rgba(255, 255, 255, 0.55);
    --board-card: #fffdf9;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
}

.tiers-board__top {
    flex: none;
    display: flex;
    align-items: stretch;
    min-width: 0;
}

.tiers-board__bar {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px 14px 12px 18px;
    background: var(--board-shell);
    border-radius: 28px 28px 0 0;
}

.tiers-board__bar::after {
    content: '';
    position: absolute;
    z-index: 1;
    right: -24px;
    bottom: 0;
    width: 24px;
    height: 24px;
    background: radial-gradient(circle at 100% 0, transparent 23px, var(--board-shell) 24px);
    pointer-events: none;
}

.tiers-board__notch {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 2px 16px 22px;
}

.tiers-board__notch :deep(.su-btn--ink) {
    height: 40px;
    padding: 0 16px;
    gap: 8px;
    border-radius: 20px;
    background: #fff;
    font-size: 0.82rem;
    font-weight: 550;
    color: var(--ink);
    box-shadow:
        0 10px 24px -16px rgba(16, 16, 20, 0.45),
        0 0 0 1px rgba(255, 255, 255, 0.9);
}

.tiers-page :deep(.tiers-panel) {
    overflow: hidden;
    background: var(--board-card);
    border-radius: 0 28px 28px 28px;
    box-shadow: 0 18px 44px -30px rgba(16, 16, 20, 0.38);
}

.tiers-board__filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.tiers-board__filters :deep(.su-btn),
.tiers-board .tiers-nature-trigger {
    height: 34px;
    padding: 0 14px;
    border-radius: 17px;
    background: #fff;
    font-size: 0.8rem;
    box-shadow: 0 1px 2px rgba(16, 16, 20, 0.06), 0 0 0 1px rgba(16, 16, 20, 0.05);
}

.tiers-board .tiers-nature-tabs {
    margin-left: 0;
}

.tiers-board .tiers-nature-trigger__pill {
    height: auto !important;
    padding: 0 !important;
    color: var(--ink) !important;
    background: transparent !important;
    box-shadow: none !important;
}

.tiers-board__bar :deep(.su-search--discover) {
    flex: 1 1 220px;
    width: auto;
    max-width: none;
    height: 34px;
    margin: 0;
    border-radius: 17px;
    background: #fff;
    border: 1px solid rgba(16, 16, 20, 0.05);
    box-shadow: 0 1px 2px rgba(16, 16, 20, 0.05);
    backdrop-filter: none;
}

.tiers-board__notch :deep(.su-btn--ink):hover:not(:disabled) {
    background: #fff;
}

@media (max-width: 767px) {
    .tiers-page :deep(.su-body) {
        padding: 0;
    }

    .tiers-board__bar {
        flex-wrap: nowrap;
        gap: 6px;
        border-radius: 22px 22px 0 0;
        padding: 6px 4px 6px 6px;
    }

    .tiers-board__filters {
        flex-wrap: nowrap;
        gap: 6px;
        min-width: 0;
    }

    .tiers-board__filters :deep(.su-btn),
    .tiers-board .tiers-nature-trigger {
        padding: 0 10px;
    }

    .tiers-board__notch {
        gap: 6px;
        padding: 2px 0 8px 12px;
    }

    .tiers-board__notch-label {
        display: none;
    }

    .tiers-board__notch :deep(.su-btn--ink) {
        width: 38px;
        height: 38px;
        padding: 0;
    }

    .tiers-page :deep(.tiers-directory) {
        padding: 0 4px 4px;
    }

    .tiers-page :deep(.tiers-panel) {
        border-radius: 0 22px 22px 22px;
    }
}

.tiers-search-btn {
    width: 34px;
    padding: 0;
    flex: none;
}

.tiers-board__bar .tiers-search-btn {
    height: 34px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(16, 16, 20, 0.06), 0 0 0 1px rgba(16, 16, 20, 0.05);
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

@media (max-width: 1199px) {
    .tiers-search--desktop {
        display: none !important;
    }
}

@media (max-width: 767px) {
    .tiers-toolbar__count,
    .tiers-tabs--desktop {
        display: none !important;
    }

    .tiers-search-btn {
        margin-right: auto;
    }
}

@media (min-width: 1200px) {
    .tiers-search--mobile {
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
