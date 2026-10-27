import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { NetWorthOverview, NetWorthSnapshot } from '@/features/net-worth/types';

const api = vi.hoisted(() => ({
    get: vi.fn(),
    listSnapshots: vi.fn(),
    takeSnapshot: vi.fn()
}));

type Listener = (payload: unknown) => void;
const listeners = vi.hoisted(() => ({
    asset: [] as Listener[],
    liability: [] as Listener[],
    personalLoan: [] as Listener[],
    sharedDebt: [] as Listener[],
    account: [] as Listener[]
}));

const subscribeToAssetChanged = vi.fn();
const subscribeToLiabilityChanged = vi.fn();
const subscribeToPersonalLoanChanged = vi.fn();
const subscribeToSharedDebtChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();

vi.mock('@/features/net-worth/api', () => ({
    netWorthApi: {
        get: (...args: unknown[]) => api.get(...args),
        listSnapshots: (...args: unknown[]) => api.listSnapshots(...args),
        takeSnapshot: (...args: unknown[]) => api.takeSnapshot(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAssetChanged,
        subscribeToLiabilityChanged,
        subscribeToPersonalLoanChanged,
        subscribeToSharedDebtChanged,
        subscribeToAccountChanged
    })
}));

import { NET_WORTH_REFETCH_DEBOUNCE_MS, useNetWorthStore } from '@/features/net-worth/stores/net-worth-store';

const overview: NetWorthOverview = {
    currency: 'CHF',
    asOf: '2026-10-27',
    totalAccounts: 10700,
    totalAssets: 5100,
    totalLiabilities: 300600,
    netWorth: -284800,
    investments: 1200,
    investmentsWithoutQuote: 0,
    accountsByType: [{ type: 'epargne', count: 1, total: 8000 }],
    assetsByType: [{ type: 'vehicule', count: 1, total: 5000 }],
    liabilitiesByType: [{ type: 'hypotheque', count: 1, total: 300000 }],
    friendsBalance: { receivable: 100, payable: 200 },
    excluded: [],
    lastSnapshot: { periode: '2026-10-01', netWorth: -284800, delta: 0 }
};

const snapshot: NetWorthSnapshot = {
    periode: '2026-10-01',
    totalAccounts: 10700,
    totalAssets: 5100,
    totalLiabilities: 300600,
    netWorth: -284800,
    monthlyIncome: 6000,
    monthlyExpenses: 4200,
    savingsRate: 30,
    currency: 'CHF',
    computedAt: '2026-10-27T06:00:00Z'
};

function register(list: Listener[]) {
    return (fn: Listener) => {
        list.push(fn);
        return () => {
            const index = list.indexOf(fn);
            if (index >= 0) list.splice(index, 1);
        };
    };
}

