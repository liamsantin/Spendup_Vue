import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    list: vi.fn()
}));

vi.mock('@/features/transactions/api', () => ({
    transactionsApi: {
        list: (...args: unknown[]) => api.list(...args)
    }
}));

vi.mock('@/features/accounts/stores/accounts-store', () => ({
    useAccountsStore: () => ({ accounts: [], selectedAccount: null })
}));

vi.mock('@/features/tags/stores/tags-store', () => ({
    refreshTagCountersIfLoaded: vi.fn()
}));

import { createTransactionsState, listCacheKey, normalizeListQuery } from '@/features/transactions/stores/internal/transactions-state';
import { createTransactionsCrud } from '@/features/transactions/stores/internal/transactions-crud';

function setup() {
    const state = createTransactionsState();
    const crud = createTransactionsCrud(state);
    return { state, crud };
}

describe('transactions-crud', () => {
    beforeEach(() => {
        api.list.mockReset();
    });

    it('refetchActive conserve les filtres récurrence et le pageSize de la liste active', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 200, totalCount: 0 });
        await crud.loadList({ recurringExpensePublicId: 'rec-1', pageSize: 200 });
        const key = listCacheKey(normalizeListQuery({ recurringExpensePublicId: 'rec-1' }));
        expect(state.activeListKey.value).toBe(key);

        await crud.refetchActive();
        expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ recurringExpensePublicId: 'rec-1', page: 1, pageSize: 200 }));
        expect(state.activeListKey.value).toBe(key);
    });

    it('refetchAccount conserve le filtre revenu récurrent', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 });
        await crud.loadList({ recurringIncomePublicId: 'inc-1', pageSize: 100 });

        await crud.refetchAccount('acc-1');
        expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ recurringIncomePublicId: 'inc-1', pageSize: 100 }));
        expect(state.activeListKey.value).toBe(listCacheKey(normalizeListQuery({ recurringIncomePublicId: 'inc-1' })));
    });

    it('loadList supplantant un loadMore en vol libère loadingMore', async () => {
        const { state, crud } = setup();
        api.list.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, totalCount: 10 });
        await crud.loadList();
        // Simule une liste partielle pour autoriser loadMore.
        state.totalCount.value = 10;

        api.list.mockImplementationOnce(() => new Promise(() => undefined));
        void crud.loadMore();
        expect(state.loadingMore.value).toBe(true);

        api.list.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        await crud.loadList({ force: true });
        expect(state.loadingMore.value).toBe(false);
    });
});
