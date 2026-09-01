import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { sortPaymentMethods } from '@/features/payment-methods/format';
import { PAYMENT_METHOD_PAGE_SIZE_DEFAULT, type PaymentMethod } from '@/features/payment-methods/types';

export const PAYMENT_METHODS_LIST_MAX_AGE_MS = 30_000;

export const KEY_GLOBAL = 'list:all';

export function listCacheKey(accountPublicId?: string | null): string {
    const id = accountPublicId?.trim();
    return id ? `list:${id}` : KEY_GLOBAL;
}

export type PaymentMethodsCacheEntry = {
    items: PaymentMethod[];
    page: number;
    pageSize: number;
    totalCount: number;
};

/**
 * État partagé du store moyens de paiement.
 */
export function createPaymentMethodsState() {
    const items = ref<PaymentMethod[]>([]);
    const itemsByListKey = new Map<string, PaymentMethodsCacheEntry>();
    const activeListKey = ref(KEY_GLOBAL);
    const page = ref(1);
    const pageSize = ref(PAYMENT_METHOD_PAGE_SIZE_DEFAULT);
    const totalCount = ref(0);

    const loading = ref(false);
    const loadingMore = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: PAYMENT_METHODS_LIST_MAX_AGE_MS });

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => items.value.length > 0 && items.value.length < totalCount.value);
    const activeAccountPublicId = computed(() => {
        const key = activeListKey.value;
        if (key === KEY_GLOBAL) return null;
        return key.startsWith('list:') ? key.slice(5) : null;
    });

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

    function setList(key: string, nextItems: PaymentMethod[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const sorted = sortPaymentMethods(nextItems);
        const prev = itemsByListKey.get(key);
        const entry: PaymentMethodsCacheEntry = {
            items: sorted,
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? PAYMENT_METHOD_PAGE_SIZE_DEFAULT,
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
        pageSize.value = PAYMENT_METHOD_PAGE_SIZE_DEFAULT;
        totalCount.value = 0;
    }

    function upsertItem(method: PaymentMethod) {
        const patch = (key: string, createIfMissing: boolean) => {
            const prev = itemsByListKey.get(key);
            if (!prev && !createIfMissing) return;
            const current = prev?.items ?? [];
            const without = current.filter((item) => item.publicId !== method.publicId);
            const existed = without.length !== current.length;
            const nextTotal = existed ? (prev?.totalCount ?? current.length) : (prev?.totalCount ?? current.length) + 1;
            setList(key, [...without, method], { totalCount: nextTotal });
        };
        patch(listCacheKey(method.accountPublicId), true);
        patch(KEY_GLOBAL, false);
    }

    function removeItemLocal(publicId: string, accountPublicId?: string | null) {
        const apply = (key: string) => {
            const prev = itemsByListKey.get(key);
            if (!prev) return;
            const nextItems = prev.items.filter((item) => item.publicId !== publicId);
            if (nextItems.length === prev.items.length) return;
            setList(key, nextItems, { totalCount: Math.max(0, prev.totalCount - 1) });
        };
        if (accountPublicId) apply(listCacheKey(accountPublicId));
        apply(KEY_GLOBAL);
        if (accountPublicId) return;
        for (const key of [...itemsByListKey.keys()]) {
            if (key !== KEY_GLOBAL) apply(key);
        }
    }

    function removeByAccount(accountPublicId: string) {
        const accountKey = listCacheKey(accountPublicId);
        const accountEntry = itemsByListKey.get(accountKey);
        const removedCount = accountEntry?.items.length ?? 0;
        itemsByListKey.delete(accountKey);
        cache.invalidate(accountKey);
        const global = itemsByListKey.get(KEY_GLOBAL);
        if (global) {
            const nextItems = global.items.filter((item) => item.accountPublicId !== accountPublicId);
            setList(KEY_GLOBAL, nextItems, {
                totalCount: Math.max(0, global.totalCount - (global.items.length - nextItems.length || removedCount))
            });
        }
        if (activeListKey.value === accountKey) {
            activateList(accountKey);
        }
    }

    function allKnownItems(): PaymentMethod[] {
        const byId = new Map<string, PaymentMethod>();
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
        activeAccountPublicId,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        removeByAccount,
        allKnownItems
    };
}

export type PaymentMethodsState = ReturnType<typeof createPaymentMethodsState>;
