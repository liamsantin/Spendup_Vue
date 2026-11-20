import type { RealEstateCharge, RealEstateMaintenance, RealEstateUnit } from '@/features/real-estate/types';
import type { Instrument, InvestmentOperation, Position, PositionsResult } from '@/features/investments/types';
import type { Liability } from '@/features/liabilities/types';
import type { PersonalLoan } from '@/features/personal-loans/types';
import type { SharedDebt } from '@/features/shared-debts/types';
import { AppError } from '@/utils/errors/app-error';
import { createPublicId, demoDb, pageOf } from '@/features/demo/db';

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function stamp() {
    return new Date().toISOString();
}

export function seedWealth(): {
    liabilities: Liability[];
    personalLoans: PersonalLoan[];
    sharedDebts: SharedDebt[];
    instruments: Instrument[];
    operations: InvestmentOperation[];
    realEstateUnits: Record<string, RealEstateUnit[]>;
    realEstateCharges: Record<string, RealEstateCharge[]>;
    realEstateMaintenance: Record<string, RealEstateMaintenance[]>;
} {
    const createdAt = '2026-11-14T09:00:00.000Z';
    const nesn: Instrument = {
        publicId: 'INSNESN',
        symbol: 'NESN',
        name: 'Nestlé',
        type: 'action',
        currency: 'CHF',
        isin: 'CH0038863350',
        lastPrice: 92,
        lastPriceDate: '2026-11-13',
        createdAt,
        updatedAt: null
    };
    const chspi: Instrument = {
        publicId: 'INSCHSP',
        symbol: 'CHSPI',
        name: 'iShares Core SPI',
        type: 'etf',
        currency: 'CHF',
        isin: 'CH0237935652',
        lastPrice: 140,
        lastPriceDate: '2026-11-13',
        createdAt,
        updatedAt: null
    };
    return {
        liabilities: [
            {
                publicId: 'LIAHYPO',
                name: 'Hypothèque Lausanne',
                type: 'hypotheque',
                lenderTierPublicId: 'TIERUBS',
                lenderTierName: 'UBS',
                assetPublicId: 'ASTFLAT',
                initialAmount: 800000,
                remainingAmount: 640000,
                repaidAmount: 160000,
                percentRepaid: 20,
                currency: 'CHF',
                interestRate: 1.45,
                startDate: '2018-04-01',
                plannedEndDate: '2043-04-01',
                status: 'active',
                createdAt,
                updatedAt: null,
                residualValue: null,
                recurringExpensePublicId: null,
                recurringExpenseName: null,
                amortizationPerDue: null
            },
            {
                publicId: 'LIALEAS',
                name: 'Leasing Golf',
                type: 'leasing',
                lenderTierPublicId: 'TIERUBS',
                lenderTierName: 'UBS',
                assetPublicId: 'ASTCAR1',
                initialAmount: 18000,
                remainingAmount: 6400,
                repaidAmount: 11600,
                percentRepaid: 64.44,
                currency: 'CHF',
                interestRate: 2.9,
                startDate: '2023-06-01',
                plannedEndDate: '2028-06-01',
                status: 'active',
                createdAt,
                updatedAt: null,
                residualValue: 4500,
                recurringExpensePublicId: null,
                recurringExpenseName: null,
                amortizationPerDue: null
            }
        ],
        personalLoans: [
            {
                publicId: 'LOANMAR',
                direction: 'pret',
                counterpartTierPublicId: 'TIERMAR',
                counterpartName: 'Marie Dubois',
                label: 'Avance vacances',
                initialAmount: 500,
                remainingAmount: 200,
                repaidAmount: 300,
                percentRepaid: 60,
                currency: 'CHF',
                startDate: '2026-07-01',
                plannedEndDate: '2026-12-31',
                status: 'active',
                isOverdue: false,
                notes: null,
                createdAt,
                updatedAt: null
            }
        ],
        sharedDebts: [
            {
                publicId: 'SHDMARC',
                role: 'creditor',
                counterpart: {
                    publicId: 'FRDMARC',
                    username: 'marc',
                    firstName: 'Marc',
                    name: 'Engel',
                    profilePicture: '/avatar/user-1'
                },
                label: 'Restaurant',
                amount: 45,
                repaidAmount: 0,
                remainingAmount: 45,
                currency: 'CHF',
                status: 'aRembourser',
                dueDate: '2026-11-30',
                settledAt: null,
                transactionPublicId: null,
                createdAt,
                updatedAt: null
            }
        ],
        instruments: [nesn, chspi],
        operations: [
            {
                publicId: 'OPNESN1',
                accountPublicId: 'ACCINV1',
                instrument: nesn,
                type: 'achat',
                operationDate: '2025-03-12',
                quantity: 20,
                unitPrice: 80,
                totalAmount: 1600,
                currency: 'CHF',
                transactionPublicId: null,
                notes: null,
                createdAt,
                updatedAt: null
            },
            {
                publicId: 'OPCHSP1',
                accountPublicId: 'ACCINV1',
                instrument: chspi,
                type: 'achat',
                operationDate: '2025-06-02',
                quantity: 15,
                unitPrice: 130,
                totalAmount: 1950,
                currency: 'CHF',
                transactionPublicId: null,
                notes: null,
                createdAt,
                updatedAt: null
            }
        ],
        realEstateUnits: {
            ASTFLAT: [
                {
                    publicId: 'UNIT001',
                    name: 'Appartement',
                    unitType: 'appartement',
                    surfaceM2: 78,
                    rooms: 3.5,
                    floor: 3,
                    isRentable: false,
                    isOccupied: false,
                    notes: null,
                    createdAt,
                    updatedAt: null
                }
            ]
        },
        realEstateCharges: {
            ASTFLAT: [
                {
                    publicId: 'CHG0PPE',
                    name: 'Charges PPE',
                    chargeType: 'ppe',
                    amount: 280,
                    periodicity: 'mensuelle',
                    startDate: '2024-01-01',
                    endDate: null,
                    unitPublicId: 'UNIT001',
                    tierPublicId: 'TIERREG',
                    tierName: 'Régie du Lac',
                    transactionPublicId: null,
                    currency: 'CHF',
                    monthlyEquivalent: 280,
                    isCurrent: true,
                    createdAt,
                    updatedAt: null
                }
            ]
        },
        realEstateMaintenance: {
            ASTFLAT: [
                {
                    publicId: 'MNTPEIN',
                    maintenanceDate: '2025-09-14',
                    maintenanceType: 'peinture',
                    description: 'Séjour',
                    cost: 2400,
                    currency: 'CHF',
                    nextMaintenanceDate: null,
                    unitPublicId: 'UNIT001',
                    providerTierPublicId: null,
                    providerTierName: null,
                    transactionPublicId: null,
                    createdAt,
                    updatedAt: null
                }
            ]
        }
    };
}

