<script setup lang="ts">
/**
 * Annuaire des actifs (hors immobilier dans la vue « Tous ») : grille de blocs, filtres d’URL
 * `type`, `state=active|sold` (défaut `active`) et recherche client `q`. La fiche s’ouvre sur
 * `/app/patrimoine/actifs/:publicId`.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { ASSETS_PATHS, assetDetailPath, assetPublicIdFromPath } from '@/features/assets/paths';
import { filterDirectoryAssets, isAssetType, parseAssetStateFilter } from '@/features/assets/format';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { ASSET_NAME_MAX, type Asset, type AssetType } from '@/features/assets/types';
import AssetListItem from '@/features/assets/components/list/AssetListItem.vue';
import AssetFormModal from '@/features/assets/components/modals/AssetFormModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAssetsStore();

const createOpen = ref(false);
const editTarget = ref<Asset | null>(null);
const deleteTarget = ref<Asset | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) {
            editTarget.value = null;
            clearDetailPath();
        }
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, ASSET_NAME_MAX) ?? null);
const filterType = computed<AssetType | null>(() => {
    const raw = queryString('type');
    return isAssetType(raw) ? raw : null;
});
const filterState = computed(() => parseAssetStateFilter(queryString('state')));

const visibleItems = computed(() => filterDirectoryAssets(store.items, { type: filterType.value, search: filterSearch.value }));

const emptyCopy = computed(() => {
    if (filterSearch.value) return t('assetsPage.empty.filtered');
    if (filterState.value === 'sold') return t('assetsPage.empty.sold');
    if (filterType.value) return t('assetsPage.empty.type');
    return t('assetsPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            type: filterType.value ?? undefined,
            active: filterState.value === 'active',
            force
        });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory(true).catch(() => undefined);
}

function clearDetailPath() {
    if (!assetPublicIdFromPath(route.path)) return;
    void router.replace({ path: ASSETS_PATHS.list, query: route.query });
}

async function openDetail(asset: Asset, pushPath = true) {
    try {
        const fresh = await store.fetchAsset(asset.publicId, true);
        editTarget.value = fresh ?? asset;
    } catch {
        editTarget.value = asset;
    }
    if (!pushPath) return;
    if (assetPublicIdFromPath(route.path) === asset.publicId) return;
    await router.replace({ path: assetDetailPath(asset.publicId), query: route.query });
}

async function syncDetailFromRoute() {
    const id = assetPublicIdFromPath(route.path);
    if (!id) return;
    if (editTarget.value?.publicId === id) return;
    try {
        const asset = await store.fetchAsset(id, true);
        if (asset) editTarget.value = asset;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('assetsPage.errors.notFound') : getErrorMessage(e);
        clearDetailPath();
    }
}

// Actif supprimé ailleurs (temps réel) pendant que sa fiche est ouverte : on la ferme.
const unsubscribeDeleted = store.subscribeToDeleted((publicId) => {
    if (editTarget.value?.publicId === publicId) {
        editTarget.value = null;
        clearDetailPath();
    }
});

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory()
        .then(() => syncDetailFromRoute())
        .catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted();
});

watch(
    () => [filterType.value, filterState.value] as const,
    () => {
        void loadDirectory().catch(() => undefined);
    }
);

watch(filterSearch, (search, previousSearch) => {
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) {
        searchRevealKey.value += 1;
    }
});

watch(
    () => route.path,
    () => {
        void syncDetailFromRoute();
    }
);

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

function requestDelete(asset: Asset) {
    deleteTarget.value = asset;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteAsset(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('assetsPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div>
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div
            v-else-if="!visibleItems.length"
            :key="`empty-${searchRevealKey}`"
            class="su-empty"
            :class="{ 'is-search-reveal': searchReveals }"
        >
            <p>{{ emptyCopy }}</p>
        </div>
        <div v-else class="assets-directory">
            <div :key="searchRevealKey" class="assets-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                <AssetListItem
                    v-for="(asset, index) in visibleItems"
                    :key="asset.publicId"
                    :asset="asset"
                    :acting="store.acting"
                    :style="{ '--i': index }"
                    @edit="openDetail"
                    @delete="requestDelete"
                />
            </div>
        </div>

        <AssetFormModal v-model="createOpen" :default-type="filterType" />
        <AssetFormModal v-model="editOpen" :asset="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('assetsPage.deleteModal.title')"
            :message="deleteTarget ? t('assetsPage.deleteModal.body', { name: deleteTarget.name }) : ''"
            :confirm-label="t('assetsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.assets-directory {
    width: 100%;
    min-width: 0;
    padding: 8px 0 24px;
}

/* trois blocs par rangée (2 sur tablette, 1 sur mobile), gouttière 32 px */
.assets-directory__list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px 32px;
    width: 100%;
}

@media (max-width: 1199.98px) {
    .assets-directory__list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .assets-directory {
        padding: 0 0 16px;
    }

    .assets-directory__list {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
    }
}
</style>