async function flush() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('useNetWorthStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        for (const list of Object.values(listeners)) list.length = 0;
        subscribeToAssetChanged.mockReset().mockImplementation(register(listeners.asset));
        subscribeToLiabilityChanged.mockReset().mockImplementation(register(listeners.liability));
        subscribeToPersonalLoanChanged.mockReset().mockImplementation(register(listeners.personalLoan));
        subscribeToSharedDebtChanged.mockReset().mockImplementation(register(listeners.sharedDebt));
        subscribeToAccountChanged.mockReset().mockImplementation(register(listeners.account));
        api.get.mockResolvedValue(overview);
        api.listSnapshots.mockResolvedValue([snapshot]);
        api.takeSnapshot.mockResolvedValue(snapshot);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('charge le calcul du jour et le met en cache 30 s', async () => {
        const store = useNetWorthStore();
        await store.load();
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(store.overview?.netWorth).toBe(-284800);
        expect(store.initialized).toBe(true);
        expect(store.lastLoadedAt).not.toBeNull();

        await store.load();
        expect(api.get).toHaveBeenCalledTimes(1);

        await store.load(true);
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('charge l’historique (tableau nu ou { items }) avec la plage demandée', async () => {
        const store = useNetWorthStore();
        await store.loadSnapshots({ from: '2026-01-01', to: '2026-10-31' });
        expect(api.listSnapshots).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-10-31' });
        expect(store.snapshots).toHaveLength(1);

        api.listSnapshots.mockResolvedValue({ items: [snapshot, { ...snapshot, periode: '2026-09-01' }] });
        await store.loadSnapshots({ force: true });
        expect(api.listSnapshots).toHaveBeenLastCalledWith({});
        expect(store.snapshots.map((s) => s.periode)).toEqual(['2026-09-01', '2026-10-01']);
    });

    it('takeSnapshot appelle le POST puis recharge calcul et historique', async () => {
        const store = useNetWorthStore();
        await store.bootstrap();
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.listSnapshots).toHaveBeenCalledTimes(1);

        await store.takeSnapshot();
        expect(api.takeSnapshot).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(api.listSnapshots).toHaveBeenCalledTimes(2);
        expect(store.acting).toBe(false);
    });

    it('affiche le message 400 tel quel quand le snapshot est refusé', async () => {
        api.takeSnapshot.mockRejectedValue(new AppError('Aucun compte, actif ni passif à photographier.', 400));
        const store = useNetWorthStore();
        await store.load();
        await expect(store.takeSnapshot()).rejects.toMatchObject({ status: 400 });
        expect(store.error).toBe('Aucun compte, actif ni passif à photographier.');
        expect(store.acting).toBe(false);
    });

    it('branche les cinq abonnements temps réel sans charger', () => {
        const store = useNetWorthStore();
        store.onAuthenticatedSession();
        expect(subscribeToAssetChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToLiabilityChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToPersonalLoanChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToSharedDebtChanged).toHaveBeenCalledTimes(1);
        expect(subscribeToAccountChanged).toHaveBeenCalledTimes(1);
        expect(api.get).not.toHaveBeenCalled();
    });

    it('refetch débouncé une seule fois après une rafale d’événements', async () => {
        const store = useNetWorthStore();
        await store.bootstrap();
        api.get.mockClear();

        listeners.asset[0]?.({ change: 'assetCreated', assetPublicId: 'a-1' });
        listeners.liability[0]?.({ change: 'liabilityUpdated', liabilityPublicId: 'l-1' });
        listeners.account[0]?.({ change: 'investmentPriceUpdated', accountPublicId: 'acc-1' });
        expect(api.get).not.toHaveBeenCalled();

        vi.advanceTimersByTime(NET_WORTH_REFETCH_DEBOUNCE_MS - 1);
        expect(api.get).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        await flush();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('ne refetch pas tant que la page n’a jamais été chargée', async () => {
        const store = useNetWorthStore();
        store.onAuthenticatedSession();
        listeners.sharedDebt[0]?.({ change: 'sharedDebtSettled', sharedDebtPublicId: 's-1' });
        listeners.personalLoan[0]?.({ change: 'personalLoanDeleted', personalLoanPublicId: 'p-1' });
        vi.advanceTimersByTime(NET_WORTH_REFETCH_DEBOUNCE_MS);
        await flush();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('reset annule le refetch en attente et désabonne', async () => {
        const store = useNetWorthStore();
        await store.bootstrap();
        api.get.mockClear();
        listeners.asset[0]?.({ change: 'assetDeleted', assetPublicId: 'a-1' });
        store.reset();
        vi.advanceTimersByTime(NET_WORTH_REFETCH_DEBOUNCE_MS);
        await flush();
        expect(api.get).not.toHaveBeenCalled();
        expect(store.overview).toBeNull();
        expect(store.snapshots).toEqual([]);
        expect(store.initialized).toBe(false);
        expect(listeners.asset).toHaveLength(0);
        expect(listeners.account).toHaveLength(0);
    });
});