export function refreshLiability(item: Liability): Liability {
    item.repaidAmount = round(item.initialAmount - item.remainingAmount);
    item.percentRepaid = item.initialAmount > 0 ? round((item.repaidAmount / item.initialAmount) * 100) : 0;
    if (item.status !== 'annule') item.status = item.remainingAmount <= 0 ? 'rembourse' : 'active';
    const tier = item.lenderTierPublicId ? demoDb().tiers.find((row) => row.publicId === item.lenderTierPublicId) : null;
    item.lenderTierName = tier?.name ?? item.lenderTierName;
    return item;
}

export function refreshLoan(item: PersonalLoan): PersonalLoan {
    item.repaidAmount = round(item.initialAmount - item.remainingAmount);
    item.percentRepaid = item.initialAmount > 0 ? round((item.repaidAmount / item.initialAmount) * 100) : 0;
    if (item.status !== 'annule') item.status = item.remainingAmount <= 0 ? 'rembourse' : 'active';
    const today = new Date().toISOString().slice(0, 10);
    item.isOverdue = item.status === 'active' && !!item.plannedEndDate && item.plannedEndDate < today;
    const tier = item.counterpartTierPublicId ? demoDb().tiers.find((row) => row.publicId === item.counterpartTierPublicId) : null;
    item.counterpartName = tier?.name ?? item.counterpartName;
    return item;
}

