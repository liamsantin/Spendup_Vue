import { beforeEach, describe, expect, it } from 'vitest';
import { demoEventsForMonth, demoOccurrences, routeCalendar } from '@/features/demo/calendar';
import { resetDemoDb } from '@/features/demo/db';

describe('demoEventsForMonth', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('reprend les écritures de novembre sans doubler le salaire', () => {
        const events = demoEventsForMonth(2026, 10);
        const titles = events.map((event) => event.title);
        expect(titles.filter((title) => title.startsWith('Salaire'))).toEqual(['Salaire novembre']);
        expect(events.find((event) => event.title === 'Loyer')?.amount).toBe(-1850);
        expect(events.find((event) => event.title === 'Versement vacances')?.kind).toBe('goal');
    });

    it('projette le rythme mensuel quand le mois n’a pas d’écritures', () => {
        const events = demoEventsForMonth(2026, 11);
        expect(events.map((event) => event.title)).toContain('Salaire décembre');
        expect(events.find((event) => event.title === 'Loyer')?.date).toBe('2026-12-02');
    });
});

describe('demoOccurrences', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('sert la grille au format de l’API, mois voisins compris', () => {
        const result = demoOccurrences('2026-11-30', '2027-01-03');
        const loyer = result.items.find((o) => o.title === 'Loyer' && o.startDate === '2026-12-02');
        expect(loyer).toMatchObject({ sourceKey: 'recurringExpense', amount: -1850, currency: 'CHF', isFullDay: true });
        expect(result.items.some((o) => o.sourceKey === null && o.title === 'Dentiste')).toBe(true);
        expect(result.items.some((o) => o.startDate === '2027-01-02')).toBe(true);
        expect(result.items.some((o) => o.isFullDay && (o.endDate ?? '') < '2026-11-30')).toBe(false);
    });

    it('garde un séjour qui commence avant la fenêtre', () => {
        const result = demoOccurrences('2026-12-21', '2026-12-31');
        expect(result.items.find((o) => o.title === 'Week-end au Tessin')).toMatchObject({
            startDate: '2026-12-20',
            endDate: '2026-12-22'
        });
    });
});

describe('routeCalendar', () => {
    it('ne répond qu’aux chemins du calendrier', () => {
        expect(routeCalendar('GET', '/api/accounts', new URLSearchParams())).toBeNull();
    });

    it('refuse une fenêtre invalide et les écritures', () => {
        expect(() =>
            routeCalendar('GET', '/api/calendar/occurrences', new URLSearchParams({ from: '2026-12-31', to: '2026-12-01' }))
        ).toThrow();
        expect(() => routeCalendar('POST', '/api/calendar-events', new URLSearchParams())).toThrow('Disponible avec un compte.');
    });
});
