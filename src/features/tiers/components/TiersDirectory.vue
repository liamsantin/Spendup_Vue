<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { downloadCsv } from '@/utils/helpers/csv';
import { isTierNature, isTierRole, matchesTierSearch, parseTierSort, sortTiers, type TierSort } from '@/features/tiers/format';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { TIER_PAGE_SIZE_MAX, TIER_SEARCH_MAX, type Tier, type TierNature, type TierRole } from '@/features/tiers/types';
import TierListItem from '@/features/tiers/components/list/TierListItem.vue';
import TierTable from '@/features/tiers/components/list/TierTable.vue';
import TierFormModal from '@/features/tiers/components/modals/TierFormModal.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();

const emit = defineEmits<{
    sort: [value: TierSort];
}>();

const createOpen = ref(false);
const createNature = ref<TierNature | null>(null);
const editTarget = ref<Tier | null>(null);
const deleteTarget = ref<Tier | null>(null);
const deleteBlockedMessage = ref<string | null>(null);
const deleteBlockedByInstitution = computed(() => /institution/i.test(deleteBlockedMessage.value ?? ''));
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) {
            deleteTarget.value = null;
            deleteBlockedMessage.value = null;
        }
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, TIER_SEARCH_MAX) ?? null);
const filterNature = computed<TierNature | null>(() => {
    const raw = queryString('nature');
    return isTierNature(raw) ? raw : null;
});
const filterRole = computed<TierRole | null>(() => {
    const raw = queryString('role');
    return isTierRole(raw) ? raw : null;
});
const listSort = computed(() => parseTierSort(queryString('sort')));
const visibleItems = computed(() => {
    const needle = filterSearch.value;
    const items = needle ? store.items.filter((tier) => matchesTierSearch(tier, needle)) : store.items;
    return sortTiers(items, listSort.value, {
        natureLabel: (nature) => t(`tiersPage.natures.${nature}`),
        roleLabel: (role) => t(`tiersPage.roles.${role}`)
    });
});
const hasExtraFilters = computed(() => !!(filterSearch.value || filterRole.value));
const emptyCopy = computed(() => {
    if (hasExtraFilters.value) return t('tiersPage.empty.filtered');
    if (filterNature.value) return t(`tiersPage.empty.byNature.${filterNature.value}`);
    return t('tiersPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            nature: filterNature.value ?? undefined,
            role: filterRole.value ?? undefined,
            pageSize: filterSearch.value ? TIER_PAGE_SIZE_MAX : undefined,
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

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [filterNature.value, filterRole.value] as const,
    () => {
        void loadDirectory().catch(() => undefined);
    }
);

watch(filterSearch, async (search, previousSearch) => {
    if (search && store.hasMore) {
        await loadDirectory(true).catch(() => undefined);
    }
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) {
        searchRevealKey.value += 1;
    }
});

function openCreate(nature: TierNature | null = null) {
    createNature.value = nature;
    createOpen.value = true;
}

watch(createOpen, (value) => {
    if (!value) createNature.value = null;
});

function exportCsv() {
    const header = (['name', 'nature', 'roles', 'email', 'phone', 'website'] as const).map((key) => t(`tiersPage.columns.${key}`));
    const rows = visibleItems.value.map((tier) => [
        tier.name,
        t(`tiersPage.natures.${tier.nature}`),
        tier.roles.map((role) => t(`tiersPage.roles.${role}`)).join(', '),
        tier.email,
        tier.phone,
        tier.website
    ]);
    downloadCsv('tiers', header, rows);
}

defineExpose({ openCreate, exportCsv });

function requestDelete(tier: Tier) {
    deleteBlockedMessage.value = null;
    deleteTarget.value = tier;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    if (deleteBlockedMessage.value) {
        const id = deleteTarget.value.publicId;
        const goToAccounts = deleteBlockedByInstitution.value;
        deleteTarget.value = null;
        deleteBlockedMessage.value = null;
        if (goToAccounts) {
            await router.push({ path: '/app/finances/comptes' });
            return;
        }
        await router.push({ path: '/app/finances/transactions', query: { tier: id } });
        return;
    }
    localError.value = null;
    try {
        await store.deleteTier(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('tiersPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        if (err.status === 400) {
            deleteBlockedMessage.value = err.message;
            store.clearError();
            return;
        }
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div class="tiers-panel">
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

        <div class="tiers-panel__scroll">
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
            <div v-else class="tiers-directory">
                <div :key="searchRevealKey" class="tiers-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                    <TierListItem
                        v-for="(tier, index) in visibleItems"
                        :key="tier.publicId"
                        :tier="tier"
                        :acting="store.acting"
                        :style="{ '--i': index }"
                        @edit="editTarget = $event"
                        @delete="requestDelete"
                    />
                </div>
                <TierTable
                    class="tiers-directory__table"
                    :class="{ 'is-search-reveal': searchReveals }"
                    :items="visibleItems"
                    :acting="store.acting"
                    :sort="listSort"
                    @edit="editTarget = $event"
                    @delete="requestDelete"
                    @sort="emit('sort', $event)"
                />
            </div>

            <div v-if="store.hasMore" class="su-more">
                <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                    {{ t('tiersPage.loadMore') }}
                </button>
            </div>
        </div>

        <TierFormModal v-model="createOpen" :default-nature="createNature" />
        <TierFormModal v-model="editOpen" :tier="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteBlockedMessage ? t('tiersPage.deleteModal.blockedTitle') : t('tiersPage.deleteModal.title')"
            :message="deleteBlockedMessage || t('tiersPage.deleteModal.body')"
            :confirm-label="
                deleteBlockedMessage
                    ? t(deleteBlockedByInstitution ? 'tiersPage.actions.seeAccounts' : 'tiersPage.actions.seeTransactions')
                    : t('tiersPage.actions.delete')
            "
            :confirm-color="deleteBlockedMessage ? 'primary' : 'error'"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.tiers-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.tiers-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.tiers-directory {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 4px 4px;
    background: transparent;
}

.tiers-directory__list {
    display: flex;
    flex-direction: column;
    overflow: visible;
}

.tiers-directory__table {
    display: none;
}

@media (min-width: 768px) {
    .tiers-directory {
        padding: 4px 16px 10px;
    }

    .tiers-directory__list {
        display: none;
    }

    .tiers-directory__table {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
    }
}

@media (max-width: 767px) {
    .tiers-panel__scroll {
        display: block;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    .tiers-directory {
        display: block;
        padding: 0 4px 4px;
    }
}
</style>
