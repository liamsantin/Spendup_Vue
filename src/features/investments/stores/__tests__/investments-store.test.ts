import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import { emptyOperationFormFields, type OperationFormFields } from '@/features/investments/payload';
import type { Instrument, InvestmentOperation, PositionsResult } from '@/features/investments/types';

const api = vi.hoisted(() => ({
    positions: vi.fn(),
    listOperations: vi.fn(),
    getOperation: vi.fn(),
    createOperation: vi.fn(),
    updateOperation: vi.fn(),
    removeOperation: vi.fn(),
    instrumentGet: vi.fn(),
    instrumentList: vi.fn()
}));

const subscribeToAccountChanged = vi.fn();
const loadAccountDetail = vi.fn();

vi.mock('@/features/investments/api', () => ({
    investmentsApi: {
        positions: (...args: unknown[]) => api.positions(...args),
        listOperations: (...args: unknown[]) => api.listOperations(...args),
        getOperation: (...args: unknown[]) => api.getOperation(...args),
        createOperation: (...args: unknown[]) => api.createOperation(...args),
        updateOperation: (...args: unknown[]) => api.updateOperation(...args),
        removeOperation: (...args: unknown[]) => api.removeOperation(...args)
    },
    instrumentsApi: {
        list: (...args: unknown[]) => api.instrumentList(...args),
        get: (...args: unknown[]) => api.instrumentGet(...args),
        create: vi.fn(),
        update: vi.fn(),
        setPrice: vi.fn(),
        remove: vi.fn()
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({ subscribeToAccountChanged })
}));

vi.mock('@/features/accounts', () => ({
    useAccountsStore: () => ({ loadAccountDetail })
}));

import { useInvestmentsStore } from '@/features/investments/stores/investments-store';

const ACCOUNT = '6f1c2a4e-1b2c-4d5e-8f90-123456789abc';
const OTHER_ACCOUNT = '7a2b3c4d-1b2c-4d5e-8f90-123456789abc';

const nestle: Instrument = {
    publicId: 'i-1',
    symbol: 'NESN',
    name: 'Nestlé',
    type: 'action',
    currency: 'CHF',
    isin: null,
    lastPrice: 130,
    lastPriceDate: '2026-10-20',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

const positionsResult: PositionsResult = {
    items: [
        {
            instrument: nestle,
            quantity: 20,
            averagePrice: 110,
            costBasis: 2200,
            marketValue: 2600,
            unrealizedGain: 400,
            unrealizedGainPct: 18.18,
            hasQuote: true,
            updatedAt: null
        }
    ],
    totalCount: 1,
    totalCostBasis: 2200,
    totalMarketValue: 2600,
    totalUnrealizedGain: 400,
    mixedCurrencies: false
};

const buy: InvestmentOperation = {
    publicId: 'op-1',
    accountPublicId: ACCOUNT,
    instrument: nestle,
    type: 'achat',
    operationDate: '2026-10-20',
    quantity: 20,
    unitPrice: 110,
    totalAmount: 2200,
    currency: 'CHF',
    transactionPublicId: null,
    notes: null,
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: null
};

function opsPage(items: InvestmentOperation[], page = 1, totalCount = items.length) {
    return { items, totalCount, page, pageSize: 50 };
}

function form(partial: Partial<OperationFormFields> = {}): OperationFormFields {
    return {
        ...emptyOperationFormFields({ instrumentPublicId: 'i-1', type: 'achat', operationDate: '2026-10-20' }),
        quantity: '20',
        unitPrice: '110',
        ...partial
    };
}

type Listener = (payload: { change: string; accountPublicId: string }) => void;

function captureListener(): { get: () => Listener | undefined } {
    let listener: Listener | undefined;
    subscribeToAccountChanged.mockImplementation((fn: Listener) => {
        listener = fn;
        return () => undefined;
    });
    return { get: () => listener };
}

async function flush() {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe('useInvestmentsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
        loadAccountDetail.mockReset().mockResolvedValue(undefined);
        api.positions.mockResolvedValue(positionsResult);
        api.listOperations.mockResolvedValue(opsPage([buy]));
    });

    it('bootstrap charge positions et journal du compte', async () => {
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        expect(api.positions).toHaveBeenCalledWith(ACCOUNT, { includeClosed: false });
        expect(api.listOperations).toHaveBeenCalledWith(ACCOUNT, { page: 1 });
        expect(store.positionsFor(ACCOUNT)?.totalMarketValue).toBe(2600);
        expect(store.operationsFor(ACCOUNT)?.items.map((item) => item.publicId)).toEqual(['op-1']);
        expect(store.initialized).toBe(true);
    });

    it('positions soldées et filtres du journal relancent la lecture', async () => {
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        await store.loadPositions(ACCOUNT, { includeClosed: true });
        expect(api.positions).toHaveBeenLastCalledWith(ACCOUNT, { includeClosed: true });
        expect(store.includeClosedFor(ACCOUNT)).toBe(true);

        await store.loadOperations(ACCOUNT, { type: 'vente', from: '2026-01-01' });
        expect(api.listOperations).toHaveBeenLastCalledWith(ACCOUNT, { type: 'vente', from: '2026-01-01', page: 1 });
        expect(store.operationsFor(ACCOUNT)?.filters).toEqual({ instrumentPublicId: null, type: 'vente', from: '2026-01-01', to: null });
    });

    it('charge la page suivante à la suite', async () => {
        const second = { ...buy, publicId: 'op-2' };
        api.listOperations.mockResolvedValueOnce({ items: [buy], totalCount: 2, page: 1, pageSize: 1 });
        const store = useInvestmentsStore();
        await store.loadOperations(ACCOUNT);
        expect(store.operationsFor(ACCOUNT)?.hasMore).toBe(true);
        api.listOperations.mockResolvedValueOnce({ items: [second], totalCount: 2, page: 2, pageSize: 1 });
        await store.loadMoreOperations(ACCOUNT);
        expect(api.listOperations).toHaveBeenLastCalledWith(ACCOUNT, { page: 2, pageSize: 1 });
        expect(store.operationsFor(ACCOUNT)?.items.map((item) => item.publicId)).toEqual(['op-1', 'op-2']);
        expect(store.operationsFor(ACCOUNT)?.hasMore).toBe(false);
    });

    it('crée, met à jour et supprime une opération puis rafraîchit le compte', async () => {
        api.createOperation.mockResolvedValue(buy);
        api.updateOperation.mockResolvedValue({ ...buy, quantity: 25 });
        api.removeOperation.mockResolvedValue(undefined);
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        api.positions.mockClear();

        const created = await store.createOperation(ACCOUNT, form());
        expect(created.publicId).toBe('op-1');
        expect(api.createOperation).toHaveBeenCalledWith(
            ACCOUNT,
            expect.objectContaining({ instrumentPublicId: 'i-1', type: 'achat', quantity: 20, unitPrice: 110, transactionPublicId: null })
        );
        await flush();
        expect(api.positions).toHaveBeenCalled();
        expect(loadAccountDetail).toHaveBeenCalledWith(ACCOUNT, true);

        await store.updateOperation(ACCOUNT, 'op-1', form({ quantity: '25' }));
        expect(api.updateOperation).toHaveBeenCalledWith(ACCOUNT, 'op-1', expect.objectContaining({ quantity: 25 }));

        await store.deleteOperation(ACCOUNT, 'op-1');
        expect(api.removeOperation).toHaveBeenCalledWith(ACCOUNT, 'op-1');
    });

    it('validation client avant tout appel', async () => {
        const store = useInvestmentsStore();
        await expect(store.createOperation(ACCOUNT, form({ type: 'dividende' }))).rejects.toMatchObject({ status: 400 });
        expect(api.createOperation).not.toHaveBeenCalled();
    });

    it('400 serveur affiché tel quel', async () => {
        api.removeOperation.mockRejectedValue(new AppError('La quantité deviendrait négative au 2026-10-21.', 400));
        const store = useInvestmentsStore();
        await expect(store.deleteOperation(ACCOUNT, 'op-1')).rejects.toMatchObject({ status: 400 });
        expect(store.error).toBe('La quantité deviendrait négative au 2026-10-21.');
    });

    it('404 neutre et retrait local de l’opération', async () => {
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        api.removeOperation.mockRejectedValue(new AppError('Not found', 404));
        await expect(store.deleteOperation(ACCOUNT, 'op-1')).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Opération introuvable.');
        expect(store.operationsFor(ACCOUNT)?.items).toHaveLength(0);
    });

    it('404 sur le compte : message neutre et oubli du compte', async () => {
        api.positions.mockRejectedValue(new AppError('Not found', 404));
        const store = useInvestmentsStore();
        await expect(store.loadPositions(ACCOUNT)).rejects.toMatchObject({ status: 404 });
        expect(store.error).toBe('Compte de placement introuvable.');
        expect(store.positionsFor(ACCOUNT)).toBeNull();
    });

    it('ignore un accountChanged correspondant à une mutation locale', async () => {
        const listener = captureListener();
        api.createOperation.mockResolvedValue(buy);
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        await store.createOperation(ACCOUNT, form());
        await flush();
        api.positions.mockClear();
        api.listOperations.mockClear();

        listener.get()?.({ change: 'investmentOperationCreated', accountPublicId: ACCOUNT });
        await flush();
        expect(api.positions).not.toHaveBeenCalled();
        expect(api.listOperations).not.toHaveBeenCalled();
    });

    it('refetch positions + journal sur une opération venue d’ailleurs', async () => {
        const listener = captureListener();
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        api.positions.mockClear();
        api.listOperations.mockClear();

        listener.get()?.({ change: 'investmentOperationUpdated', accountPublicId: ACCOUNT });
        await vi.waitFor(() => {
            expect(api.positions).toHaveBeenCalledWith(ACCOUNT, { includeClosed: false });
            expect(api.listOperations).toHaveBeenCalled();
        });
    });

    it('investmentPriceUpdated : positions seulement, comptes non chargés ignorés', async () => {
        const listener = captureListener();
        api.instrumentGet.mockResolvedValue(nestle);
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        api.positions.mockClear();
        api.listOperations.mockClear();

        listener.get()?.({ change: 'investmentPriceUpdated', accountPublicId: OTHER_ACCOUNT });
        listener.get()?.({ change: 'transactionCreated', accountPublicId: ACCOUNT });
        await flush();
        expect(api.positions).not.toHaveBeenCalled();

        listener.get()?.({ change: 'investmentPriceUpdated', accountPublicId: ACCOUNT });
        await vi.waitFor(() => {
            expect(api.positions).toHaveBeenCalledTimes(1);
        });
        expect(api.listOperations).not.toHaveBeenCalled();
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useInvestmentsStore();
        store.onAuthenticatedSession();
        store.onAuthenticatedSession();
        expect(subscribeToAccountChanged).toHaveBeenCalledTimes(1);
        expect(api.positions).not.toHaveBeenCalled();
        expect(api.listOperations).not.toHaveBeenCalled();
    });

    it('reset vide tout et coupe le realtime', async () => {
        const unsubscribe = vi.fn();
        subscribeToAccountChanged.mockReturnValue(unsubscribe);
        const store = useInvestmentsStore();
        await store.bootstrap(ACCOUNT);
        store.reset();
        expect(store.positionsFor(ACCOUNT)).toBeNull();
        expect(store.operationsFor(ACCOUNT)).toBeNull();
        expect(store.initialized).toBe(false);
        expect(unsubscribe).toHaveBeenCalled();
    });
});
