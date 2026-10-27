import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import type { Transaction } from '@/features/transactions/types';
import { queryMatchesSharedDebt } from '@/features/shared-debts/format';
import {
    SHARED_DEBT_DEFAULT_ROLE,
    type ListSharedDebtsQuery,
    type SharedDebt,
    type SharedDebtCurrency,
    type SharedDebtRole,
    type SharedDebtStatus
} from '@/features/shared-debts/types';

export const SHARED_DEBTS_LIST_MAX_AGE_MS = 30_000;

export type SharedDebtsListQuery = {
    role: SharedDebtRole;
    status: SharedDebtStatus | null;
};

export function listCacheKey(query: SharedDebtsListQuery): string {
    return `list:${query.role}:${query.status ?? 'all'}`;
}

export function listQueryFromKey(key: string): SharedDebtsListQuery {
    const [, role, status] = key.split(':');
    return {
        role: role === 'debtor' ? 'debtor' : 'creditor',
        status: status && status !== 'all' ? (status as SharedDebtStatus) : null
    };
}

export type SharedDebtsCacheEntry = {
    items: SharedDebt[];
    totalCount: number;
    totalOwedToMe: number;
    totalIOwe: number;
    currency: SharedDebtCurrency | null;
};

export type SharedDebtsListMeta = Partial<Omit<SharedDebtsCacheEntry, 'items'>>;

/**
 * Map dont chaque écriture appelle `onChange` : bumpe un compteur réactif
 * sans rendre la Map elle-même réactive.
 */
function createTrackedMap<K, V>(onChange: () => void): Map<K, V> {
    const map = new Map<K, V>();
    const rawSet = map.set.bind(map);
    const rawDelete = map.delete.bind(map);
    const rawClear = map.clear.bind(map);
    map.set = (key: K, value: V) => {
        rawSet(key, value);
        onChange();
        return map;
    };
    map.delete = (key: K) => {
        const removed = rawDelete(key);
        if (removed) onChange();
        return removed;
    };
    map.clear = () => {
        if (map.size === 0) return;
        rawClear();
        onChange();
    };
    return map;
}

export function createSharedDebtsState() {
    const items = ref<SharedDebt[]>([]);
    const itemsByListKey = new Map<string, SharedDebtsCacheEntry>();
    // `knownById` n’est pas suivie par Vue : `knownVersion` est la dépendance réactive de `findByPublicId`.
    const knownVersion = ref(0);
    const knownById = createTrackedMap<string, SharedDebt>(() => {
        knownVersion.value += 1;
    });
    const activeListKey = ref(listCacheKey({ role: SHARED_DEBT_DEFAULT_ROLE, status: null }));
    const totalCount = ref(0);
    const totalOwedToMe = ref(0);
    const totalIOwe = ref(0);
    const totalsCurrency = ref<SharedDebtCurrency | null>(null);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    /** Dépenses candidates au rattachement (sélecteur de transaction du formulaire). */
    const expenseCandidates = ref<Transaction[]>([]);
    const expenseCandidatesLoading = ref(false);

    const cache = createResourceCache({ defaultMaxAgeMs: SHARED_DEBTS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<SharedDebtsListQuery>(() => listQueryFromKey(activeListKey.value));

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    function applyActiveEntry(entry: SharedDebtsCacheEntry | undefined) {
        items.value = entry?.items ?? [];
        totalCount.value = entry?.totalCount ?? 0;
        totalOwedToMe.value = entry?.totalOwedToMe ?? 0;
        totalIOwe.value = entry?.totalIOwe ?? 0;
        totalsCurrency.value = entry?.currency ?? null;
    }

    function setList(key: string, nextItems: SharedDebt[], meta: SharedDebtsListMeta = {}) {
        const prev = itemsByListKey.get(key);
        const entry: SharedDebtsCacheEntry = {
            items: nextItems,
            totalCount: meta.totalCount ?? prev?.totalCount ?? nextItems.length,
            totalOwedToMe: meta.totalOwedToMe ?? prev?.totalOwedToMe ?? 0,
            totalIOwe: meta.totalIOwe ?? prev?.totalIOwe ?? 0,
            currency: meta.currency ?? prev?.currency ?? null
        };
        itemsByListKey.set(key, entry);
        for (const item of nextItems) knownById.set(item.publicId, item);
        if (activeListKey.value === key) applyActiveEntry(entry);
    }

    function activateList(key: string) {
        activeListKey.value = key;
        applyActiveEntry(itemsByListKey.get(key));
    }

    /**
     * Met à jour la dette dans toutes les listes hydratées (ajout / remplacement / retrait selon la query).
     * Les totaux ne sont pas recalculés localement : ils viennent du prochain refetch.
     */
    function upsertItem(debt: SharedDebt) {
        knownById.set(debt.publicId, debt);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const query = listQueryFromKey(key);
            const listQuery: ListSharedDebtsQuery = { role: query.role, status: query.status ?? undefined };
            const matches = queryMatchesSharedDebt(listQuery, debt);
            const idx = entry.items.findIndex((item) => item.publicId === debt.publicId);
            if (matches) {
                const next = idx >= 0 ? entry.items.map((item) => (item.publicId === debt.publicId ? debt : item)) : [debt, ...entry.items];
                setList(key, next, { totalCount: idx >= 0 ? entry.totalCount : entry.totalCount + 1 });
            } else if (idx >= 0) {
                setList(
                    key,
                    entry.items.filter((item) => item.publicId !== debt.publicId),
                    { totalCount: Math.max(0, entry.totalCount - 1) }
                );
            }
        }
    }

    function removeItemLocal(publicId: string) {
        knownById.delete(publicId);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            if (!entry.items.some((item) => item.publicId === publicId)) continue;
            setList(
                key,
                entry.items.filter((item) => item.publicId !== publicId),
                { totalCount: Math.max(0, entry.totalCount - 1) }
            );
        }
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) cache.invalidate(key);
    }

    function rememberLocalMutation(publicId: string) {
        const id = publicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, 2500)
        );
    }

    function consumeLocalMutation(publicId: string): boolean {
        const id = publicId.trim();
        const timer = recentMutations.get(id);
        if (!timer) return false;
        clearTimeout(timer);
        recentMutations.delete(id);
        return true;
    }

    function clearRecentMutations() {
        for (const timer of recentMutations.values()) clearTimeout(timer);
        recentMutations.clear();
    }

    function notifyDeleted(publicId: string) {
        deletedListeners.forEach((listener) => listener(publicId));
    }

    function subscribeToDeleted(listener: (publicId: string) => void) {
        deletedListeners.add(listener);
        return () => {
            deletedListeners.delete(listener);
        };
    }

    function findByPublicId(publicId: string): SharedDebt | null {
        void knownVersion.value;
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
    }

    return {
        items,
        itemsByListKey,
        knownById,
        knownVersion,
        activeListKey,
        totalCount,
        totalOwedToMe,
        totalIOwe,
        totalsCurrency,
        loading,
        acting,
        initialized,
        error,
        expenseCandidates,
        expenseCandidatesLoading,
        cache,
        hasItems,
        activeQuery,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        applyActiveEntry,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        notifyDeleted,
        subscribeToDeleted,
        deletedListeners,
        findByPublicId
    };
}

export type SharedDebtsState = ReturnType<typeof createSharedDebtsState>;
