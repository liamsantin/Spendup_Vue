import { ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import {
    OPERATION_PAGE_SIZE_DEFAULT,
    type InvestmentOperation,
    type ListOperationsQuery,
    type PositionsResult
} from '@/features/investments/types';

export const INVESTMENTS_MAX_AGE_MS = 30_000;
export const INVESTMENTS_LOCAL_MUTATION_MS = 2_500;

/** Filtres du journal (sans pagination). */
export type OperationsFilters = {
    instrumentPublicId: string | null;
    type: ListOperationsQuery['type'] | null;
    from: string | null;
    to: string | null;
};

export type OperationsPage = {
    items: InvestmentOperation[];
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
    filters: OperationsFilters;
};

export const EMPTY_OPERATIONS_FILTERS: OperationsFilters = { instrumentPublicId: null, type: null, from: null, to: null };

export function positionsCacheKey(accountPublicId: string, includeClosed: boolean): string {
    return `positions:${accountPublicId}:${includeClosed ? 'all' : 'open'}`;
}

export function operationsCacheKey(accountPublicId: string, filters: OperationsFilters): string {
    return `operations:${accountPublicId}:${filters.instrumentPublicId ?? ''}:${filters.type ?? ''}:${filters.from ?? ''}:${filters.to ?? ''}`;
}

export function emptyOperationsPage(filters: OperationsFilters = EMPTY_OPERATIONS_FILTERS): OperationsPage {
    return { items: [], page: 0, pageSize: OPERATION_PAGE_SIZE_DEFAULT, totalCount: 0, hasMore: false, filters };
}

export function createInvestmentsState() {
    /** Positions par compte (`includeClosed` mémorisé dans `includeClosedByAccount`). */
    const positionsByAccount = ref<Record<string, PositionsResult>>({});
    const includeClosedByAccount = ref<Record<string, boolean>>({});
    /** Journal paginé par compte, avec ses filtres courants. */
    const operationsByAccount = ref<Record<string, OperationsPage>>({});

    const loadingPositions = ref(false);
    const loadingOperations = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initialized = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: INVESTMENTS_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();

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

    function positionsFor(accountPublicId: string): PositionsResult | null {
        const id = accountPublicId.trim();
        return id ? (positionsByAccount.value[id] ?? null) : null;
    }

    function includeClosedFor(accountPublicId: string): boolean {
        return !!includeClosedByAccount.value[accountPublicId.trim()];
    }

    function operationsFor(accountPublicId: string): OperationsPage | null {
        const id = accountPublicId.trim();
        return id ? (operationsByAccount.value[id] ?? null) : null;
    }

    function isAccountLoaded(accountPublicId: string): boolean {
        const id = accountPublicId.trim();
        return !!id && (id in positionsByAccount.value || id in operationsByAccount.value);
    }

    function setPositions(accountPublicId: string, result: PositionsResult, includeClosed: boolean) {
        positionsByAccount.value = { ...positionsByAccount.value, [accountPublicId]: result };
        includeClosedByAccount.value = { ...includeClosedByAccount.value, [accountPublicId]: includeClosed };
    }

    function setOperations(accountPublicId: string, pageData: OperationsPage) {
        operationsByAccount.value = { ...operationsByAccount.value, [accountPublicId]: pageData };
    }

    function forgetAccount(accountPublicId: string) {
        const positions = { ...positionsByAccount.value };
        const closed = { ...includeClosedByAccount.value };
        const operations = { ...operationsByAccount.value };
        delete positions[accountPublicId];
        delete closed[accountPublicId];
        delete operations[accountPublicId];
        positionsByAccount.value = positions;
        includeClosedByAccount.value = closed;
        operationsByAccount.value = operations;
        invalidateAccount(accountPublicId);
    }

    /** Invalide positions et journal d’un compte (préfixe `*` = toutes les variantes de filtres). */
    function invalidateAccount(accountPublicId: string) {
        cache.invalidate(`positions:${accountPublicId}:*`);
        cache.invalidate(`operations:${accountPublicId}:*`);
    }

    function rememberLocalMutation(accountPublicId: string) {
        const id = accountPublicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, INVESTMENTS_LOCAL_MUTATION_MS)
        );
    }

    function consumeLocalMutation(accountPublicId: string): boolean {
        const id = accountPublicId.trim();
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

    return {
        positionsByAccount,
        includeClosedByAccount,
        operationsByAccount,
        loadingPositions,
        loadingOperations,
        acting,
        initialized,
        error,
        cache,
        beginActing,
        endActing,
        resetActing,
        clearError,
        positionsFor,
        includeClosedFor,
        operationsFor,
        isAccountLoaded,
        setPositions,
        setOperations,
        forgetAccount,
        invalidateAccount,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations
    };
}

export type InvestmentsState = ReturnType<typeof createInvestmentsState>;