export function refreshShared(item: SharedDebt): SharedDebt {
    item.remainingAmount = round(Math.max(0, item.amount - item.repaidAmount));
    if (item.status !== 'canceled') {
        if (item.remainingAmount <= 0) item.status = 'remboursee';
        else if (item.repaidAmount > 0) item.status = 'partiellementRemboursee';
        else item.status = 'aRembourser';
    }
    return item;
}

export function positionsFor(accountPublicId: string): PositionsResult {
    const db = demoDb();
    const totals = new Map<string, { quantity: number; cost: number }>();
    const ops = db.operations
        .filter((op) => op.accountPublicId === accountPublicId)
        .slice()
        .sort((a, b) => a.operationDate.localeCompare(b.operationDate));
    for (const op of ops) {
        const row = totals.get(op.instrument.publicId) ?? { quantity: 0, cost: 0 };
        const quantity = op.quantity ?? 0;
        const total = op.totalAmount ?? quantity * (op.unitPrice ?? 0);
        if (op.type === 'achat' || op.type === 'depot') {
            row.quantity += quantity;
            row.cost += total;
        } else if (op.type === 'vente' || op.type === 'retrait') {
            const average = row.quantity > 0 ? row.cost / row.quantity : 0;
            row.quantity -= quantity;
            row.cost -= average * quantity;
        }
        totals.set(op.instrument.publicId, row);
    }
    const items: Position[] = [];
    for (const [id, row] of totals) {
        if (row.quantity <= 0) continue;
        const instrument = db.instruments.find((item) => item.publicId === id);
        if (!instrument) continue;
        const averagePrice = round(row.cost / row.quantity);
        const price = instrument.lastPrice ?? averagePrice;
        const marketValue = round(row.quantity * price);
        const costBasis = round(row.cost);
        items.push({
            instrument,
            quantity: row.quantity,
            averagePrice,
            costBasis,
            marketValue,
            unrealizedGain: round(marketValue - costBasis),
            unrealizedGainPct: costBasis > 0 ? round(((marketValue - costBasis) / costBasis) * 100) : 0,
            hasQuote: instrument.lastPrice != null,
            updatedAt: instrument.updatedAt
        });
    }
    const totalCostBasis = round(items.reduce((sum, item) => sum + item.costBasis, 0));
    const totalMarketValue = round(items.reduce((sum, item) => sum + item.marketValue, 0));
    return {
        items,
        totalCount: items.length,
        totalCostBasis,
        totalMarketValue,
        totalUnrealizedGain: round(totalMarketValue - totalCostBasis),
        mixedCurrencies: false
    };
}

export function mortgageRemainingFor(assetPublicId: string): number {
    return demoDb()
        .liabilities.filter((item) => item.assetPublicId === assetPublicId && item.type === 'hypotheque' && item.status === 'active')
        .reduce((sum, item) => sum + item.remainingAmount, 0);
}

export function bucketOf<T>(record: Record<string, T[]>, assetId: string): T[] {
    record[assetId] ??= [];
    return record[assetId];
}

export function newId(): string {
    return createPublicId();
}

export function notFound(message: string): never {
    throw new AppError(message, 404);
}

type WealthResult = { status: number; body: unknown } | null;

function match(path: string, pattern: string): Record<string, string> | null {
    const actual = path.split('/').filter(Boolean);
    const expected = pattern.split('/').filter(Boolean);
    if (actual.length !== expected.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < expected.length; i += 1) {
        if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
        else if (expected[i] !== actual[i]) return null;
    }
    return params;
}

function ok(body: unknown): WealthResult {
    return { status: 200, body };
}

function noContent(): WealthResult {
    return { status: 204, body: undefined };
}

function tierName(id: string | null): string | null {
    if (!id) return null;
    return demoDb().tiers.find((item) => item.publicId === id)?.name ?? null;
}

