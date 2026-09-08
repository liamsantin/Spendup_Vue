<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { SearchIcon, XIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { isTierNature, isTierRole } from '@/features/tiers/format';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { TIER_SEARCH_MAX, type Tier, type TierNature, type TierRole } from '@/features/tiers/types';
import TierListItem from '@/features/tiers/components/list/TierListItem.vue';
import TierFormModal from '@/features/tiers/components/modals/TierFormModal.vue';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();

const createOpen = ref(false);
const editTarget = ref<Tier | null>(null);
const deleteTarget = ref<Tier | null>(null);
const deleteBlockedMessage = ref<string | null>(null);
const localError = ref<string | null>(null);
const searchInput = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

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
const hasFilters = computed(() => !!(filterSearch.value || filterNature.value || filterRole.value));

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : (filterSearch.value ?? undefined);
    const nature = 'nature' in patch ? patch.nature : (filterNature.value ?? undefined);
    const role = 'role' in patch ? patch.role : (filterRole.value ?? undefined);
    if (q) next.q = q;
    if (nature) next.nature = nature;
    if (role) next.role = role;
    void router.replace({ path: route.path, query: next });
}

function onSearchInput(value: string) {
    searchInput.value = value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        patchQuery({ q: value.trim() || undefined });
    }, SEARCH_DEBOUNCE_MS);
}

function clearSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = null;
    searchInput.value = '';
    patchQuery({ q: undefined });
}

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            search: filterSearch.value ?? undefined,
            nature: filterNature.value ?? undefined,
            role: filterRole.value ?? undefined,
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
    searchInput.value = filterSearch.value ?? '';
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (searchTimer) clearTimeout(searchTimer);
});

watch(
    () => [filterSearch.value, filterNature.value, filterRole.value] as const,
    () => {
        if ((filterSearch.value ?? '') !== searchInput.value.trim() && !searchTimer) {
            searchInput.value = filterSearch.value ?? '';
        }
        void loadDirectory().catch(() => undefined);
    }
);

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

function requestDelete(tier: Tier) {
    deleteBlockedMessage.value = null;
    deleteTarget.value = tier;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    if (deleteBlockedMessage.value) {
        const id = deleteTarget.value.publicId;
        deleteTarget.value = null;
        deleteBlockedMessage.value = null;
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
            // Message métier serveur (transactions vivantes liées) — affiché tel quel.
            deleteBlockedMessage.value = err.message;
            store.clearError();
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

        <div class="tiers-directory__toolbar">
            <label class="su-search su-search--discover tiers-directory__search">
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
            <span v-if="store.initialized && store.totalCount" class="tiers-directory__count">
                {{ t('tiersPage.count', { count: store.totalCount }, store.totalCount) }}
            </span>
        </div>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.items.length" class="su-empty">
            <p class="mb-3">{{ hasFilters ? t('tiersPage.empty.filtered') : t('tiersPage.empty.list') }}</p>
            <button v-if="!hasFilters" type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="openCreate">
                {{ t('tiersPage.actions.create') }}
            </button>
        </div>
        <div v-else class="su-stack">
            <section class="su-surface tiers-directory__list">
                <TierListItem
                    v-for="tier in store.items"
                    :key="tier.publicId"
                    :tier="tier"
                    :acting="store.acting"
                    @edit="editTarget = $event"
                    @delete="requestDelete"
                />
            </section>
        </div>

        <div v-if="store.hasMore" class="su-more">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.loadingMore" @click="store.loadMore()">
                {{ t('tiersPage.loadMore') }}
            </button>
        </div>

        <TierFormModal v-model="createOpen" :default-nature="filterNature" :default-roles="filterRole ? [filterRole] : null" />
        <TierFormModal v-model="editOpen" :tier="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteBlockedMessage ? t('tiersPage.deleteModal.blockedTitle') : t('tiersPage.deleteModal.title')"
            :message="deleteBlockedMessage || t('tiersPage.deleteModal.body')"
            :confirm-label="deleteBlockedMessage ? t('tiersPage.actions.seeTransactions') : t('tiersPage.actions.delete')"
            :confirm-color="deleteBlockedMessage ? 'primary' : 'error'"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.tiers-directory__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.tiers-directory__search {
    margin: 0;
    animation: none;
}

.tiers-directory__count {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-muted);
    white-space: nowrap;
}

.tiers-directory__list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
</style>
