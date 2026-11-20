import { describe, expect, it } from 'vitest';
import {
    canWriteInvestments,
    formatGainPct,
    formatSignedMoney,
    isInvestmentAccount,
    isValidIsin,
    normalizePositionsResult,
    operationAmount,
    operationSignedAmount,
    parsePrice,
    parseQuantity,
    totalGainPct
} from '@/features/investments/format';
import { investmentsAccountPath, investmentsAccountPublicIdFromPath, INVESTMENTS_BASE } from '@/features/investments/paths';
import type { PositionsResult } from '@/features/investments/types';

const MINUS = '−';

describe('investments format', () => {
    it('compte de placement = investissement / crypto actif ; écriture = propriétaire', () => {
        expect(isInvestmentAccount({ type: 'investissement', isActive: true })).toBe(true);
        expect(isInvestmentAccount({ type: 'crypto', isActive: true })).toBe(true);
        expect(isInvestmentAccount({ type: 'courant', isActive: true })).toBe(false);
        expect(isInvestmentAccount({ type: 'crypto', isActive: false })).toBe(false);
        expect(canWriteInvestments({ type: 'investissement', isActive: true, myRole: 'owner' })).toBe(true);
        expect(canWriteInvestments({ type: 'investissement', isActive: true, myRole: 'editor' })).toBe(false);
        expect(canWriteInvestments(null)).toBe(false);
    });

    it('valide l’ISIN (format + chiffre de contrôle)', () => {
        expect(isValidIsin('CH0038863350')).toBe(true);
        expect(isValidIsin('us0378331005')).toBe(true);
        expect(isValidIsin('US0378331006')).toBe(false);
        expect(isValidIsin('US0378331006', { checkDigit: false })).toBe(true);
        expect(isValidIsin('CH003886335')).toBe(false);
    });

    it('parse quantités (8 décimales) et prix (4 décimales)', () => {
        expect(parseQuantity('1,5')).toBe(1.5);
        expect(parseQuantity('0.123456789')).toBe(0.12345679);
        expect(parseQuantity('-1')).toBeNull();
        expect(parseQuantity('abc')).toBeNull();
        expect(parsePrice('112.123456')).toBe(112.1235);
        expect(parsePrice('')).toBeNull();
    });

    it('montant d’opération : total sinon quantité × prix, signé selon le type', () => {
        expect(operationAmount({ quantity: 10, unitPrice: 112.5, totalAmount: null })).toBe(1125);
        expect(operationAmount({ quantity: 10, unitPrice: 112.5, totalAmount: 1130 })).toBe(1130);
        expect(operationSignedAmount({ type: 'achat', quantity: 10, unitPrice: 112.5, totalAmount: null })).toBe(-1125);
        expect(operationSignedAmount({ type: 'dividende', quantity: null, unitPrice: null, totalAmount: 42 })).toBe(42);
        expect(operationSignedAmount({ type: 'frais', quantity: null, unitPrice: null, totalAmount: 5 })).toBe(-5);
    });

    it('signes : + pour un gain, vrai moins pour une perte', () => {
        expect(formatSignedMoney(400, 'CHF').startsWith('+')).toBe(true);
        expect(formatSignedMoney(-400, 'CHF').startsWith(MINUS)).toBe(true);
        expect(formatGainPct(18.18)).toBe('+18.18 %');
        expect(formatGainPct(-2.5)).toBe(`${MINUS}2.50 %`);
        expect(formatGainPct(null)).toBe('');
    });

    it('totaux : null si devises mixtes, % calculé sinon', () => {
        const raw = {
            items: [],
            totalCount: 0,
            totalCostBasis: '2200',
            totalMarketValue: 2600,
            totalUnrealizedGain: 400,
            mixedCurrencies: false
        } as unknown as PositionsResult;
        const normalized = normalizePositionsResult(raw);
        expect(normalized.totalCostBasis).toBe(2200);
        expect(totalGainPct(normalized)).toBe(18.18);
        expect(totalGainPct({ ...normalized, mixedCurrencies: true })).toBeNull();
        expect(totalGainPct({ ...normalized, totalCostBasis: null })).toBeNull();
    });

    it('chemins par compte', () => {
        expect(investmentsAccountPath('abc')).toBe(`${INVESTMENTS_BASE}/abc`);
        expect(investmentsAccountPath(' ')).toBe(INVESTMENTS_BASE);
        expect(investmentsAccountPublicIdFromPath(`${INVESTMENTS_BASE}/abc?x=1`)).toBe('abc');
        expect(investmentsAccountPublicIdFromPath(INVESTMENTS_BASE)).toBeNull();
    });
});
