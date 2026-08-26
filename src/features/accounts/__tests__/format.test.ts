import { describe, expect, it } from 'vitest';
import {
    emptyToNull,
    formatAccountBalance,
    formatSnapshotDate,
    isAccountFieldHidden,
    isBalanceHidden,
    isValidAccountColor,
    isValidIbanFormat,
    normalizeAccountColor,
    parseAccountAmount,
    resolveAccountBalanceDisplay,
    safeAccountColor,
    isLightAccountColor,
    todayYmd,
    ymdToSnapshotIso
} from '@/features/accounts/format';

describe('snapshot date helpers', () => {
    it('ymdToSnapshotIso utilise l’heure actuelle pour aujourd’hui (local)', () => {
        const now = new Date(2026, 7, 26, 14, 30, 15, 123);
        const iso = ymdToSnapshotIso('2026-08-26', now);
        expect(iso).toBe(now.toISOString());
        expect(iso.endsWith('Z')).toBe(true);
    });

    it('ymdToSnapshotIso utilise midi UTC pour un jour passé', () => {
        const now = new Date(2026, 7, 26, 14, 30, 0);
        expect(ymdToSnapshotIso('2026-08-23', now)).toBe('2026-08-23T12:00:00.000Z');
        expect(ymdToSnapshotIso(' 2026-01-01 ', now)).toBe('2026-01-01T12:00:00.000Z');
    });

    it('ymdToSnapshotIso ne décale pas un jour passé vs minuit local → toISOString', () => {
        const now = new Date(2026, 7, 26, 14, 0, 0);
        const localMidnightIso = new Date(2026, 7, 23).toISOString();
        const fixed = ymdToSnapshotIso('2026-08-23', now);
        expect(fixed).toBe('2026-08-23T12:00:00.000Z');
        if (localMidnightIso.startsWith('2026-08-22')) {
            expect(fixed).not.toBe(localMidnightIso);
        }
    });

    it('ymdToSnapshotIso n’utilise jamais la fin de journée pour aujourd’hui', () => {
        const now = new Date(2026, 7, 26, 9, 0, 0);
        const iso = ymdToSnapshotIso(todayYmd(now), now);
        expect(iso).not.toMatch(/T23:59:59/);
        expect(iso).toBe(now.toISOString());
    });

    it('ymdToSnapshotIso clamp une date future à maintenant', () => {
        const now = new Date(2026, 7, 26, 14, 0, 0);
        expect(ymdToSnapshotIso('2026-08-30', now)).toBe(now.toISOString());
    });

    it('todayYmd reflète la date locale fournie', () => {
        expect(todayYmd(new Date(2026, 7, 23, 23, 30))).toBe('2026-08-23');
    });

    it('formatSnapshotDate affiche le jour calendaire indépendamment du fuseau', () => {
        expect(formatSnapshotDate('2026-08-23T12:00:00.000Z', 'en-GB')).toMatch(/23/);
        expect(formatSnapshotDate('2026-08-23T00:00:00.000Z', 'en-GB')).toMatch(/23/);
        expect(formatSnapshotDate('2026-08-23', 'en-GB')).toMatch(/23/);
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

describe('account color helpers', () => {
    it('accepte #RGB, #RRGGBB, #RRGGBBAA et refuse le reste', () => {
        expect(isValidAccountColor(null)).toBe(true);
        expect(isValidAccountColor('')).toBe(true);
        expect(isValidAccountColor('#FFF')).toBe(true);
        expect(isValidAccountColor('#4F46E5')).toBe(true);
        expect(isValidAccountColor('#4f46e5aa')).toBe(true);
        expect(isValidAccountColor('4F46E5')).toBe(false);
        expect(isValidAccountColor('#GG0000')).toBe(false);
        expect(isValidAccountColor('red')).toBe(false);
        expect(isValidAccountColor('#12345')).toBe(false);
    });

    it('normalise en majuscules avec #, ou null pour vider', () => {
        expect(normalizeAccountColor(null)).toBeNull();
        expect(normalizeAccountColor('')).toBeNull();
        expect(normalizeAccountColor('  #4f46e5  ')).toBe('#4F46E5');
        expect(normalizeAccountColor('#abc')).toBe('#ABC');
        expect(normalizeAccountColor('#4f46e5aa')).toBe('#4F46E5AA');
    });

    it('safeAccountColor ignore les valeurs API invalides', () => {
        expect(safeAccountColor('#4F46E5')).toBe('#4F46E5');
        expect(safeAccountColor('red')).toBeNull();
        expect(safeAccountColor(null)).toBeNull();
        expect(safeAccountColor('')).toBeNull();
    });

    it('isLightAccountColor guide le contraste du texte avatar', () => {
        expect(isLightAccountColor(null)).toBe(true);
        expect(isLightAccountColor('#F59E0B')).toBe(true);
        expect(isLightAccountColor('#4F46E5')).toBe(false);
        expect(isLightAccountColor('#EF4444')).toBe(false);
    });
});

describe('formatAccountBalance', () => {
    it('affiche currentBalance / initialBalance avec la devise', () => {
        const formatted = formatAccountBalance(100, 'CHF', 'fr-CH');
        expect(formatted).toMatch(/100/);
        expect(formatted.toUpperCase()).toMatch(/CHF|FR\./);
    });
});

describe('hidden fields helpers', () => {
    it('distingue null caché vs null vide', () => {
        expect(isAccountFieldHidden({ hiddenFields: ['iban'] }, 'iban')).toBe(true);
        expect(isAccountFieldHidden({ hiddenFields: [] }, 'iban')).toBe(false);
        expect(isBalanceHidden({ hiddenFields: ['balance'] })).toBe(true);
        expect(resolveAccountBalanceDisplay(null, 'CHF', true).hidden).toBe(true);
        expect(resolveAccountBalanceDisplay(null, 'CHF', false).hidden).toBe(false);
        expect(resolveAccountBalanceDisplay(10, 'CHF', true).hidden).toBe(false);
    });

    it('valide IBAN (longueur + checksum mod-97)', () => {
        expect(isValidIbanFormat('')).toBe(true);
        expect(isValidIbanFormat('CH93 0076 2011 6238 5295 7')).toBe(true);
        expect(isValidIbanFormat('ch9300762011623852957')).toBe(true);
        expect(isValidIbanFormat('GB82WEST12345698765432')).toBe(true);
        expect(isValidIbanFormat('CH9É0076')).toBe(false);
        expect(isValidIbanFormat('1234')).toBe(false);
        expect(isValidIbanFormat('CH00X')).toBe(false);
        expect(isValidIbanFormat('CH9300762011623852958')).toBe(false);
    });
});
