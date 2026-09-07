import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { involvedAccountPublicIds, sortTransactions } from '@/features/transactions/format';
import { TRANSACTION_PAGE_SIZE_DEFAULT, type ListTransactionsQuery, type Transaction } from '@/features/transactions/types';

export const TRANSACTIONS_LIST_MAX_AGE_MS = 30_000;

export type TransactionsListQuery = {
    accountPublicId: string | null;
    from: string | null;
    to: string | null;
};

export function normalizeListQuery(query: ListTransactionsQuery = {}): TransactionsListQuery {
    return {
        accountPublicId: query.accountPublicId?.trim() || null,
        from: query.from?.trim() || null,
        to: query.to?.trim() || null
    };
}

export function listCacheKey(query: TransactionsListQuery): string {
    const account = query.accountPublicId || 'all';
    const from = query.from || '-';
    const to = query.to || '-';
    return `list:${account}:${from}:${to}`;
}

export function parseListCacheKey(key: string): TransactionsListQuery {
    const parts = key.split(':');
    return {
        accountPublicId: !parts[1] || parts[1] === 'all' ? null : parts[1],
        from: !parts[2] || parts[2] === '-' ? null : parts[2],
        to: !parts[3] || parts[3] === '-' ? null : parts[3]
    };
}

export type TransactionsCacheEntry = {
    items: Transaction[];
    page: number;
    pageSize: number;
    totalCount: number;
};

function queryMatchesTransaction(query: TransactionsListQuery, tx: Transaction): boolean {
    const involved = involvedAccountPublicIds(tx);
    if (query.accountPublicId && !involved.includes(query.accountPublicId)) return false;
    if (query.from && tx.operationDate < query.from) return false;
    if (query.to && tx.operationDate > query.to) return false;
    return true;
}

/**
 * État partagé du store transactions.
 */
export function createTransactionsState() {
    const items = ref<Transaction[]>([]);
    const itemsByListKey = new Map<string, TransactionsCacheEntry>();
    const activeListKey = ref(listCacheKey({ accountPublicId: null, from: null, to: null }));
    const page = ref(1);
    const pageSize = ref(TRANSACTION_PAGE_SIZE_DEFAULT);
    const totalCount = ref(0);

    const loading = ref(false);
    const loadingMore = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: TRANSACTIONS_LIST_MAX_AGE_MS });

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => items.value.length > 0 && items.value.length < totalCount.value);
    const activeQuery = computed(() => parseListCacheKey(activeListKey.value));

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

    function setList(key: string, nextItems: Transaction[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const sorted = sortTransactions(nextItems);
        const prev = itemsByListKey.get(key);
        const entry: TransactionsCacheEntry = {
            items: sorted,
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? TRANSACTION_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? sorted.length
        };
        itemsByListKey.set(key, entry);
        if (activeListKey.value === key) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
        }
    }

    function activateList(key: string) {
        activeListKey.value = key;
        const entry = itemsByListKey.get(key);
        if (entry) {
            items.value = entry.items;
            page.value = entry.page;
            pageSize.value = entry.pageSize;
            totalCount.value = entry.totalCount;
            return;
        }
        items.value = [];
        page.value = 1;
        pageSize.value = TRANSACTION_PAGE_SIZE_DEFAULT;
        totalCount.value = 0;
    }

    function upsertItem(transaction: Transaction) {
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const query = parseListCacheKey(key);
            const existed = prev.items.some((item) => item.publicId === transaction.publicId);
            if (!existed && !queryMatchesTransaction(query, transaction)) continue;
            if (existed && !queryMatchesTransaction(query, transaction)) {
                const nextItems = prev.items.filter((item) => item.publicId !== transaction.publicId);
                setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - 1) });
                continue;
            }
            const without = prev.items.filter((item) => item.publicId !== transaction.publicId);
            const nextTotal = existed ? (prev.totalCount ?? without.length) : (prev.totalCount ?? without.length) + 1;
            setList(key, [...without, transaction], { totalCount: nextTotal });
        }
    }

    function removeItemLocal(publicId: string) {
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const nextItems = prev.items.filter((item) => item.publicId !== publicId);
            if (nextItems.length === prev.items.length) continue;
            setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - 1) });
        }
    }

    function removeByAccount(accountPublicId: string) {
        for (const key of [...itemsByListKey.keys()]) {
            const prev = itemsByListKey.get(key);
            if (!prev) continue;
            const nextItems = prev.items.filter((item) => !involvedAccountPublicIds(item).includes(accountPublicId));
            if (nextItems.length === prev.items.length) continue;
            const removed = prev.items.length - nextItems.length;
            setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - removed) });
        }
        cache.invalidate(listCacheKey({ accountPublicId, from: null, to: null }));
    }

    function invalidateAllLists() {
        for (const key of [...itemsByListKey.keys()]) {
            cache.invalidate(key);
        }
    }

    function allKnownItems(): Transaction[] {
        const byId = new Map<string, Transaction>();
        for (const entry of itemsByListKey.values()) {
            for (const item of entry.items) byId.set(item.publicId, item);
        }
        for (const item of items.value) byId.set(item.publicId, item);
        return [...byId.values()];
    }

    return {
        items,
        itemsByListKey,
        activeListKey,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        hasMore,
        activeQuery,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        removeByAccount,
        invalidateAllLists,
        allKnownItems
    };
}

export type TransactionsState = ReturnType<typeof createTransactionsState>;