function friendOf(userPublicId: string) {
    const friend = demoDb().friendsDirectory.find((item) => item.userPublicId === userPublicId);
    if (!friend) notFound('Ami introuvable.');
    return {
        publicId: friend.userPublicId,
        username: friend.username,
        firstName: friend.firstName,
        name: friend.name,
        profilePicture: friend.profilePicture
    };
}

/** Routes patrimoine : dettes, placements, immobilier. `null` si le chemin n’est pas concerné. */
export function routeWealth(method: string, path: string, query: URLSearchParams, body: unknown): WealthResult {
    const db = demoDb();
    if (path === '/api/liabilities' && method === 'GET') {
        let items = db.liabilities.map((item) => refreshLiability(item));
        const type = query.get('type');
        const status = query.get('status');
        if (type) items = items.filter((item) => item.type === type);
        if (status) items = items.filter((item) => item.status === status);
        return ok({ items, totalCount: items.length });
    }
    if (path === '/api/liabilities' && method === 'POST') return ok(createLiability(body));
    const remaining = match(path, '/api/liabilities/:id/remaining-amount');
    if (remaining && method === 'POST') return ok(setLiabilityRemaining(remaining.id, body));
    const liabilityId = match(path, '/api/liabilities/:id');
    if (liabilityId && method === 'GET') return ok(findLiability(liabilityId.id));
    if (liabilityId && method === 'PUT') return ok(updateLiability(liabilityId.id, body));
    if (liabilityId && method === 'DELETE') {
        findLiability(liabilityId.id);
        db.liabilities = db.liabilities.filter((item) => item.publicId !== liabilityId.id);
        return noContent();
    }

    if (path === '/api/personal-loans' && method === 'GET') {
        let items = db.personalLoans.map((item) => refreshLoan(item));
        const status = query.get('status');
        const direction = query.get('direction');
        if (status) items = items.filter((item) => item.status === status);
        if (direction) items = items.filter((item) => item.direction === direction);
        return ok({
            items,
            totalCount: items.length,
            totalLent: round(
                items
                    .filter((item) => item.direction === 'pret' && item.status === 'active')
                    .reduce((sum, item) => sum + item.remainingAmount, 0)
            ),
            totalBorrowed: round(
                items
                    .filter((item) => item.direction === 'emprunt' && item.status === 'active')
                    .reduce((sum, item) => sum + item.remainingAmount, 0)
            ),
            currency: 'CHF'
        });
    }
    if (path === '/api/personal-loans' && method === 'POST') return ok(createLoan(body));
    const loanId = match(path, '/api/personal-loans/:id');
    if (loanId && method === 'GET') return ok(findLoan(loanId.id));
    if (loanId && method === 'PUT') return ok(updateLoan(loanId.id, body));
    if (loanId && method === 'DELETE') {
        findLoan(loanId.id);
        db.personalLoans = db.personalLoans.filter((item) => item.publicId !== loanId.id);
        return noContent();
    }

    if (path === '/api/shared-debts' && method === 'GET') return ok(listShared(query));
    if (path === '/api/shared-debts' && method === 'POST') return ok(createShared(body));
    const settle = match(path, '/api/shared-debts/:id/settle');
    if (settle && method === 'POST') return ok(settleShared(settle.id, body));
    const cancel = match(path, '/api/shared-debts/:id/cancel');
    if (cancel && method === 'POST') return ok(cancelShared(cancel.id));
    const sharedId = match(path, '/api/shared-debts/:id');
    if (sharedId && method === 'GET') return ok(findShared(sharedId.id));
    if (sharedId && method === 'PUT') return ok(updateShared(sharedId.id, body));
    if (sharedId && method === 'DELETE') {
        findShared(sharedId.id);
        db.sharedDebts = db.sharedDebts.filter((item) => item.publicId !== sharedId.id);
        return noContent();
    }

    if (path === '/api/instruments' && method === 'GET') {
        const search = query.get('search')?.trim().toLowerCase();
        const type = query.get('type');
        const items = db.instruments.filter((item) => {
            if (type && item.type !== type) return false;
            if (!search) return true;
            return item.symbol.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
        });
        return ok(pageOf(items, query, 50));
    }
    if (path === '/api/instruments' && method === 'POST') return ok(createInstrument(body));
    const price = match(path, '/api/instruments/:id/price');
    if (price && method === 'POST') return ok(setInstrumentPrice(price.id, body));
    const instrumentId = match(path, '/api/instruments/:id');
    if (instrumentId && method === 'GET') return ok(findInstrument(instrumentId.id));
    if (instrumentId && method === 'PUT') return ok(updateInstrument(instrumentId.id, body));
    if (instrumentId && method === 'DELETE') {
        findInstrument(instrumentId.id);
        db.instruments = db.instruments.filter((item) => item.publicId !== instrumentId.id);
        return noContent();
    }

    const positions = match(path, '/api/accounts/:id/positions');
    if (positions && method === 'GET') return ok(positionsFor(positions.id));
    const operations = match(path, '/api/accounts/:id/operations');
    if (operations && method === 'GET') return ok(pageOf(listOperations(operations.id, query), query));
    if (operations && method === 'POST') return ok(createOperation(operations.id, body));
    const operation = match(path, '/api/accounts/:id/operations/:operationId');
    if (operation && method === 'GET') return ok(findOperation(operation.id, operation.operationId));
    if (operation && method === 'PUT') return ok(updateOperation(operation.id, operation.operationId, body));
    if (operation && method === 'DELETE') {
        db.operations = db.operations.filter((item) => item.publicId !== operation.operationId);
        return noContent();
    }

    const estate = match(path, '/api/assets/:id/real-estate/:resource');
    if (estate && method === 'GET')
        return ok({ items: estateList(estate.id, estate.resource), totalCount: estateList(estate.id, estate.resource).length });
    if (estate && method === 'POST') return ok(createEstate(estate.id, estate.resource, body));
    const estateItem = match(path, '/api/assets/:id/real-estate/:resource/:itemId');
    if (estateItem && method === 'GET') return ok(findEstate(estateItem.id, estateItem.resource, estateItem.itemId));
    if (estateItem && method === 'PUT') return ok(updateEstate(estateItem.id, estateItem.resource, estateItem.itemId, body));
    if (estateItem && method === 'DELETE') {
        removeEstate(estateItem.id, estateItem.resource, estateItem.itemId);
        return noContent();
    }
    return null;
}

