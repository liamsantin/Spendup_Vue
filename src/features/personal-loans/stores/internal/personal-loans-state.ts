import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { queryMatchesPersonalLoan } from '@/features/personal-loans/format';
import type {
    ListPersonalLoansQuery,
    LoanDirection,
    LoanStatus,
    PersonalLoan,
    PersonalLoanCurrency
} from '@/features/personal-loans/types';

export const PERSONAL_LOANS_LIST_MAX_AGE_MS = 30_000;

export type PersonalLoansListQuery = {
    status: LoanStatus | null;
    direction: LoanDirection | null;
};

export function listCacheKey(query: PersonalLoansListQuery): string {
    return `list:${query.status ?? 'all'}:${query.direction ?? 'all'}`;
}

function queryFromCacheKey(key: string): ListPersonalLoansQuery {
    const [, status, direction] = key.split(':');
    return {
        status: status && status !== 'all' ? (status as LoanStatus) : undefined,
        direction: direction && direction !== 'all' ? (direction as LoanDirection) : undefined
    };
}

export type PersonalLoansTotals = {
    totalLent: number;
    totalBorrowed: number;
    currency: PersonalLoanCurrency | null;
};

export type PersonalLoansCacheEntry = PersonalLoansTotals & {
    items: PersonalLoan[];
    totalCount: number;
};

/** Map dont chaque écriture appelle `onChange` : bump d’un compteur réactif sans rendre la Map réactive. */
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

export function createPersonalLoansState() {
    const items = ref<PersonalLoan[]>([]);
    const itemsByListKey = new Map<string, PersonalLoansCacheEntry>();
    const knownVersion = ref(0);
    const knownById = createTrackedMap<string, PersonalLoan>(() => {
        knownVersion.value += 1;
    });
    const activeListKey = ref(listCacheKey({ status: null, direction: null }));
    const totalCount = ref(0);
    /** Totaux des prêts actifs (devise de base) renvoyés par la dernière liste active. */
    const totalLent = ref(0);
    const totalBorrowed = ref(0);
    const totalsCurrency = ref<PersonalLoanCurrency | null>(null);

    const loading = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: PERSONAL_LOANS_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();
    const deletedListeners = new Set<(publicId: string) => void>();

    const hasItems = computed(() => items.value.length > 0);
    const activeQuery = computed<PersonalLoansListQuery>(() => {
        const q = queryFromCacheKey(activeListKey.value);
        return { status: q.status ?? null, direction: q.direction ?? null };
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

    function applyEntry(entry: PersonalLoansCacheEntry | undefined) {
        items.value = entry?.items ?? [];
        totalCount.value = entry?.totalCount ?? 0;
        totalLent.value = entry?.totalLent ?? 0;
        totalBorrowed.value = entry?.totalBorrowed ?? 0;
        totalsCurrency.value = entry?.currency ?? null;
    }

    function setList(key: string, nextItems: PersonalLoan[], meta?: Partial<PersonalLoansTotals> & { totalCount?: number }) {
        const prev = itemsByListKey.get(key);
        const entry: PersonalLoansCacheEntry = {
            items: nextItems,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? nextItems.length,
            totalLent: meta?.totalLent ?? prev?.totalLent ?? 0,
            totalBorrowed: meta?.totalBorrowed ?? prev?.totalBorrowed ?? 0,
            currency: meta?.currency !== undefined ? meta.currency : (prev?.currency ?? null)
        };
        itemsByListKey.set(key, entry);
        for (const item of nextItems) knownById.set(item.publicId, item);
        if (activeListKey.value === key) applyEntry(entry);
    }

    function activateList(key: string) {
        activeListKey.value = key;
        applyEntry(itemsByListKey.get(key));
    }

    /** Insère / remplace dans chaque liste hydratée selon sa query ; retire si elle ne correspond plus. */
    function upsertItem(loan: PersonalLoan) {
        knownById.set(loan.publicId, loan);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            const matches = queryMatchesPersonalLoan(queryFromCacheKey(key), loan);
            const idx = entry.items.findIndex((item) => item.publicId === loan.publicId);
            if (matches) {
                const next = idx >= 0 ? entry.items.map((item) => (item.publicId === loan.publicId ? loan : item)) : [loan, ...entry.items];
                setList(key, next, { totalCount: idx >= 0 ? entry.totalCount : entry.totalCount + 1 });
            } else if (idx >= 0) {
                const next = entry.items.filter((item) => item.publicId !== loan.publicId);
                setList(key, next, { totalCount: Math.max(0, entry.totalCount - 1) });
            }
        }
    }

    function removeItemLocal(publicId: string) {
        knownById.delete(publicId);
        for (const [key, entry] of [...itemsByListKey.entries()]) {
            if (!entry.items.some((item) => item.publicId === publicId)) continue;
            const next = entry.items.filter((item) => item.publicId !== publicId);
            setList(key, next, { totalCount: Math.max(0, entry.totalCount - 1) });
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

    function allKnownItems(): PersonalLoan[] {
        void knownVersion.value;
        return [...knownById.values()];
    }

    function findByPublicId(publicId: string): PersonalLoan | null {
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
        totalLent,
        totalBorrowed,
        totalsCurrency,
        loading,
        acting,
        initialized,
        error,
        cache,
        hasItems,
        activeQuery,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        notifyDeleted,
        subscribeToDeleted,
        deletedListeners,
        allKnownItems,
        findByPublicId
    };
}

export type PersonalLoansState = ReturnType<typeof createPersonalLoansState>;
