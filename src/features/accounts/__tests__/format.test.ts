import { describe, expect, it } from 'vitest';
import { formatSnapshotDate, todayYmd, ymdToSnapshotIso } from '../format';

describe('snapshot date helpers', () => {
    it('ymdToSnapshotIso utilise midi UTC (pas de décalage de jour)', () => {
        expect(ymdToSnapshotIso('2026-08-23')).toBe('2026-08-23T12:00:00.000Z');
        expect(ymdToSnapshotIso(' 2026-01-01 ')).toBe('2026-01-01T12:00:00.000Z');
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
