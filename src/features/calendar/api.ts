import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    CalendarEvent,
    CalendarEventScope,
    CalendarInfo,
    CalendarOccurrencesQuery,
    CalendarOccurrencesResult,
    CalendarPreferences,
    CreateCalendarEventPayload,
    UpdateCalendarEventPayload
} from '@/features/calendar/types';

export const calendarApi = {
    occurrences(query: CalendarOccurrencesQuery) {
        const params = new URLSearchParams({ from: query.from, to: query.to });
        if (query.q?.trim()) params.set('q', query.q.trim());
        if (query.layers) params.set('layers', query.layers);
        return fetchWrapper.get(`/api/calendar/occurrences?${params.toString()}`) as Promise<CalendarOccurrencesResult>;
    },

    calendars() {
        return fetchWrapper.get('/api/calendars') as Promise<{ items: CalendarInfo[] }>;
    },

    preferences() {
        return fetchWrapper.get('/api/calendar/preferences') as Promise<CalendarPreferences>;
    },

    getEvent(publicId: string) {
        return fetchWrapper.get(`/api/calendar-events/${encodeURIComponent(publicId)}`) as Promise<CalendarEvent>;
    },

    createEvent(payload: CreateCalendarEventPayload) {
        return fetchWrapper.post('/api/calendar-events', payload) as Promise<CalendarEvent>;
    },

    updateEvent(publicId: string, payload: UpdateCalendarEventPayload) {
        return fetchWrapper.patch(`/api/calendar-events/${encodeURIComponent(publicId)}`, payload) as Promise<CalendarEvent>;
    },

    deleteEvent(publicId: string, rowVersion: number, scope: CalendarEventScope, occurrenceStart?: string) {
        const params = new URLSearchParams({ rowVersion: String(rowVersion), scope });
        if (occurrenceStart) params.set('occurrenceStart', occurrenceStart);
        return fetchWrapper.delete(`/api/calendar-events/${encodeURIComponent(publicId)}?${params.toString()}`) as Promise<void>;
    }
};
