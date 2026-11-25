import { describe, expect, it } from 'vitest';
import {
    dayTotal,
    formatOccurrenceAmount,
    groupByDay,
    isEditableOccurrence,
    monthSummary,
    occurrenceTimeRange,
    occurrenceTone,
    paymentStatus,
    sourceRoute,
    upcomingOutflows
} from '@/features/calendar/occurrences';
import type { CalendarOccurrence } from '@/features/calendar/types';

function occurrence(id: string, rest: Partial<CalendarOccurrence>): CalendarOccurrence {
    return {
        id,
        sourceKey: null,
        eventPublicId: null,
        entityPublicId: null,
        title: id,
        isFullDay: true,
        startUtc: null,
        endUtc: null,
        startDate: null,
        endDate: null,
        amount: null,
        currency: null,
        status: null,
        color: null,
        isRecurring: false,
        isModified: false,
        ...rest
    };
}

describe('occurrenceTimeRange', () => {
    it('donne début et fin pour un horaire, rien pour une journée entière', () => {
        const meeting = occurrence('a', {
            isFullDay: false,
            startUtc: new Date(2026, 11, 7, 9, 0).toISOString(),
            endUtc: new Date(2026, 11, 7, 10, 30).toISOString()
        });
        expect(occurrenceTimeRange(meeting, 'fr-CH')).toBe('09:00 – 10:30');
        expect(occurrenceTimeRange({ ...meeting, endUtc: null }, 'fr-CH')).toBe('09:00');
        expect(occurrenceTimeRange(occurrence('b', { startDate: '2026-12-07' }), 'fr-CH')).toBeNull();
    });
});

describe('isEditableOccurrence', () => {
    it('n’ouvre que les événements saisis de l’utilisateur', () => {
        expect(isEditableOccurrence(occurrence('a', { eventPublicId: 'E1' }))).toBe(true);
        expect(isEditableOccurrence(occurrence('b', { eventPublicId: 'E1', sharedBy: 'Léa' }))).toBe(false);
        expect(isEditableOccurrence(occurrence('c', { sourceKey: 'recurringExpense', entityPublicId: 'R1' }))).toBe(false);
    });
});

describe('occurrenceTone', () => {
    it('distingue les événements saisis et chaque source', () => {
        expect(occurrenceTone(occurrence('a', {}))).toBe('event');
        expect(occurrenceTone(occurrence('b', { sourceKey: 'recurringIncome' }))).toBe('income');
        expect(occurrenceTone(occurrence('c', { sourceKey: 'recurringExpense' }))).toBe('expense');
        expect(occurrenceTone(occurrence('d', { sourceKey: 'savingsGoal' }))).toBe('goal');
        expect(occurrenceTone(occurrence('e', { sourceKey: 'sharedDebt' }))).toBe('due');
    });

    it('déduit le ton d’une source inconnue de son montant', () => {
        expect(occurrenceTone(occurrence('a', { sourceKey: 'nouvelle', amount: 10 }))).toBe('income');
        expect(occurrenceTone(occurrence('b', { sourceKey: 'nouvelle', amount: -10 }))).toBe('due');
    });
});

describe('groupByDay', () => {
    it('range journées entières puis horaires, et répète une occurrence sur ses jours', () => {
        const morning = new Date(2026, 11, 7, 9, 0).toISOString();
        const evening = new Date(2026, 11, 7, 19, 0).toISOString();
        const map = groupByDay([
            occurrence('soir', { isFullDay: false, startUtc: evening }),
            occurrence('matin', { isFullDay: false, startUtc: morning }),
            occurrence('vacances', { startDate: '2026-12-07', endDate: '2026-12-08' })
        ]);
        expect(map.get('2026-12-07')?.map((o) => o.id)).toEqual(['vacances', 'matin', 'soir']);
        expect(map.get('2026-12-08')?.map((o) => o.id)).toEqual(['vacances']);
    });
});

describe('monthSummary', () => {
    it('compte la devise dominante du mois, sans les annulés ni les autres mois', () => {
        const summary = monthSummary(
            [
                occurrence('salaire', { startDate: '2026-12-01', amount: 6200, currency: 'CHF' }),
                occurrence('loyer', { startDate: '2026-12-02', amount: -1850, currency: 'CHF' }),
                occurrence('cafe', { startDate: '2026-12-03', amount: -4.1, currency: 'CHF' }),
                occurrence('annule', { startDate: '2026-12-04', amount: -500, currency: 'CHF', status: 'annule' }),
                occurrence('hotel', { startDate: '2026-12-05', amount: -300, currency: 'EUR' }),
                occurrence('janvier', { startDate: '2027-01-01', amount: -999, currency: 'CHF' })
            ],
            '2026-12'
        );
        expect(summary).toEqual({ currency: 'CHF', inflows: 6200, outflows: -1854.1, balance: 4345.9, otherCurrencies: ['EUR'] });
    });

    it('n’a pas de devise sans montant', () => {
        expect(monthSummary([occurrence('rdv', { startDate: '2026-12-01' })], '2026-12').currency).toBeNull();
    });
});

