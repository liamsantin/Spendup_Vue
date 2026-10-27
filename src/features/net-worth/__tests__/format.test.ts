import { describe, expect, it } from 'vitest';
import {
    breakdownLabel,
    buildLinePath,
    evolutionSeries,
    formatSignedDelta,
    monthLabel,
    normalizeOverview,
    normalizeSnapshotsResult,
    projectPoints,
    splitHeroAmount,
    stackedShares
} from '@/features/net-worth/format';
import type { NetWorthOverview, NetWorthSnapshot } from '@/features/net-worth/types';

function snapshot(periode: string, netWorth: number): NetWorthSnapshot {
    return {
        periode,
        totalAccounts: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: null,
        currency: 'CHF',
        computedAt: '2026-10-27T06:00:00Z'
    };
}

const overview: NetWorthOverview = normalizeOverview({
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
    excluded: [{ currency: 'EUR', accountsCount: 0, assetsCount: 1, liabilitiesCount: 0 }],
    lastSnapshot: { periode: '2026-10-01', netWorth: -284800, delta: 0 }
});

describe('normalizeOverview / normalizeSnapshotsResult', () => {
    it('remplit les valeurs manquantes et ignore les devises exclues vides', () => {
        const result = normalizeOverview({
            excluded: [{ currency: 'USD', accountsCount: 0, assetsCount: 0, liabilitiesCount: 0 }],
            lastSnapshot: null
        });
        expect(result.currency).toBe('CHF');
        expect(result.netWorth).toBe(0);
        expect(result.excluded).toEqual([]);
        expect(result.lastSnapshot).toBeNull();
        expect(result.friendsBalance).toEqual({ receivable: 0, payable: 0 });
    });

    it('accepte un tableau nu ou { items } et trie du plus ancien au plus récent', () => {
        const items = [snapshot('2026-10-01', 2), snapshot('2026-08-01', 1)];
        expect(normalizeSnapshotsResult(items).map((s) => s.periode)).toEqual(['2026-08-01', '2026-10-01']);
        expect(normalizeSnapshotsResult({ items }).map((s) => s.periode)).toEqual(['2026-08-01', '2026-10-01']);
        expect(normalizeSnapshotsResult(null)).toEqual([]);
    });
});

describe('splitHeroAmount', () => {
    it('sépare signe, entier, décimales et devise', () => {
        expect(splitHeroAmount(-284800, 'CHF')).toEqual({ sign: '−', main: '284’800', decimals: '.00', currency: 'CHF' });
        expect(splitHeroAmount(1234.5, 'EUR')).toEqual({ sign: '', main: '1’234', decimals: '.50', currency: 'EUR' });
    });
});

describe('formatSignedDelta', () => {
    it('préfixe « + » ou le vrai signe moins, rien pour zéro', () => {
        expect(formatSignedDelta(1200, 'CHF')).toBe('+1’200.00 CHF');
        expect(formatSignedDelta(-350, 'CHF')).toBe('−350.00 CHF');
        expect(formatSignedDelta(0, 'CHF')).toBe('0.00 CHF');
    });
});

describe('evolutionSeries', () => {
    it('ajoute le point courant et remplace le snapshot du mois en cours', () => {
        const points = evolutionSeries([snapshot('2026-10-01', -284800), snapshot('2026-09-01', -290000)], overview);
        expect(points.map((p) => p.periode)).toEqual(['2026-09-01', '2026-10-27']);
        expect(points.at(-1)).toEqual({ periode: '2026-10-27', netWorth: -284800, isCurrent: true });
    });

    it('sans aperçu, ne renvoie que les snapshots', () => {
        const points = evolutionSeries([snapshot('2026-09-01', 1)], null);
        expect(points).toEqual([{ periode: '2026-09-01', netWorth: 1, isCurrent: false }]);
    });
});

describe('projectPoints / buildLinePath', () => {
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const points = [
        { periode: '2026-08-01', netWorth: 0, isCurrent: false },
        { periode: '2026-09-01', netWorth: 50, isCurrent: false },
        { periode: '2026-10-27', netWorth: 100, isCurrent: true }
    ];

    it('projette min en bas, max en haut, x réparti sur la largeur utile', () => {
        const projected = projectPoints(points, 220, 120, padding);
        expect(projected.map((p) => p.x)).toEqual([10, 110, 210]);
        expect(projected.map((p) => p.y)).toEqual([110, 60, 10]);
    });

    it('construit un chemin M … L …', () => {
        expect(buildLinePath(points, 220, 120, padding)).toBe('M10,110 L110,60 L210,10');
        expect(buildLinePath([], 220, 120, padding)).toBe('');
    });

    it('centre une série plate', () => {
        const flat = projectPoints([points[0], { ...points[1], netWorth: 0 }], 220, 120, padding);
        expect(flat.map((p) => p.y)).toEqual([60, 60]);
    });
});

describe('stackedShares', () => {
    it('calcule des parts en % et neutralise les valeurs négatives', () => {
        const shares = stackedShares([
            { key: 'a', value: 75 },
            { key: 'b', value: 25 },
            { key: 'c', value: -10 }
        ]);
        expect(shares.map((s) => s.share)).toEqual([75, 25, 0]);
    });

    it('total nul → toutes les parts à 0', () => {
        expect(stackedShares([{ key: 'a', value: 0 }]).map((s) => s.share)).toEqual([0]);
    });
});

describe('breakdownLabel', () => {
    const i18n = {
        t: (key: string) => `T(${key})`,
        te: (key: string) => key.startsWith('netWorthPage.') || key === 'assetsPage.types.vehicule'
    };

    it('choisit la section selon le type et retombe sur le type brut', () => {
        expect(breakdownLabel('assets', 'pretAccorde', i18n)).toBe('T(netWorthPage.breakdown.pretAccorde)');
        expect(breakdownLabel('liabilities', 'compteCredit', i18n)).toBe('T(netWorthPage.breakdown.compteCredit)');
        expect(breakdownLabel('assets', 'vehicule', i18n)).toBe('T(assetsPage.types.vehicule)');
        expect(breakdownLabel('accounts', 'inconnu', i18n)).toBe('inconnu');
    });
});

describe('monthLabel', () => {
    it('rend le mois court et l’année sur deux chiffres', () => {
        expect(monthLabel('2026-10-01', 'en-US')).toMatch(/Oct/);
        expect(monthLabel('oops', 'fr-CH')).toBe('oops');
    });
});