function findLiability(id: string) {
    const item = demoDb().liabilities.find((row) => row.publicId === id);
    if (!item) notFound('Passif introuvable.');
    return refreshLiability(item);
}

function asRecord(body: unknown): Record<string, unknown> {
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function createLiability(body: unknown) {
    const raw = asRecord(body);
    const initial = Number(raw.initialAmount) || 0;
    const remaining = raw.remainingAmount == null ? initial : Number(raw.remainingAmount);
    const created: Liability = refreshLiability({
        publicId: newId(),
        name: String(raw.name ?? ''),
        type: (raw.type as Liability['type']) ?? 'other',
        lenderTierPublicId: (raw.lenderTierPublicId as string | null) ?? null,
        lenderTierName: null,
        assetPublicId: (raw.assetPublicId as string | null) ?? null,
        initialAmount: initial,
        remainingAmount: remaining,
        repaidAmount: 0,
        percentRepaid: 0,
        currency: (raw.currency as Liability['currency']) ?? 'CHF',
        interestRate: (raw.interestRate as number | null) ?? null,
        startDate: (raw.startDate as string | null) ?? null,
        plannedEndDate: (raw.plannedEndDate as string | null) ?? null,
        status: 'active',
        createdAt: stamp(),
        updatedAt: null,
        residualValue: (raw.residualValue as number | null) ?? null,
        recurringExpensePublicId: (raw.recurringExpensePublicId as string | null) ?? null,
        recurringExpenseName: null,
        amortizationPerDue: (raw.amortizationPerDue as number | null) ?? null
    });
    demoDb().liabilities.unshift(created);
    return created;
}

function updateLiability(id: string, body: unknown) {
    const item = findLiability(id);
    const raw = asRecord(body);
    item.name = String(raw.name ?? item.name);
    item.type = (raw.type as Liability['type']) ?? item.type;
    item.initialAmount = Number(raw.initialAmount ?? item.initialAmount);
    item.remainingAmount = Number(raw.remainingAmount ?? item.remainingAmount);
    item.currency = (raw.currency as Liability['currency']) ?? item.currency;
    item.interestRate = (raw.interestRate as number | null) ?? null;
    item.startDate = (raw.startDate as string | null) ?? null;
    item.plannedEndDate = (raw.plannedEndDate as string | null) ?? null;
    item.lenderTierPublicId = (raw.lenderTierPublicId as string | null) ?? null;
    item.assetPublicId = (raw.assetPublicId as string | null) ?? null;
    item.residualValue = (raw.residualValue as number | null) ?? null;
    item.recurringExpensePublicId = (raw.recurringExpensePublicId as string | null) ?? null;
    item.amortizationPerDue = (raw.amortizationPerDue as number | null) ?? null;
    if (raw.status === 'annule') item.status = 'annule';
    item.updatedAt = stamp();
    return refreshLiability(item);
}

function setLiabilityRemaining(id: string, body: unknown) {
    const item = findLiability(id);
    item.remainingAmount = Number(asRecord(body).remainingAmount) || 0;
    item.updatedAt = stamp();
    return refreshLiability(item);
}

function findLoan(id: string) {
    const item = demoDb().personalLoans.find((row) => row.publicId === id);
    if (!item) notFound('Prêt introuvable.');
    return refreshLoan(item);
}

function createLoan(body: unknown) {
    const raw = asRecord(body);
    const initial = Number(raw.initialAmount) || 0;
    const created: PersonalLoan = refreshLoan({
        publicId: newId(),
        direction: (raw.direction as PersonalLoan['direction']) ?? 'pret',
        counterpartTierPublicId: String(raw.counterpartTierPublicId ?? ''),
        counterpartName: tierName(String(raw.counterpartTierPublicId ?? '')),
        label: (raw.label as string | null) ?? null,
        initialAmount: initial,
        remainingAmount: raw.remainingAmount == null ? initial : Number(raw.remainingAmount),
        repaidAmount: 0,
        percentRepaid: 0,
        currency: (raw.currency as PersonalLoan['currency']) ?? 'CHF',
        startDate: (raw.startDate as string | null) ?? null,
        plannedEndDate: (raw.plannedEndDate as string | null) ?? null,
        status: 'active',
        isOverdue: false,
        notes: (raw.notes as string | null) ?? null,
        createdAt: stamp(),
        updatedAt: null
    });
    demoDb().personalLoans.unshift(created);
    return created;
}

function updateLoan(id: string, body: unknown) {
    const item = findLoan(id);
    const raw = asRecord(body);
    item.direction = (raw.direction as PersonalLoan['direction']) ?? item.direction;
    item.counterpartTierPublicId = String(raw.counterpartTierPublicId ?? item.counterpartTierPublicId);
    item.label = (raw.label as string | null) ?? null;
    item.initialAmount = Number(raw.initialAmount ?? item.initialAmount);
    item.remainingAmount = Number(raw.remainingAmount ?? item.remainingAmount);
    item.startDate = (raw.startDate as string | null) ?? item.startDate;
    item.plannedEndDate = (raw.plannedEndDate as string | null) ?? null;
    item.currency = (raw.currency as PersonalLoan['currency']) ?? item.currency;
    item.notes = (raw.notes as string | null) ?? item.notes;
    if (raw.status === 'annule') item.status = 'annule';
    item.updatedAt = stamp();
    return refreshLoan(item);
}

function listShared(query: URLSearchParams) {
    let items = demoDb().sharedDebts.map((item) => refreshShared(item));
    const role = query.get('role');
    const status = query.get('status');
    if (role) items = items.filter((item) => item.role === role);
    if (status) items = items.filter((item) => item.status === status);
    return {
        items,
        totalCount: items.length,
        totalOwedToMe: round(items.filter((item) => item.role === 'creditor').reduce((sum, item) => sum + item.remainingAmount, 0)),
        totalIOwe: round(items.filter((item) => item.role === 'debtor').reduce((sum, item) => sum + item.remainingAmount, 0)),
        currency: 'CHF' as const
    };
}

function findShared(id: string) {
    const item = demoDb().sharedDebts.find((row) => row.publicId === id);
    if (!item) notFound('Dette introuvable.');
    return refreshShared(item);
}

function createShared(body: unknown) {
    const raw = asRecord(body);
    const amount = Number(raw.amount) || 0;
    const created: SharedDebt = refreshShared({
        publicId: newId(),
        role: 'creditor',
        counterpart: friendOf(String(raw.debtorUserPublicId ?? '')),
        label: String(raw.label ?? 'Dette'),
        amount,
        repaidAmount: 0,
        remainingAmount: amount,
        currency: (raw.currency as SharedDebt['currency']) ?? 'CHF',
        status: 'aRembourser',
        dueDate: (raw.dueDate as string | null) ?? null,
        settledAt: null,
        transactionPublicId: (raw.transactionPublicId as string | null) ?? null,
        createdAt: stamp(),
        updatedAt: null
    });
    demoDb().sharedDebts.unshift(created);
    return created;
}

function updateShared(id: string, body: unknown) {
    const item = findShared(id);
    const raw = asRecord(body);
    item.label = String(raw.label ?? item.label);
    item.amount = Number(raw.amount ?? item.amount);
    item.dueDate = (raw.dueDate as string | null) ?? null;
    item.updatedAt = stamp();
    return refreshShared(item);
}

function settleShared(id: string, body: unknown) {
    const item = findShared(id);
    const amount = Number(asRecord(body).amount ?? item.remainingAmount);
    item.repaidAmount = round(item.repaidAmount + amount);
    item.updatedAt = stamp();
    const next = refreshShared(item);
    if (next.status === 'remboursee') next.settledAt = stamp();
    return next;
}

function cancelShared(id: string) {
    const item = findShared(id);
    item.status = 'canceled';
    item.settledAt = stamp();
    item.updatedAt = item.settledAt;
    return item;
}

function findInstrument(id: string) {
    const item = demoDb().instruments.find((row) => row.publicId === id);
    if (!item) notFound('Instrument introuvable.');
    return item;
}

function createInstrument(body: unknown) {
    const raw = asRecord(body);
    const created: Instrument = {
        publicId: newId(),
        symbol: String(raw.symbol ?? '').toUpperCase(),
        name: String(raw.name ?? ''),
        type: (raw.type as Instrument['type']) ?? 'other',
        currency: (raw.currency as Instrument['currency']) ?? 'CHF',
        isin: (raw.isin as string | null) ?? null,
        lastPrice: raw.lastPrice == null ? null : Number(raw.lastPrice),
        lastPriceDate: (raw.lastPriceDate as string | null) ?? null,
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().instruments.unshift(created);
    return created;
}

function updateInstrument(id: string, body: unknown) {
    const item = findInstrument(id);
    const raw = asRecord(body);
    item.name = String(raw.name ?? item.name);
    item.isin = (raw.isin as string | null) ?? null;
    item.updatedAt = stamp();
    return item;
}

function setInstrumentPrice(id: string, body: unknown) {
    const item = findInstrument(id);
    const raw = asRecord(body);
    item.lastPrice = Number(raw.price) || 0;
    item.lastPriceDate = (raw.date as string | null) ?? new Date().toISOString().slice(0, 10);
    item.updatedAt = stamp();
    return item;
}

function listOperations(accountId: string, query: URLSearchParams) {
    const instrument = query.get('instrumentPublicId');
    const type = query.get('type');
    const from = query.get('from');
    const to = query.get('to');
    return demoDb()
        .operations.filter((item) => item.accountPublicId === accountId)
        .filter((item) => !instrument || item.instrument.publicId === instrument)
        .filter((item) => !type || item.type === type)
        .filter((item) => !from || item.operationDate >= from)
        .filter((item) => !to || item.operationDate <= to)
        .map((item) => ({ ...item, instrument: findInstrument(item.instrument.publicId) }));
}

function findOperation(accountId: string, operationId: string) {
    const item = demoDb().operations.find((row) => row.accountPublicId === accountId && row.publicId === operationId);
    if (!item) notFound('Opération introuvable.');
    item.instrument = findInstrument(item.instrument.publicId);
    return item;
}

function createOperation(accountId: string, body: unknown) {
    const raw = asRecord(body);
    const instrument = findInstrument(String(raw.instrumentPublicId ?? ''));
    const created: InvestmentOperation = {
        publicId: newId(),
        accountPublicId: accountId,
        instrument,
        type: (raw.type as InvestmentOperation['type']) ?? 'achat',
        operationDate: String(raw.operationDate ?? new Date().toISOString().slice(0, 10)),
        quantity: raw.quantity == null ? null : Number(raw.quantity),
        unitPrice: raw.unitPrice == null ? null : Number(raw.unitPrice),
        totalAmount: raw.totalAmount == null ? null : Number(raw.totalAmount),
        currency: instrument.currency,
        transactionPublicId: (raw.transactionPublicId as string | null) ?? null,
        notes: (raw.notes as string | null) ?? null,
        createdAt: stamp(),
        updatedAt: null
    };
    demoDb().operations.unshift(created);
    return created;
}

function updateOperation(accountId: string, operationId: string, body: unknown) {
    const item = findOperation(accountId, operationId);
    const raw = asRecord(body);
    if (raw.instrumentPublicId) item.instrument = findInstrument(String(raw.instrumentPublicId));
    if (raw.type) item.type = raw.type as InvestmentOperation['type'];
    if (raw.operationDate) item.operationDate = String(raw.operationDate);
    if (raw.quantity != null) item.quantity = Number(raw.quantity);
    if (raw.unitPrice != null) item.unitPrice = Number(raw.unitPrice);
    if (raw.totalAmount != null) item.totalAmount = Number(raw.totalAmount);
    item.notes = (raw.notes as string | null) ?? item.notes;
    item.updatedAt = stamp();
    return item;
}

function estateBucket(assetId: string, resource: string): unknown[] {
    const db = demoDb();
    if (resource === 'units') return bucketOf(db.realEstateUnits, assetId);
    if (resource === 'charges') return bucketOf(db.realEstateCharges, assetId);
    if (resource === 'maintenance') return bucketOf(db.realEstateMaintenance, assetId);
    return [];
}

function estateList(assetId: string, resource: string) {
    return estateBucket(assetId, resource);
}

function createEstate(assetId: string, resource: string, body: unknown) {
    const raw = asRecord(body);
    const bucket = estateBucket(assetId, resource);
    const created = {
        ...raw,
        publicId: newId(),
        currency: 'CHF',
        tierName: tierName((raw.tierPublicId as string | null) ?? null),
        providerTierName: tierName((raw.providerTierPublicId as string | null) ?? null),
        monthlyEquivalent: raw.periodicity === 'mensuelle' ? Number(raw.amount) || 0 : 0,
        isCurrent: true,
        isOccupied: false,
        createdAt: stamp(),
        updatedAt: null
    };
    bucket.unshift(created);
    return created;
}

function findEstate(assetId: string, resource: string, itemId: string) {
    const item = estateBucket(assetId, resource).find((row) => (row as { publicId?: string }).publicId === itemId);
    if (!item) notFound('Élément introuvable.');
    return item;
}

function updateEstate(assetId: string, resource: string, itemId: string, body: unknown) {
    const current = findEstate(assetId, resource, itemId) as Record<string, unknown>;
    Object.assign(current, asRecord(body), { updatedAt: stamp(), publicId: itemId });
    return current;
}

function removeEstate(assetId: string, resource: string, itemId: string) {
    const bucket = estateBucket(assetId, resource);
    const index = bucket.findIndex((row) => (row as { publicId?: string }).publicId === itemId);
    if (index < 0) notFound('Élément introuvable.');
    bucket.splice(index, 1);
}