describe('dayTotal', () => {
    it('somme le net du jour dans la devise dominante, sans les annulés', () => {
        const total = dayTotal([
            occurrence('salaire', { startDate: '2026-12-01', amount: 100, currency: 'CHF' }),
            occurrence('loyer', { startDate: '2026-12-01', amount: -30.5, currency: 'CHF' }),
            occurrence('annule', { startDate: '2026-12-01', amount: -500, currency: 'CHF', status: 'annule' })
        ]);
        expect(total).toEqual({ amount: 69.5, currency: 'CHF' });
    });

    it('est nul sans montant (jour vide, mode discret)', () => {
        expect(dayTotal([])).toBeNull();
        expect(dayTotal([occurrence('rdv', { startDate: '2026-12-01' })])).toBeNull();
    });
});

describe('upcomingOutflows', () => {
    it('garde les sorties des sources dans la fenêtre, dans l’ordre', () => {
        const items = [
            occurrence('passe', { sourceKey: 'recurringExpense', startDate: '2026-12-01', amount: -10, currency: 'CHF' }),
            occurrence('assurance', { sourceKey: 'recurringExpense', startDate: '2026-12-20', amount: -300, currency: 'CHF' }),
            occurrence('loyer', { sourceKey: 'recurringExpense', startDate: '2026-12-10', amount: -1850, currency: 'CHF' }),
            occurrence('salaire', { sourceKey: 'recurringIncome', startDate: '2026-12-12', amount: 6200, currency: 'CHF' }),
            occurrence('janvier', { sourceKey: 'recurringExpense', startDate: '2027-01-02', amount: -50, currency: 'CHF' })
        ];
        expect(upcomingOutflows(items, '2026-12-05', '2027-01-01').map((o) => o.id)).toEqual(['loyer', 'assurance']);
    });
});

describe('formatOccurrenceAmount', () => {
    it('signe le montant avec un vrai signe moins', () => {
        expect(formatOccurrenceAmount(-1850, 'CHF')).toMatch(/^−1.850\.00 CHF$/);
        expect(formatOccurrenceAmount(6200, 'CHF')).toMatch(/^\+6.200\.00 CHF$/);
        expect(formatOccurrenceAmount(-1850, 'CHF', false)).toMatch(/^1.850\.00 CHF$/);
    });
});

describe('statut de règlement et module d’origine', () => {
    it('reconnaît les statuts d’une échéance de source uniquement', () => {
        expect(paymentStatus(occurrence('a', { sourceKey: 'recurringExpense', status: 'overdue' }))).toBe('overdue');
        expect(paymentStatus(occurrence('b', { sourceKey: 'recurringIncome', status: 'paid' }))).toBe('paid');
        expect(paymentStatus(occurrence('c', { sourceKey: 'recurringExpense', status: 'upcoming' }))).toBe('upcoming');
        expect(paymentStatus(occurrence('d', { sourceKey: null, status: 'paid' }))).toBeNull();
        expect(paymentStatus(occurrence('e', { sourceKey: 'recurringExpense', status: 'annule' }))).toBeNull();
    });

    it('route vers la page du module d’origine', () => {
        expect(sourceRoute(occurrence('a', { sourceKey: 'recurringExpense', entityPublicId: 'x1' }))).toBe(
            '/app/finances/recurrences/charges/x1'
        );
        expect(sourceRoute(occurrence('b', { sourceKey: 'recurringIncome', entityPublicId: 'x2' }))).toBe(
            '/app/finances/recurrences/revenus/x2'
        );
        expect(sourceRoute(occurrence('c', { sourceKey: 'savingsGoal', entityPublicId: 'x3' }))).toBe('/app/planning/objectifs/x3');
        expect(sourceRoute(occurrence('d', { sourceKey: 'inconnue', entityPublicId: 'x4' }))).toBeNull();
        expect(sourceRoute(occurrence('e', { sourceKey: null, entityPublicId: null }))).toBeNull();
    });
});
