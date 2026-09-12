import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { Budget } from '@/features/budgets/types';
import { emptyBudgetFormFields, type BudgetFormFields } from '@/features/budgets/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const subscribeToBudgetChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();
const subscribeToRecurringExpenseChanged = vi.fn();

vi.mock('@/features/budgets/api', () => ({
    budgetsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToBudgetChanged,
        subscribeToAccountChanged,
        subscribeToRecurringExpenseChanged
    })
}));

import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';

const alimentation: Budget = {
    publicId: 'b-1',
    name: 'Alimentation',
    limitAmount: 400,
    currency: 'CHF',
    periode: 'mensuel',
    startDate: '2026-07-01',
    endDate: null,
    isActive: true,
    categoryPublicId: null,
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    spentAmount: 80,
    remainingAmount: 320,
    percentUsed: 20,
    isCurrent: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: null
};

function form(partial: Partial<BudgetFormFields> = {}): BudgetFormFields {
    return {
        ...emptyBudgetFormFields({ periode: 'mensuel', currency: 'CHF', startDate: '2026-07-01' }),
        name: 'Alimentation',
        limitAmount: '400',
        ...partial
    };
}

function page(items: Budget[], totalCount = items.length) {
    return { items, totalCount };
}

describe('useBudgetsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToBudgetChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToRecurringExpenseChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste et applique les filtres', async () => {
        api.list.mockResolvedValue(page([alimentation]));
        const store = useBudgetsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ isActive: undefined, periode: undefined, categoryPublicId: undefined });
        expect(store.items.map((item) => item.name)).toEqual(['Alimentation']);

        api.list.mockResolvedValue(page([alimentation]));
        await store.loadList({ isActive: true, periode: 'mensuel', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ isActive: true, periode: 'mensuel', categoryPublicId: undefined });
        expect(store.activeQuery).toEqual({ isActive: true, periode: 'mensuel', categoryPublicId: null });
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(alimentation);
        api.update.mockResolvedValue({ ...alimentation, name: 'Courses', limitAmount: 450 });
        api.remove.mockResolvedValue(undefined);

        const store = useBudgetsStore();
        await store.loadList();
        const created = await store.createBudget(form());
        expect(created.publicId).toBe('b-1');
        expect(store.items).toHaveLength(1);

        await store.updateBudget('b-1', form({ name: 'Courses', limitAmount: '450' }), { lockedCurrency: 'CHF' });
        expect(store.items[0]?.name).toBe('Courses');

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteBudget('b-1');
        expect(store.items).toHaveLength(0);
        expect(deleted).toEqual(['b-1']);
    });

    it('refuse localement un doublon de scope', async () => {
        api.list.mockResolvedValue(page([alimentation]));
        const store = useBudgetsStore();
        await store.loadList();
        await expect(store.createBudget(form())).rejects.toMatchObject({ status: 400, code: 'scopeDuplicate' });
        expect(api.create).not.toHaveBeenCalled();
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = useBudgetsStore();
        await expect(store.updateBudget('missing', form(), { lockedCurrency: 'CHF' })).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Budget introuvable.');
    });

    it('ignore un budgetChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(alimentation);
        let listener: ((payload: { change: string; budgetPublicId: string }) => void) | undefined;
        subscribeToBudgetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useBudgetsStore();
        await store.bootstrap();
        await store.createBudget(form());
        api.list.mockClear();
        listener?.({ change: 'budgetCreated', budgetPublicId: 'b-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur budgetCreated d’un autre onglet', async () => {
        api.list.mockResolvedValue(page([alimentation]));
        let listener: ((payload: { change: string; budgetPublicId: string }) => void) | undefined;
        subscribeToBudgetChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useBudgetsStore();
        await store.bootstrap();
        api.list.mockClear();
        listener?.({ change: 'budgetCreated', budgetPublicId: 'b-9' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('refetch le consommé après une transaction', async () => {
        api.list.mockResolvedValue(page([alimentation]));
        let accountListener: ((payload: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: typeof accountListener) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useBudgetsStore();
        await store.bootstrap();
        api.list.mockClear();
        api.list.mockResolvedValue(page([{ ...alimentation, spentAmount: 120, remainingAmount: 280, percentUsed: 30 }]));
        accountListener?.({ change: 'transactionCreated', accountPublicId: 'acc-1' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useBudgetsStore();
        store.onAuthenticatedSession();
        expect(subscribeToBudgetChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToAccountChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToRecurringExpenseChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToBudgetChanged.mockReturnValue(unsubscribe);
        subscribeToAccountChanged.mockReturnValue(unsubscribe);
        subscribeToRecurringExpenseChanged.mockReturnValue(unsubscribe);
        api.list.mockResolvedValue(page([alimentation]));
        const store = useBudgetsStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('b-1')).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });
});
