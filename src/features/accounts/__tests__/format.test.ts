import { describe, expect, it } from 'vitest';
import {
    emptyToNull,
    formatAccountBalance,
    formatSnapshotDate,
    parseAccountAmount,
    todayYmd,
    ymdToSnapshotIso
} from '@/features/accounts/format';

describe('snapshot date helpers', () => {
    it('ymdToSnapshotIso utilise midi UTC avec suffixe Z (checklist §5)', () => {
        expect(ymdToSnapshotIso('2026-08-23')).toBe('2026-08-23T12:00:00.000Z');
        expect(ymdToSnapshotIso(' 2026-01-01 ')).toBe('2026-01-01T12:00:00.000Z');
        expect(ymdToSnapshotIso('2026-08-23').endsWith('Z')).toBe(true);
    });

    it('ymdToSnapshotIso ne décale pas vs minuit local → toISOString', () => {
        // Régression : `new Date(y, m-1, d).toISOString()` en UTC+2 donnait la veille.
        const localMidnightIso = new Date(2026, 7, 23).toISOString();
        const fixed = ymdToSnapshotIso('2026-08-23');
        expect(fixed.startsWith('2026-08-23')).toBe(true);
        if (localMidnightIso.startsWith('2026-08-22')) {
            expect(fixed).not.toBe(localMidnightIso);
        }
    });

    it('formatSnapshotDate affiche le jour calendaire indépendamment du fuseau', () => {
        expect(formatSnapshotDate('2026-08-23T12:00:00.000Z', 'en-GB')).toMatch(/23/);
        expect(formatSnapshotDate('2026-08-23T00:00:00.000Z', 'en-GB')).toMatch(/23/);
        expect(formatSnapshotDate('2026-08-23', 'en-GB')).toMatch(/23/);
    });

    it('todayYmd reflète la date locale fournie', () => {
        expect(todayYmd(new Date(2026, 7, 23, 23, 30))).toBe('2026-08-23');
    });
});

describe('parseAccountAmount', () => {
    it('accepte 0 et les nombres finis', () => {
        expect(parseAccountAmount(0)).toBe(0);
        expect(parseAccountAmount('0')).toBe(0);
        expect(parseAccountAmount(-12.5)).toBe(-12.5);
        expect(parseAccountAmount('1,5')).toBe(1.5);
        expect(parseAccountAmount(' 42.10 ')).toBe(42.1);
    });

    it('refuse vide, NaN et Infinity (pas de fallback vers 0)', () => {
        expect(parseAccountAmount('')).toBeNull();
        expect(parseAccountAmount('   ')).toBeNull();
        expect(parseAccountAmount(null)).toBeNull();
        expect(parseAccountAmount(undefined)).toBeNull();
        expect(parseAccountAmount('abc')).toBeNull();
        expect(parseAccountAmount(Number.NaN)).toBeNull();
        expect(parseAccountAmount(Number.POSITIVE_INFINITY)).toBeNull();
        expect(parseAccountAmount(Number('abc'))).toBeNull();
    });
});

describe('emptyToNull (PUT owner — checklist §2)', () => {
    it('vide iban / accountNumber / color en null', () => {
        expect(emptyToNull('')).toBeNull();
        expect(emptyToNull('   ')).toBeNull();
        expect(emptyToNull(null)).toBeNull();
        expect(emptyToNull(undefined)).toBeNull();
        expect(emptyToNull('CH93…')).toBe('CH93…');
        expect(emptyToNull('  #4F46E5  ')).toBe('#4F46E5');
    });
});

describe('formatAccountBalance', () => {
    it('affiche currentBalance / initialBalance avec la devise', () => {
        const formatted = formatAccountBalance(100, 'CHF', 'fr-CH');
        expect(formatted).toMatch(/100/);
        expect(formatted.toUpperCase()).toMatch(/CHF|FR\./);
    });
});
