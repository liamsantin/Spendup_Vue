<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import {
    ASSETS_PATHS,
    ASSET_NAME_MAX,
    AssetsDirectory,
    filterDirectoryAssets,
    formatAssetTotals,
    isAssetType,
    parseAssetStateFilter,
    useAssetsStore,
    type AssetStateFilter,
    type AssetType
} from '@/features/assets';
import { useUserSettingsStore } from '@/features/user-settings';

const SEARCH_DEBOUNCE_MS = 300;

/** Onglets de la page : l’immobilier a sa propre page. */
const TAB_TYPES: AssetType[] = ['vehicule', 'crypto', 'objetValeur', 'compteEpargne', 'other'];

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAssetsStore();
const settings = useUserSettingsStore();
const directoryRef = ref<{ openCreate: () => void } | null>(null);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const searchInput = ref(queryString('q').slice(0, ASSET_NAME_MAX));
const searchOpen = ref(false);
const searchFieldRef = ref<HTMLInputElement | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const filterType = computed({
    get: (): AssetType | '' => {
        const raw = queryString('type');
        return isAssetType(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ type: value || undefined })
});

const filterState = computed({
    get: (): AssetStateFilter => parseAssetStateFilter(queryString('state')),
    set: (value: string) => patchQuery({ state: value === 'sold' ? 'sold' : undefined })
});

const stateItems = computed(() => [
    { title: t('assetsPage.filters.active'), value: 'active' },
    { title: t('assetsPage.filters.sold'), value: 'sold' }
]);

const visibleItems = computed(() =>
    filterDirectoryAssets(store.items, { type: filterType.value || null, search: queryString('q').slice(0, ASSET_NAME_MAX) })
);
const visibleCount = computed(() => visibleItems.value.length);

const pageSubtitle = computed(() => {
    if (!store.initialized) return undefined;
    const count = visibleCount.value;
    const total = formatAssetTotals(visibleItems.value, settings.current.defaultCurrency, locale.value);
    return t('assetsPage.subtitle', { count, total }, count);
});

const filterCount = computed(() => (filterState.value === 'sold' ? 1 : 0));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const type = 'type' in patch ? patch.type : queryString('type') || undefined;
    const state = 'state' in patch ? patch.state : queryString('state') || undefined;
    if (q) next.q = q.slice(0, ASSET_NAME_MAX);
    if (type && isAssetType(type)) next.type = type;
    if (state === 'sold') next.state = 'sold';
    void router.replace({ path: route.path.startsWith(ASSETS_PATHS.list) ? route.path : ASSETS_PATHS.list, query: next });
}

function resetFilters() {
    filterState.value = 'active';
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, ASSET_NAME_MAX);
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

useCreateFromQuery(onCreate, () => !store.acting);

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, ASSET_NAME_MAX);
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
    <AppPageShell :title="t('assetsPage.title')" :subtitle="pageSubtitle">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('assetsPage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': !filterType }" @click="filterType = ''">
                    {{ t('assetsPage.tabs.all') }}
                </button>
                <button
                    v-for="type in TAB_TYPES"
                    :key="type"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': filterType === type }"
                    @click="filterType = type"
                >
                    {{ t(`assetsPage.tabs.${type}`) }}
                </button>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover assets-search--desktop">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="ASSET_NAME_MAX"
                    :placeholder="t('assetsPage.searchPlaceholder')"
                    :aria-label="t('assetsPage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('assetsPage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <span v-if="store.initialized && visibleCount" class="su-toolbar__count assets-toolbar__count">
                {{ t('assetsPage.count', { count: visibleCount }, visibleCount) }}
            </span>
            <v-menu v-model="searchOpen" location="bottom start" :close-on-content-click="false" :offset="8" class="assets-search--mobile">
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="su-btn assets-search-btn assets-search--mobile"
                        :class="{ 'is-active': searchOpen || !!searchInput }"
                        v-bind="menuProps"
                        :aria-expanded="searchOpen"
                    >
                        <SearchIcon :size="16" stroke-width="1.6" />
                        {{ t('assetsPage.actions.search') }}
                    </button>
                </template>
                <v-sheet elevation="0" class="su-search su-search-pop">
                    <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                    <input
                        ref="searchFieldRef"
                        class="su-search__input"
                        type="search"
                        :value="searchInput"
                        :maxlength="ASSET_NAME_MAX"
                        :placeholder="t('assetsPage.searchPlaceholder')"
                        :aria-label="t('assetsPage.searchPlaceholder')"
                        autocomplete="off"
                        @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    />
                    <button
                        v-if="searchInput"
                        type="button"
                        class="su-search__orb"
                        :aria-label="t('assetsPage.actions.clearSearch')"
                        @click="clearSearch"
                    >
                        <XIcon :size="16" stroke-width="1.8" />
                    </button>
                </v-sheet>
            </v-menu>
            <div class="su-toolbar__actions">
                <AppDropdownFilter
                    :label="t('assetsPage.actions.filter')"
                    :min-width="260"
                    :count="filterCount"
                    :reset-disabled="filterState === 'active'"
                    @reset="resetFilters"
                >
                    <div class="pa-3 d-flex flex-column ga-3 assets-filter-fields">
                        <AppSelect v-model="filterState" :items="stateItems" :label="t('assetsPage.filters.state')" hide-details />
                    </div>
                </AppDropdownFilter>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('assetsPage.actions.create') }}
                </button>
            </div>
        </template>

        <AssetsDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
/* bouton « Rechercher » (mobile) : actif = fond gris doux */
.assets-search-btn.is-active {
    background: var(--soft);
}

@media (max-width: 767px) {
    .assets-toolbar__count {
        display: none !important;
    }

    /* recherche toujours visible en pleine largeur, actions alignées à droite dessous */
    .assets-search--desktop {
        flex: 1 1 100% !important;
        max-width: 100% !important;
    }

    .assets-search--mobile {
        display: none !important;
    }
}

.assets-search--mobile {
    display: none;
}
</style>

<style>
@media (max-width: 767px) {
    .assets-filter-fields .app-select__legend {
        font-size: 11px;
    }

    .assets-filter-fields .app-select__control,
    .assets-filter-fields .app-select__ghost,
    .assets-filter-fields .app-select__input {
        font-size: 0.75rem;
    }
}
</style>
