import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { PersonalLoan } from '@/features/personal-loans/types';
import { emptyPersonalLoanFormFields, type PersonalLoanFormFields } from '@/features/personal-loans/payload';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
}));

const subscribeToPersonalLoanChanged = vi.fn();

vi.mock('@/features/personal-loans/api', () => ({
    personalLoansApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        remove: (...args: unknown[]) => api.remove(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToPersonalLoanChanged
    })
}));

import { usePersonalLoansStore } from '@/features/personal-loans/stores/personal-loans-store';

const marc: PersonalLoan = {
    publicId: 'p-1',
    direction: 'pret',
    counterpartTierPublicId: 't-1',
    counterpartName: 'Marc',
    label: 'Voiture',
    initialAmount: 500,
    remainingAmount: 500,
    repaidAmount: 0,
    percentRepaid: 0,
    currency: 'CHF',
    startDate: '2026-01-15',
    plannedEndDate: null,
    status: 'active',
    isOverdue: false,
    notes: null,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: null
};

function form(partial: Partial<PersonalLoanFormFields> = {}): PersonalLoanFormFields {
    return {
        ...emptyPersonalLoanFormFields({ currency: 'CHF', startDate: '2026-01-15' }),
        counterpartTierPublicId: 't-1',
        label: 'Voiture',
        initialAmount: '500',
        ...partial
    };
}

function page(items: PersonalLoan[], totals: { totalLent?: number; totalBorrowed?: number } = {}) {
    return { items, totalCount: items.length, totalLent: totals.totalLent ?? 0, totalBorrowed: totals.totalBorrowed ?? 0, currency: 'CHF' };
}

type Listener = (payload: { change: string; personalLoanPublicId: string }) => void;

describe('usePersonalLoansStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToPersonalLoanChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge la liste, les totaux et applique les filtres', async () => {
        api.list.mockResolvedValue(page([marc], { totalLent: 500, totalBorrowed: 120 }));
        const store = usePersonalLoansStore();
        await store.loadList();
        expect(api.list).toHaveBeenCalledWith({ status: undefined, direction: undefined });
        expect(store.items).toHaveLength(1);
        expect(store.totalLent).toBe(500);
        expect(store.totalBorrowed).toBe(120);
        expect(store.totalsCurrency).toBe('CHF');

        await store.loadList({ status: 'active', direction: 'pret', force: true });
        expect(api.list).toHaveBeenLastCalledWith({ status: 'active', direction: 'pret' });
        expect(store.activeQuery).toEqual({ status: 'active', direction: 'pret' });
    });

    it('crée, met à jour, supprime et rafraîchit les totaux', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(marc);
        api.update.mockResolvedValue({ ...marc, remainingAmount: 200, repaidAmount: 300, percentRepaid: 60 });
        api.remove.mockResolvedValue(undefined);

        const store = usePersonalLoansStore();
        await store.loadList();
        api.list.mockResolvedValue(page([marc], { totalLent: 500 }));
        const created = await store.createPersonalLoan(form());
        expect(created.publicId).toBe('p-1');
        expect(store.items).toHaveLength(1);
        await vi.waitFor(() => expect(store.totalLent).toBe(500));

        await store.updatePersonalLoan('p-1', form({ remainingAmount: '200' }), { current: marc });
        expect(api.update).toHaveBeenLastCalledWith(
            'p-1',
            expect.objectContaining({ remainingAmount: 200, status: null, currency: 'CHF' })
        );

        const deleted: string[] = [];
        store.subscribeToDeleted((id) => deleted.push(id));
        api.list.mockResolvedValue(page([]));
        await store.deletePersonalLoan('p-1');
        expect(store.findByPublicId('p-1')).toBeNull();
        expect(deleted).toEqual(['p-1']);
    });

    it('refuse un changement de sens sur un prêt remboursé sans appeler l’API', async () => {
        const store = usePersonalLoansStore();
        const repaid = { ...marc, status: 'rembourse' as const };
        await expect(store.updatePersonalLoan('p-1', form({ direction: 'emprunt' }), { current: repaid })).rejects.toMatchObject({
            status: 400
        });
        expect(api.update).not.toHaveBeenCalled();
    });

    it('normalise un 404 en message neutre', async () => {
        api.update.mockRejectedValue(new AppError('Not found', 404));
        const store = usePersonalLoansStore();
        await expect(store.updatePersonalLoan('missing', form(), { current: marc })).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Prêt introuvable.');
    });

    it('ignore un personalLoanChanged correspondant à une mutation locale', async () => {
        api.list.mockResolvedValue(page([]));
        api.create.mockResolvedValue(marc);
        let listener: Listener | undefined;
        subscribeToPersonalLoanChanged.mockImplementation((fn: Listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = usePersonalLoansStore();
        await store.bootstrap();
        await store.createPersonalLoan(form());
        await vi.waitFor(() => expect(store.loading).toBe(false));
        api.list.mockClear();
        listener?.({ change: 'personalLoanCreated', personalLoanPublicId: 'p-1' });
        await Promise.resolve();
        expect(api.list).not.toHaveBeenCalled();
    });

    it('refetch sur personalLoanCreated d’un autre onglet', async () => {
        api.list.mockResolvedValue(page([marc]));
        let listener: Listener | undefined;
        subscribeToPersonalLoanChanged.mockImplementation((fn: Listener) => {
            listener = fn;
            return () => undefined;
        });

        const store = usePersonalLoansStore();
        await store.bootstrap();
        api.list.mockClear();
        listener?.({ change: 'personalLoanCreated', personalLoanPublicId: 'p-9' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = usePersonalLoansStore();
        store.onAuthenticatedSession();
        store.onAuthenticatedSession();
        expect(subscribeToPersonalLoanChanged).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToPersonalLoanChanged.mockReturnValue(unsubscribe);
        api.list.mockResolvedValue(page([marc], { totalLent: 500 }));
        const store = usePersonalLoansStore();
        await store.bootstrap();
        store.reset();
        expect(store.items).toHaveLength(0);
        expect(store.totalLent).toBe(0);
        expect(store.initialized).toBe(false);
        expect(store.findByPublicId('p-1')).toBeNull();
        expect(unsubscribe).toHaveBeenCalled();
    });
});
