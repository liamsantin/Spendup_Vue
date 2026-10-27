<script setup lang="ts">
/**
 * Immobilier : liste des biens (onglets Actifs · Cédés, recherche, Ajouter) ou fiche d’un bien
 * quand le chemin porte un `publicId` (`/app/patrimoine/immobilier/:id`).
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, PencilIcon, PlusIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import {
    REAL_ESTATE_NAME_MAX,
    REAL_ESTATE_PATHS,
    RealEstateDetail,
    RealEstateDirectory,
    activeRealEstateDetailTab,
    realEstateDetailTabs,
    realEstatePublicIdFromPath,
    type RealEstateDetailTab
} from '@/features/real-estate';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();

const directoryRef = ref<{ openCreate: () => void } | null>(null);
const detailRef = ref<{ openEdit: () => void } | null>(null);
const notFound = ref(false);

const detailId = computed(() => realEstatePublicIdFromPath(route.path));
const detailAsset = computed(() => (detailId.value ? assetsStore.findByPublicId(detailId.value) : null));
const detailTitle = computed(() => {
    if (notFound.value || !detailAsset.value) return t('realEstatePage.title');
    return t('realEstatePage.detailTitle', { name: detailAsset.value.name });
});
const detailTabs = computed(() => (notFound.value ? [] : realEstateDetailTabs()));
const activeDetailTab = computed(() => activeRealEstateDetailTab(route.query.tab));

const TAB_LABEL: Record<RealEstateDetailTab, string> = {
    informations: 'informations',
    lots: 'units',
    charges: 'charges',
    travaux: 'maintenance',
    documents: 'documents',
    baux: 'rentals'
};

function tabCount(tab: RealEstateDetailTab): number | null {
    const summary = detailAsset.value?.realEstate?.summary;
    if (!summary || tab === 'informations') return null;
    if (tab === 'lots') return summary.unitsCount;
    if (tab === 'charges') return summary.chargesCount;
    if (tab === 'travaux') return summary.maintenanceCount;
    if (tab === 'documents') return summary.documentsCount;
    return summary.rentalsCount;
}

function selectDetailTab(tab: RealEstateDetailTab) {
    if (tab === activeDetailTab.value) return;
    const query = { ...route.query };
    if (tab === detailTabs.value[0]) delete query.tab;
    else query.tab = tab;
    void router.replace({ path: route.path, query });
}

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const stateFilter = computed(() => (queryString('state') === 'sold' ? 'sold' : 'active'));

const searchInput = ref(queryString('q').slice(0, REAL_ESTATE_NAME_MAX));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const state = 'state' in patch ? patch.state : queryString('state') || undefined;
    if (q) next.q = q.slice(0, REAL_ESTATE_NAME_MAX);
    if (state === 'sold') next.state = 'sold';
    void router.replace({ path: REAL_ESTATE_PATHS.list, query: next });
}

function setState(state: 'active' | 'sold') {
    patchQuery({ state: state === 'sold' ? 'sold' : undefined });
}

function onSearchInput(value: string) {
    searchInput.value = value.slice(0, REAL_ESTATE_NAME_MAX);
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
    if (assetsStore.acting || detailId.value) return;
    directoryRef.value?.openCreate();
}

function onEdit() {
    detailRef.value?.openEdit();
}

function tabLabel(tab: RealEstateDetailTab) {
    return t(`realEstatePage.detail.tabs.${TAB_LABEL[tab]}`);
}

function backToList() {
    void router.push({ path: REAL_ESTATE_PATHS.list });
}

useCreateFromQuery(onCreate, () => !assetsStore.acting && !detailId.value);

watch(detailId, () => {
    notFound.value = false;
});

watch(
    () => queryString('q'),
    (value) => {
        if (searchTimer) return;
        const next = value.slice(0, REAL_ESTATE_NAME_MAX);
        if (next !== searchInput.value.trim() && next !== searchInput.value) searchInput.value = next;
    }
);

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <!-- ── fiche d’un bien ── -->
    <AppPageShell v-if="detailId" :key="`detail-${detailId}`" :title="detailTitle">
        <template #actions>
            <button type="button" class="su-btn" @click="backToList">
                <ArrowLeftIcon :size="16" stroke-width="1.6" />
                {{ t('realEstatePage.actions.back') }}
            </button>
            <button v-if="!notFound && detailAsset" type="button" class="su-btn su-btn--ink" :disabled="assetsStore.acting" @click="onEdit">
                <PencilIcon :size="16" stroke-width="1.6" />
                {{ t('realEstatePage.actions.edit') }}
            </button>
        </template>

        <template #hero-extra>
            <nav
                v-if="detailTabs.length"
                class="su-tabs su-tabs--links re-page__detail-tabs"
                :aria-label="t('realEstatePage.detail.tabs.label')"
            >
                <button
                    v-for="tab in detailTabs"
                    :key="tab"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': activeDetailTab === tab }"
                    :aria-current="activeDetailTab === tab ? 'page' : undefined"
                    @click="selectDetailTab(tab)"
                >
                    <span class="su-tab__label" :data-label="tabLabel(tab)">{{ tabLabel(tab) }}</span>
                    <span v-if="tabCount(tab) != null" class="re-page__tab-count">{{ tabCount(tab) }}</span>
                </button>
            </nav>
        </template>

        <div v-if="notFound" class="su-empty re-page__not-found">
            <p>{{ t('realEstatePage.errors.notFound') }}</p>
            <button type="button" class="su-link re-page__back" @click="backToList">{{ t('realEstatePage.actions.backToList') }}</button>
        </div>
        <RealEstateDetail v-else ref="detailRef" :asset-public-id="detailId" @not-found="notFound = true" />
    </AppPageShell>

    <!-- ── liste ── -->
    <AppPageShell v-else :title="t('realEstatePage.title')">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('realEstatePage.tabs.label')">
                <button type="button" class="su-tab" :class="{ 'is-active': stateFilter === 'active' }" @click="setState('active')">
                    <span class="su-tab__label" :data-label="t('realEstatePage.tabs.active')">{{ t('realEstatePage.tabs.active') }}</span>
                </button>
                <button type="button" class="su-tab" :class="{ 'is-active': stateFilter === 'sold' }" @click="setState('sold')">
                    <span class="su-tab__label" :data-label="t('realEstatePage.tabs.sold')">{{ t('realEstatePage.tabs.sold') }}</span>
                </button>
            </nav>
        </template>

        <template #toolbar>
            <label class="su-search su-search--discover re-page-search--desktop">
                <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="searchInput"
                    :maxlength="REAL_ESTATE_NAME_MAX"
                    :placeholder="t('realEstatePage.searchPlaceholder')"
                    :aria-label="t('realEstatePage.searchPlaceholder')"
                    autocomplete="off"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
                <button
                    v-if="searchInput"
                    type="button"
                    class="su-search__orb"
                    :aria-label="t('realEstatePage.actions.clearSearch')"
                    @click="clearSearch"
                >
                    <XIcon :size="16" stroke-width="1.8" />
                </button>
            </label>
            <div class="su-toolbar__actions">
                <button type="button" class="su-btn su-btn--ink" :disabled="assetsStore.acting" @click="onCreate">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('realEstatePage.actions.create') }}
                </button>
            </div>
        </template>

        <RealEstateDirectory ref="directoryRef" />
    </AppPageShell>
</template>

<style scoped>
.re-page__detail-tabs {
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
    margin-left: 0;
    justify-content: flex-start;
    flex-wrap: wrap;
}

.re-page__tab-count {
    margin-left: 4px;
    color: var(--gray);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
}

.re-page__not-found {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.re-page__back {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .re-page-search--desktop {
        flex: 1 1 100% !important;
        max-width: 100% !important;
    }
}
</style>
