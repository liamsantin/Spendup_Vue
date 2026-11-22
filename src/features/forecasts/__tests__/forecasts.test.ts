import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import {
    cumulativePoints,
    forecastsLocation,
    isPlannedSource,
    lineTarget,
    parseYearQuery,
    plannedShare,
    type ForecastLine,
    type ForecastMonth,
    type YearForecast
} from '@/features/forecasts/forecasts';
import type { MonthInsights } from '@/features/dashboard/insights';
import DemoRoutes from '@/router/DemoRoutes';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';

const today = new Date(2026, 6, 18);

function month(partial: Partial<ForecastMonth>): ForecastMonth {
    return {
        month: '2026-08',
        phase: 'futur',
        flows: { income: 0, expense: 0, balance: 0, savingsRate: null, byKind: [], count: 0 },
        cumulativeBalance: 0,
        sources: [],
        lines: [],
        ...partial
    };
}

describe('adresse de la page Prévisions', () => {
    it('lit l’année, sinon l’année en cours', () => {
        expect(parseYearQuery('2027', today)).toBe(2027);
        expect(parseYearQuery(['2025'], today)).toBe(2025);
        expect(parseYearQuery('abc', today)).toBe(2026);
        expect(parseYearQuery('1800', today)).toBe(2026);
        expect(parseYearQuery(undefined, today)).toBe(2026);
    });

    it('garde une adresse sans paramètre pour l’année en cours', () => {
        expect(forecastsLocation(2026, today).query).toEqual({});
        expect(forecastsLocation(2027, today).query).toEqual({ y: '2027' });
    });

    it('place l’entrée dans le menu Analyses', () => {
        expect(idsFromPath('/app/planning/previsions')).toEqual({ openId: 'planning', activeId: 'forecasts' });
        expect(idsFromPath('/demo/planning/previsions').activeId).toBe('forecasts');
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/previsions');
        expect(page?.name).toBe('DemoAppForecasts');
        expect(String(page?.component)).not.toContain('DemoLockedPage');
    });
});

describe('helpers', () => {
    it('distingue le constaté du prévu', () => {
        expect(isPlannedSource('constate')).toBe(false);
        expect(isPlannedSource('recurrence')).toBe(true);
        expect(isPlannedSource('budget')).toBe(true);
        expect(isPlannedSource('moyenne')).toBe(true);
    });

    it('calcule la part prévue des sorties', () => {
        const m = month({
            flows: { income: 0, expense: 200, balance: -200, savingsRate: null, byKind: [], count: 2 },
            sources: [
                { source: 'constate', income: 0, expense: 50 },
                { source: 'recurrence', income: 0, expense: 100 },
                { source: 'moyenne', income: 0, expense: 50 }
            ]
        });
        expect(plannedShare(m)).toBe(0.75);
        expect(plannedShare(month({}))).toBe(0);
    });

    it('trace le cumul avec le zéro dans l’échelle', () => {
        const points = cumulativePoints([month({ cumulativeBalance: -100 }), month({ cumulativeBalance: 100 })], 100, 50);
        expect(points).toEqual([
            [0, 50],
            [100, 0]
        ]);
        expect(cumulativePoints([month({})], 100, 50)).toEqual([]);
        expect(cumulativePoints([month({}), month({})], 100, 50)).toEqual([
            [0, 50],
            [100, 50]
        ]);
    });

    it('cible la récurrence ou le budget d’une ligne prévue', () => {
        const base: ForecastLine = {
            direction: 'depense',
            label: 'Loyer',
            categoryPublicId: null,
            spendingKind: null,
            amount: 1,
            source: 'recurrence',
            recurrencePublicId: null,
            budgetPublicId: null
        };
        expect(lineTarget(base)).toBeNull();
        expect(lineTarget({ ...base, recurrencePublicId: 'r1' })).toEqual({ kind: 'recurrence', publicId: 'r1' });
        expect(lineTarget({ ...base, source: 'budget', budgetPublicId: 'b1' })).toEqual({ kind: 'budget', publicId: 'b1' });
    });
});

describe('GET /api/forecasts/year en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('renvoie 12 mois cohérents avec le résumé du mois', () => {
        const year = new Date().getFullYear();
        const forecast = handleDemoRequest('GET', `/api/forecasts/year?year=${year}`) as YearForecast;

        expect(forecast.year).toBe(year);
        expect(forecast.months).toHaveLength(12);
        expect(forecast.months.filter((m) => m.phase === 'courant')).toHaveLength(1);

        const first = forecast.months[0];
        const insights = handleDemoRequest('GET', `/api/insights/month?month=${first.month}`) as MonthInsights;
        expect(first.flows.income).toBe(insights.total.income);
        expect(first.flows.expense).toBe(insights.total.expense);

        const last = forecast.months[11];
        const sum = forecast.months.reduce((s, m) => s + m.flows.balance, 0);
        expect(last.cumulativeBalance).toBeCloseTo(sum, 2);

        for (const m of forecast.months) {
            const lineExpense = m.lines.filter((l) => l.direction === 'depense').reduce((s, l) => s + l.amount, 0);
            expect(lineExpense).toBeCloseTo(m.flows.expense, 2);
        }
    });

    it('refuse une année invalide', () => {
        expect(() => handleDemoRequest('GET', '/api/forecasts/year?year=1800')).toThrow();
    });
});
