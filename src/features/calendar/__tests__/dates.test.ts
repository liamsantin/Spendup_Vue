import { describe, expect, it } from 'vitest';
import { addDaysYmd, isoWeek, monthGrid, occurrenceDays, visibleDays, weekDays, weekStartYmd } from '@/features/calendar/dates';
import type { CalendarOccurrence } from '@/features/calendar/types';

function occurrence(rest: Partial<CalendarOccurrence>): CalendarOccurrence {
    return {
        id: 'x',
        sourceKey: null,
        eventPublicId: 'E1',
        entityPublicId: null,
        title: 'Événement',
        isFullDay: false,
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

describe('monthGrid', () => {
    it('commence le lundi et ne garde que les semaines du mois', () => {
        // Février 2027 : le 1er est un lundi, 28 jours, exactement 4 semaines.
        const february = monthGrid(2027, 1);
        expect(february.weekCount).toBe(4);
        expect(february.from).toBe('2027-02-01');
        expect(february.to).toBe('2027-02-28');

        // Novembre 2026 : le 1er est un dimanche, la grille commence le lundi 26 octobre.
        const november = monthGrid(2026, 10);
        expect(november.from).toBe('2026-10-26');
        expect(november.weekCount).toBe(6);
        expect(november.days).toHaveLength(42);
        expect(november.to).toBe('2026-12-06');
    });

    it('peut commencer un dimanche', () => {
        const november = monthGrid(2026, 10, 7);
        expect(november.from).toBe('2026-11-01');
        expect(november.days[0]).toBe('2026-11-01');
    });
});

describe('weekDays', () => {
    it('va du lundi au dimanche, à cheval sur deux mois', () => {
        // Jeudi 3 décembre 2026 : la semaine commence le lundi 30 novembre.
        expect(weekDays('2026-12-03')).toEqual([
            '2026-11-30',
            '2026-12-01',
            '2026-12-02',
            '2026-12-03',
            '2026-12-04',
            '2026-12-05',
            '2026-12-06'
        ]);
    });

    it('rattache le dimanche à la semaine qui finit', () => {
        expect(weekStartYmd('2026-12-06')).toBe('2026-11-30');
        expect(weekStartYmd('2026-11-30')).toBe('2026-11-30');
    });

    it('commence le dimanche quand la semaine est réglée ainsi', () => {
        expect(weekDays('2026-12-03', 7)[0]).toBe('2026-11-29');
        expect(weekStartYmd('2026-12-06', 7)).toBe('2026-12-06');
    });
});

describe('visibleDays', () => {
    it('retire samedi et dimanche sans changer l’ordre', () => {
        expect(visibleDays(weekDays('2026-12-03'), false)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']);
    });
});

describe('isoWeek', () => {
    it('numérote la semaine du lundi, même si le jour affiché est un dimanche', () => {
        expect(isoWeek('2026-11-30')).toBe(49);
        expect(isoWeek('2026-12-06')).toBe(49);
        expect(isoWeek('2026-01-01')).toBe(1);
    });
});

describe('addDaysYmd', () => {
    it('passe les fins de mois et d’année', () => {
        expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
        expect(addDaysYmd('2028-02-28', 1)).toBe('2028-02-29');
    });
});

describe('occurrenceDays', () => {
    it('couvre une journée entière de bout en bout, dates incluses', () => {
        expect(occurrenceDays(occurrence({ isFullDay: true, startDate: '2026-12-30', endDate: '2027-01-01' }))).toEqual([
            '2026-12-30',
            '2026-12-31',
            '2027-01-01'
        ]);
    });

    it('prend la date de début seule quand la fin manque', () => {
        expect(occurrenceDays(occurrence({ isFullDay: true, startDate: '2026-12-02' }))).toEqual(['2026-12-02']);
    });

    it('place un événement horaire sur son jour local, sans déborder à minuit', () => {
        const start = new Date(2026, 11, 7, 22, 0).toISOString();
        const end = new Date(2026, 11, 8, 0, 0).toISOString();
        expect(occurrenceDays(occurrence({ startUtc: start, endUtc: end }))).toEqual(['2026-12-07']);
    });

    it('étale un événement horaire qui passe la nuit', () => {
        const start = new Date(2026, 11, 7, 22, 0).toISOString();
        const end = new Date(2026, 11, 8, 2, 0).toISOString();
        expect(occurrenceDays(occurrence({ startUtc: start, endUtc: end }))).toEqual(['2026-12-07', '2026-12-08']);
    });

    it('borne une fin aberrante', () => {
        expect(occurrenceDays(occurrence({ isFullDay: true, startDate: '2026-01-01', endDate: '2030-01-01' }))).toHaveLength(62);
    });
});
