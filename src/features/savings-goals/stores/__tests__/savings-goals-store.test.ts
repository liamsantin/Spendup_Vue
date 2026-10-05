import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { emptySavingsGoalFormFields, type SavingsGoalFormFields } from '@/features/savings-goals/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const subscribeToSavingsGoalChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/savings-goals/api', () => ({
    savingsGoalsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToSavingsGoalChanged,
        subscribeToAccountChanged
    })
}));

import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';

const vacances: SavingsGoal = {
    publicId: 'g-1',
    name: 'Vacances',
    targetAmount: 2000,
    openingAmount: 150,
    contributedAmount: 0,
    currentAmount: 150,
    remainingAmount: 1850,
    percentReached: 7.5,
    currency: 'CHF',
    targetDate: '2026-12-01',
    projectedDate: null,
    status: 'active',
    isOverdue: false,
    accountPublicId: null,
    contributions: [],
    createdAt: '2026-09-23T18:00:00Z',
    updatedAt: null
};

function form(partial: Partial<SavingsGoalFormFields> = {}): SavingsGoalFormFields {
    return {
        ...emptySavingsGoalFormFields({ currency: 'CHF' }),
        name: 'Vacances',
        targetAmount: '2000',
        openingAmount: '150',
        targetDate: '2026-12-01',
        ...partial
    };
}

function page(items: SavingsGoal[], totalCount = items.length) {
    return { items, totalCount };
}

describe('useSavingsGoalsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToSavingsGoalChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste et applique les filtres', async () => {
        api.list.mockResolvedValue(page([vacances]));
        const store = useSavingsGoalsStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ status: undefined, accountPublicId: undefined });
        expect(store.items.map((item) => item.name)).toEqual(['Vacances']);

        api.list.mockResolvedValue(page([vacances]));
        await store.loadList({ status: 'active', accountPublicId: 'acc-1', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ status: 'active', accountPublicId: 'acc-1' });
        expect(store.activeQuery).toEqual({ status: 'active', accountPublicId: 'acc-1' });
    });

    it('crée, met à jour et supprime', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(vacances);
        api.update.mockResolvedValue({ ...vacances, openingAmount: 200, currentAmount: 200, remainingAmount: 1800, percentReached: 10 });
        api.remove.mockResolvedValue(undefined);

        const store = useSavingsGoalsStore();
        await store.loadList();
        const created = await store.createSavingsGoal(form());
        expect(created.publicId).toBe('g-1');
        expect(store.items).toHaveLength(1);

        await store.updateSavingsGoal('g-1', form({ openingAmount: '200' }), { lockedCurrency: 'CHF' });
        expect(store.items[0]?.openingAmount).toBe(200);
        expect(api.update).toHaveBeenLastCalledWith('g-1', expect.objectContaining({ openingAmount: 200, status: null, currency: 'CHF' }));

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        await store.deleteSavingsGoal('g-1');
        expect(store.items).toHaveLength(0);
        expect(deleted).toEqual(['g-1']);
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = useSavingsGoalsStore();
        await expect(store.updateSavingsGoal('missing', form(), { lockedCurrency: 'CHF' })).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Objectif introuvable.');
    });

    it('ignore un savingsGoalChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(vacances);
        let listener: ((payload: { change: string; savingsGoalPublicId: string }) => void) | undefined;
        subscribeToSavingsGoalChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useSavingsGoalsStore();
        await store.bootstrap();
        await store.createSavingsGoal(form());
        api.list.mockClear();
        listener?.({ change: 'savingsGoalCreated', savingsGoalPublicId: 'g-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur savingsGoalCreated d’un autre onglet', async () => {
        api.list.mockResolvedValue(page([vacances]));
        let listener: ((payload: { change: string; savingsGoalPublicId: string }) => void) | undefined;
        subscribeToSavingsGoalChanged.mockImplementation((fn: typeof listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = useSavingsGoalsStore();
        await store.bootstrap();
        api.list.mockClear();
        listener?.({ change: 'savingsGoalCreated', savingsGoalPublicId: 'g-9' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useSavingsGoalsStore();
        store.onAuthenticatedSession();
        expect(subscribeToSavingsGoalChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToAccountChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribeGoal = vi.fn();
        const unsubscribeAccount = vi.fn();
        subscribeToSavingsGoalChanged.mockReturnValue(unsubscribeGoal);
        subscribeToAccountChanged.mockReturnValue(unsubscribeAccount);
        api.list.mockResolvedValue(page([vacances]));
        const store = useSavingsGoalsStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('g-1')).toBeNull();
        expect(unsubscribeGoal).toHaveBeenCalled();
        expect(unsubscribeAccount).toHaveBeenCalled();
    });

    it('liste les objectifs liés à un compte sans changer la query active', async () => {
        api.list.mockResolvedValueOnce(page([vacances]));
        const store = useSavingsGoalsStore();
        await store.loadList();
        expect(store.activeQuery).toEqual({ status: null, accountPublicId: null });

        const linked = { ...vacances, publicId: 'g-2', accountPublicId: 'acc-1' };
        api.list.mockResolvedValueOnce(page([linked]));
        const items = await store.listLinkedToAccount('acc-1');
        expect(items).toEqual([linked]);
        expect(store.activeQuery).toEqual({ status: null, accountPublicId: null });
        expect(store.findByPublicId('g-2')?.accountPublicId).toBe('acc-1');
    });
});
