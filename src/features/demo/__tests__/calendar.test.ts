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

    it('ne renvoie aucun montant en mode discret', () => {
        expect(demoOccurrences('2026-12-01', '2026-12-31').items.some((o) => o.amount != null)).toBe(true);
        routeCalendar('PATCH', '/api/calendar/preferences', new URLSearchParams(), { discreetMode: true });
        const hidden = demoOccurrences('2026-12-01', '2026-12-31').items;
        expect(hidden.length).toBeGreaterThan(0);
        expect(hidden.every((o) => o.amount == null)).toBe(true);
        const prefs = routeCalendar('GET', '/api/calendar/preferences', new URLSearchParams())!.body as { discreetMode: boolean };
        expect(prefs.discreetMode).toBe(true);
    });
});

describe('routeCalendar', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    const get = (from: string, to: string) =>
        routeCalendar('GET', '/api/calendar/occurrences', new URLSearchParams({ from, to }))!.body as CalendarOccurrencesResult;
    const titlesOn = (ymd: string) => get(ymd, ymd).items.map((o) => o.title);

    it('enregistre les réglages généraux', () => {
        const saved = routeCalendar('PATCH', '/api/calendar/preferences', new URLSearchParams(), {
            defaultView: 'week',
            showWeekNumbers: true,
            clearDefaultReminder: true
        })!.body as { defaultView: string; showWeekNumbers: boolean; defaultReminderMinutes: number | null };
        expect(saved).toMatchObject({ defaultView: 'week', showWeekNumbers: true, defaultReminderMinutes: null });
        const again = routeCalendar('GET', '/api/calendar/preferences', new URLSearchParams())!.body as { defaultView: string };
        expect(again.defaultView).toBe('week');
    });

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

describe('routeCalendar : sources', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('liste, modifie et réinitialise par profil', () => {
        const query = new URLSearchParams();
        const list = routeCalendar('GET', '/api/calendar/sources', query)?.body as { profile: string; items: { key: string }[] };
        expect(list.profile).toBe('equilibre');
        expect(list.items).toHaveLength(6);

        const patched = routeCalendar('PATCH', '/api/calendar/sources/savingsGoal', query, { isEnabled: false })?.body;
        expect(patched).toMatchObject({ isEnabled: false, isCustom: true });

        const filtered = routeCalendar('PATCH', '/api/calendar/sources/recurringExpense', query, { accountIds: ['a1'] })?.body;
        expect(filtered).toMatchObject({ accountIds: ['a1'] });
        const cleared = routeCalendar('PATCH', '/api/calendar/sources/recurringExpense', query, { accountIds: [] })?.body;
        expect(cleared).toMatchObject({ accountIds: null });

        const reset = routeCalendar('PUT', '/api/calendar/sources/profile', query, { profile: 'minimal' })?.body as {
            items: { key: string; isEnabled: boolean }[];
        };
        expect(reset.items.filter((item) => item.isEnabled).map((item) => item.key)).toEqual(['liability']);
        expect(() => routeCalendar('PATCH', '/api/calendar/sources/nope', query, {})).toThrow();
    });
});

describe('routeCalendar : éléments masqués', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('masque un élément de source, le liste, puis le réaffiche', () => {
        const query = new URLSearchParams();
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        const to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-28`;
        const target = demoOccurrences(from, to).items.find((o) => o.sourceKey && o.entityPublicId);
        expect(target).toBeDefined();
        const { sourceKey, entityPublicId } = target!;

        const created = routeCalendar('POST', '/api/calendar/exclusions', query, { sourceKey, entityPublicId })?.body;
        expect(created).toMatchObject({ sourceKey, entityPublicId });
        expect(demoOccurrences(from, to).items.some((o) => o.sourceKey === sourceKey && o.entityPublicId === entityPublicId)).toBe(false);
        expect((routeCalendar('GET', '/api/calendar/exclusions', query)?.body as { items: unknown[] }).items).toHaveLength(1);

        routeCalendar('DELETE', `/api/calendar/exclusions/${sourceKey}/${entityPublicId}`, query);
        expect(demoOccurrences(from, to).items.some((o) => o.entityPublicId === entityPublicId)).toBe(true);
        expect(() => routeCalendar('POST', '/api/calendar/exclusions', query, { sourceKey: 'nope', entityPublicId: 'x' })).toThrow();
    });
});
