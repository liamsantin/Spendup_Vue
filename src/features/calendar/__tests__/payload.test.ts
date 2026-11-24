import { describe, expect, it } from 'vitest';
import {
    buildCreateEventPayload,
    buildUpdateEventPayload,
    emptyEventFormFields,
    eventToFormFields,
    localToUtcIso,
    occurrenceStartOf
} from '@/features/calendar/payload';
import type { CalendarEvent, CalendarOccurrence } from '@/features/calendar/types';

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

function timedEvent(rest: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
        publicId: 'EVT',
        calendarPublicId: 'CAL',
        title: 'Sport',
        description: null,
        lieu: null,
        isFullDay: false,
        startUtc: local(2026, 3, 2, 9),
        endUtc: local(2026, 3, 2, 10),
        timezone: 'Europe/Zurich',
        startDate: null,
        endDate: null,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        visibilite: 'prive',
        status: 'planifie',
        reminders: [{ beforeMinutes: 15, canal: 'app' }],
        rowVersion: 3,
        ...rest
    };
}

function occurrenceOf(event: CalendarEvent, startUtc: string, endUtc: string): CalendarOccurrence {
    return {
        id: `${event.publicId}:${startUtc.slice(0, 19)}Z`,
        sourceKey: null,
        eventPublicId: event.publicId,
        entityPublicId: null,
        title: event.title,
        isFullDay: false,
        startUtc,
        endUtc,
        startDate: null,
        endDate: null,
        amount: null,
        currency: null,
        status: null,
        color: null,
        isRecurring: true,
        isModified: false
    };
}

describe('emptyEventFormFields', () => {
    it('propose 9 h un autre jour, l’heure ronde suivante aujourd’hui, et le rappel par défaut', () => {
        const other = emptyEventFormFields('2026-03-10', { durationMinutes: 30, reminderMinutes: 10 }, new Date(2026, 2, 2, 14, 20));
        expect(other).toMatchObject({ startTime: '09:00', endTime: '09:30', endDate: '2026-03-10' });
        expect(other.reminders).toEqual([{ beforeMinutes: 10, canal: 'app' }]);
        const today = emptyEventFormFields('2026-03-02', {}, new Date(2026, 2, 2, 14, 20));
        expect(today).toMatchObject({ startTime: '15:00', endTime: '16:00', reminders: [] });
    });

    it('part du créneau cliqué, y compris quand la durée passe minuit', () => {
        const slot = emptyEventFormFields('2026-03-10', { startTime: '14:30', durationMinutes: 30 }, new Date(2026, 2, 10, 8));
        expect(slot).toMatchObject({ startDate: '2026-03-10', startTime: '14:30', endDate: '2026-03-10', endTime: '15:00' });
        const late = emptyEventFormFields('2026-03-10', { startTime: '23:30' });
        expect(late).toMatchObject({ startTime: '23:30', endDate: '2026-03-11', endTime: '00:30' });
    });
});

describe('buildCreateEventPayload', () => {
    it('envoie un événement horaire en UTC avec le fuseau', () => {
        const fields = { ...emptyEventFormFields('2026-03-10', {}, new Date(2026, 2, 2)), title: ' Réunion ', repeat: 'weekly' as const };
        const result = buildCreateEventPayload(fields, 'Europe/Zurich');
        expect(result).toEqual({
            ok: true,
            payload: {
                calendarPublicId: null,
                title: 'Réunion',
                isFullDay: false,
                startUtc: local(2026, 3, 10, 9),
                endUtc: local(2026, 3, 10, 10),
                timezone: 'Europe/Zurich',
                recurrenceRule: 'FREQ=WEEKLY',
                reminders: []
            }
        });
    });

    it('envoie une journée entière en dates inclusives', () => {
        const fields = { ...emptyEventFormFields('2026-03-10'), title: 'Vacances', isFullDay: true, endDate: '2026-03-14' };
        const result = buildCreateEventPayload(fields);
        expect(result.ok && result.payload).toMatchObject({ isFullDay: true, startDate: '2026-03-10', endDate: '2026-03-14' });
        expect(result.ok && result.payload.startUtc).toBeUndefined();
    });

    it('signale le champ fautif', () => {
        const base = emptyEventFormFields('2026-03-10');
        expect(buildCreateEventPayload(base)).toMatchObject({ ok: false, code: 'titleRequired', field: 'title' });
        expect(buildCreateEventPayload({ ...base, title: 'X', endTime: '08:00' })).toMatchObject({
            code: 'endBeforeStart',
            field: 'endTime'
        });
        expect(buildCreateEventPayload({ ...base, title: 'X', startTime: '25:00' })).toMatchObject({ code: 'timeInvalid' });
    });
});

