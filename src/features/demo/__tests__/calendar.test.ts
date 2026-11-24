import { beforeEach, describe, expect, it } from 'vitest';
import { demoEventsForMonth, demoOccurrences, routeCalendar } from '@/features/demo/calendar';
import { resetDemoDb } from '@/features/demo/db';
import type { CalendarEvent, CalendarOccurrencesResult } from '@/features/calendar/types';

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
        const result = demoOccurrences('2026-10-26', '2026-12-06');
        const loyer = result.items.find((o) => o.title === 'Loyer' && o.startDate === '2026-12-02');
        expect(loyer).toMatchObject({ sourceKey: 'recurringExpense', amount: -1850, currency: 'CHF', isFullDay: true });
        expect(result.items.find((o) => o.title === 'Dentiste')).toMatchObject({ sourceKey: null, eventPublicId: 'DEMOEVTDENT' });
        expect(result.items.some((o) => o.isFullDay && (o.endDate ?? '') < '2026-10-26')).toBe(false);
    });

    it('garde un séjour qui commence avant la fenêtre', () => {
        const result = demoOccurrences('2026-11-21', '2026-11-30');
        expect(result.items.find((o) => o.title === 'Week-end au Tessin')).toMatchObject({
            startDate: '2026-11-20',
            endDate: '2026-11-22'
        });
    });

    it('déplie le cours hebdomadaire, chaque mercredi', () => {
        const swims = demoOccurrences('2026-12-01', '2026-12-31').items.filter((o) => o.title === 'Cours de natation');
        expect(swims.map((o) => new Date(o.startUtc!).getDate())).toEqual([2, 9, 16, 23, 30]);
        expect(swims.every((o) => o.isRecurring && new Date(o.startUtc!).getHours() === 18)).toBe(true);
    });
});

describe('routeCalendar', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    const get = (from: string, to: string) =>
        routeCalendar('GET', '/api/calendar/occurrences', new URLSearchParams({ from, to }))!.body as CalendarOccurrencesResult;
    const titlesOn = (ymd: string) => get(ymd, ymd).items.map((o) => o.title);

    it('ne répond qu’aux chemins du calendrier', () => {
        expect(routeCalendar('GET', '/api/accounts', new URLSearchParams())).toBeNull();
    });

    it('refuse une fenêtre invalide et ce qui demande un compte', () => {
        expect(() =>
            routeCalendar('GET', '/api/calendar/occurrences', new URLSearchParams({ from: '2026-12-31', to: '2026-12-01' }))
        ).toThrow();
        expect(() => routeCalendar('POST', '/api/calendar/ics/import', new URLSearchParams(), {})).toThrow('Disponible avec un compte.');
    });

    it('crée, lit et supprime un événement', () => {
        const created = routeCalendar('POST', '/api/calendar-events', new URLSearchParams(), {
            calendarPublicId: null,
            title: 'Apéro',
            isFullDay: true,
            startDate: '2026-11-27',
            reminders: []
        })!.body as CalendarEvent;
        expect(titlesOn('2026-11-27')).toContain('Apéro');
        expect(routeCalendar('GET', `/api/calendar-events/${created.publicId}`, new URLSearchParams())!.body).toMatchObject({
            title: 'Apéro',
            endDate: '2026-11-27'
        });

        routeCalendar('DELETE', `/api/calendar-events/${created.publicId}`, new URLSearchParams({ rowVersion: '1', scope: 'series' }));
        expect(titlesOn('2026-11-27')).not.toContain('Apéro');
    });

    it('modifie une occurrence, coupe la série et refuse une version périmée', () => {
        const occ = get('2026-12-09', '2026-12-09').items.find((o) => o.title === 'Cours de natation')!;
        const start = occ.id.slice('DEMOEVTSWIM:'.length);
        const one = routeCalendar('PATCH', '/api/calendar-events/DEMOEVTSWIM', new URLSearchParams(), {
            rowVersion: 1,
            scope: 'occurrence',
            occurrenceStart: start,
            title: 'Natation (bassin extérieur)'
        })!.body as CalendarEvent;
        expect(one.rowVersion).toBe(2);
        expect(titlesOn('2026-12-09')).toContain('Natation (bassin extérieur)');
        expect(titlesOn('2026-12-02')).toContain('Cours de natation');

        expect(() =>
            routeCalendar('PATCH', '/api/calendar-events/DEMOEVTSWIM', new URLSearchParams(), {
                rowVersion: 1,
                scope: 'series',
                title: 'X'
            })
        ).toThrow('modifié entre-temps');

        const next = routeCalendar('PATCH', '/api/calendar-events/DEMOEVTSWIM', new URLSearchParams(), {
            rowVersion: 2,
            scope: 'following',
            occurrenceStart: start,
            title: 'Aquagym'
        })!.body as CalendarEvent;
        expect(next.publicId).not.toBe('DEMOEVTSWIM');
        expect(titlesOn('2026-12-02')).toContain('Cours de natation');
        // L'exception du 9 suit la nouvelle série ; les mercredis suivants prennent le nouveau titre.
        expect(titlesOn('2026-12-09')).toContain('Natation (bassin extérieur)');
        expect(titlesOn('2026-12-16')).toContain('Aquagym');
        expect(titlesOn('2026-12-16')).not.toContain('Cours de natation');
    });

    it('supprime une seule occurrence ou les suivantes', () => {
        const startOn = (ymd: string) =>
            get(ymd, ymd)
                .items.find((o) => o.eventPublicId === 'DEMOEVTSWIM')!
                .id.slice('DEMOEVTSWIM:'.length);
        routeCalendar(
            'DELETE',
            '/api/calendar-events/DEMOEVTSWIM',
            new URLSearchParams({ rowVersion: '1', scope: 'occurrence', occurrenceStart: startOn('2026-12-09') })
        );
        expect(titlesOn('2026-12-09')).not.toContain('Cours de natation');
        expect(titlesOn('2026-12-16')).toContain('Cours de natation');

        routeCalendar(
            'DELETE',
            '/api/calendar-events/DEMOEVTSWIM',
            new URLSearchParams({ rowVersion: '2', scope: 'following', occurrenceStart: startOn('2026-12-16') })
        );
        expect(titlesOn('2026-12-02')).toContain('Cours de natation');
        expect(titlesOn('2026-12-16')).not.toContain('Cours de natation');
        expect(titlesOn('2026-12-23')).not.toContain('Cours de natation');
    });
});
