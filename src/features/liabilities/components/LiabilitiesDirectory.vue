<script setup lang="ts">
/**
 * Onglet « Passifs » : grille de blocs, filtres lus dans la query (`status` défaut `active`, `type`, `q`).
 * Un clic ouvre la fiche ; « Modifier » ouvre cette fiche avec la modale de formulaire.
 * `openCreate()` exposé pour le bouton Ajouter de la page.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAssetsStore } from '@/features/assets';
import { liabilityDetailPath } from '@/features/liabilities/paths';
import { LIABILITY_STATUS_ALL, isLiabilityStatus, isLiabilityType, matchesLiabilitySearch } from '@/features/liabilities/format';
import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';
import { LIABILITY_NAME_MAX, type Liability, type LiabilityStatus, type LiabilityType } from '@/features/liabilities/types';
import LiabilityListItem from '@/features/liabilities/components/list/LiabilityListItem.vue';
import LiabilityFormModal from '@/features/liabilities/components/modals/LiabilityFormModal.vue';
import LiabilityRemainingAmountModal from '@/features/liabilities/components/modals/LiabilityRemainingAmountModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useLiabilitiesStore();
const assetsStore = useAssetsStore();

const createOpen = ref(false);
const remainingTarget = ref<Liability | null>(null);
const deleteTarget = ref<Liability | null>(null);
const localError = ref<string | null>(null);

const remainingOpen = computed({
    get: () => !!remainingTarget.value,
    set: (value: boolean) => {
        if (!value) remainingTarget.value = null;
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

const filterSearch = computed(() => queryString('q')?.slice(0, LIABILITY_NAME_MAX) ?? null);
const filterStatus = computed<LiabilityStatus | null>(() => {
    const raw = queryString('status');
    if (raw === LIABILITY_STATUS_ALL) return null;
    return isLiabilityStatus(raw) ? raw : 'active';
});
const filterType = computed<LiabilityType | null>(() => {
    const raw = queryString('type');
    return isLiabilityType(raw) ? raw : null;
});

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    if (!needle) return store.items;
    return store.items.filter((item) => matchesLiabilitySearch(item, needle));
});

const hasExtraFilters = computed(() => !!(filterSearch.value || filterType.value));
const emptyCopy = computed(() => {
    if (hasExtraFilters.value) return t('liabilitiesPage.empty.filtered');
    if (filterStatus.value === 'active') return t('liabilitiesPage.empty.active');
    if (filterStatus.value === 'rembourse') return t('liabilitiesPage.empty.rembourse');
    if (filterStatus.value === 'annule') return t('liabilitiesPage.empty.annule');
    return t('liabilitiesPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

function assetName(publicId: string | null): string | null {
    if (!publicId) return null;
    return assetsStore.findByPublicId(publicId)?.name ?? null;
}

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            status: filterStatus.value ?? undefined,
            type: filterType.value ?? undefined,
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

function listQuery(): Record<string, string> {
    const next: Record<string, string> = {};
    const q = queryString('q');
    const status = queryString('status');
    const type = queryString('type');
    if (q) next.q = q.slice(0, LIABILITY_NAME_MAX);
    if (status) next.status = status;
    if (type) next.type = type;
    return next;
}

function openDetail(liability: Liability, edit = false) {
    const query = listQuery();
    if (edit) query.edit = '1';
    void router.push({ path: liabilityDetailPath(liability.publicId), query });
}

function onCreated(liability: Liability) {
    if (liability?.publicId) openDetail(liability);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!assetsStore.initialized) {
        void assetsStore.loadList({ active: true }).catch(() => undefined);
    }
    void loadDirectory().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [filterStatus.value, filterType.value] as const,
    () => {
        void loadDirectory().catch(() => undefined);
    }
);

watch(filterSearch, (search, previousSearch) => {
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) searchRevealKey.value += 1;
});

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

function requestRemaining(liability: Liability) {
    remainingTarget.value = liability;
}

function requestDelete(liability: Liability) {
    deleteTarget.value = liability;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deleteLiability(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('liabilitiesPage.errors.notFound');
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
        <div v-else class="liabilities-directory">
            <div :key="searchRevealKey" class="liabilities-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                <LiabilityListItem
                    v-for="(liability, index) in visibleItems"
                    :key="liability.publicId"
                    :liability="liability"
                    :acting="store.acting"
                    :asset-name="assetName(liability.assetPublicId)"
                    :style="{ '--i': index }"
                    @open="openDetail"
                    @edit="openDetail($event, true)"
                    @remaining="requestRemaining"
                    @delete="requestDelete"
                />
            </div>
        </div>

        <LiabilityFormModal v-model="createOpen" @saved="onCreated" />
        <LiabilityRemainingAmountModal v-model="remainingOpen" :liability="remainingTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('liabilitiesPage.deleteModal.title')"
            :message="t('liabilitiesPage.deleteModal.body')"
            :confirm-label="t('liabilitiesPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.liabilities-directory {
    width: 100%;
    min-width: 0;
    padding: 8px 0 24px;
}

/* trois blocs par rangée (1 sur mobile), gouttière 32 px */
.liabilities-directory__list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px 32px;
    width: 100%;
}

@media (max-width: 1199.98px) {
    .liabilities-directory__list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .liabilities-directory {
        padding: 0 0 16px;
    }

    .liabilities-directory__list {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
    }
}
</style>