describe('buildUpdateEventPayload', () => {
    it('n’envoie que ce qui a changé', () => {
        const event = timedEvent();
        const initial = eventToFormFields(event);
        const same = buildUpdateEventPayload({ ...initial }, { event, initial, scope: 'series' });
        expect(same).toMatchObject({ ok: true, changed: false });

        const renamed = buildUpdateEventPayload({ ...initial, title: 'Yoga', reminders: [] }, { event, initial, scope: 'series' });
        expect(renamed.ok && renamed.payload).toEqual({ rowVersion: 3, scope: 'series', title: 'Yoga', reminders: [] });
    });

    it('décale toute la série du même écart que l’occurrence ouverte', () => {
        const event = timedEvent();
        const occurrence = occurrenceOf(event, local(2026, 3, 16, 9), local(2026, 3, 16, 10));
        const initial = eventToFormFields(event, occurrence);
        expect(initial).toMatchObject({ startDate: '2026-03-16', startTime: '09:00', repeat: 'weekly' });

        const moved = { ...initial, startTime: '10:30', endTime: '11:30' };
        const series = buildUpdateEventPayload(moved, { event, initial, scope: 'series', timezone: 'Europe/Zurich' });
        expect(series.ok && series.payload).toMatchObject({ startUtc: local(2026, 3, 2, 10, 30), endUtc: local(2026, 3, 2, 11, 30) });

        const one = buildUpdateEventPayload(moved, {
            event,
            initial,
            scope: 'occurrence',
            occurrenceStart: occurrenceStartOf(occurrence)
        });
        expect(one.ok && one.payload).toMatchObject({
            scope: 'occurrence',
            occurrenceStart: occurrence.id.slice('EVT:'.length),
            startUtc: local(2026, 3, 16, 10, 30)
        });
    });

    it('ne touche pas à la règle pour une seule occurrence, l’efface sinon', () => {
        const event = timedEvent();
        const initial = eventToFormFields(event);
        const stop = { ...initial, repeat: 'none' as const };
        const one = buildUpdateEventPayload(stop, { event, initial, scope: 'occurrence', occurrenceStart: 'x' });
        expect(one.ok && one.payload.recurrenceRule).toBeUndefined();
        const all = buildUpdateEventPayload(stop, { event, initial, scope: 'series' });
        expect(all.ok && all.payload.recurrenceRule).toBe('');
    });

    it('décale une série en journées entières en gardant sa durée', () => {
        const event = timedEvent({
            isFullDay: true,
            startUtc: null,
            endUtc: null,
            timezone: null,
            startDate: '2026-03-06',
            endDate: '2026-03-08',
            recurrenceRule: 'FREQ=MONTHLY'
        });
        const initial = { ...eventToFormFields(event), startDate: '2026-04-06', endDate: '2026-04-08' };
        const result = buildUpdateEventPayload(
            { ...initial, startDate: '2026-04-07', endDate: '2026-04-10' },
            { event, initial, scope: 'series' }
        );
        expect(result.ok && result.payload).toMatchObject({ startDate: '2026-03-07', endDate: '2026-03-10' });
    });
});

describe('localToUtcIso', () => {
    it('lit la date et l’heure dans le fuseau du navigateur', () => {
        expect(localToUtcIso('2026-07-01', '08:15')).toBe(local(2026, 7, 1, 8, 15));
    });
});
