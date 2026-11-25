import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    CalendarEvent,
    CalendarEventScope,
    CalendarInfo,
    CalendarOccurrencesQuery,
    CalendarOccurrencesResult,
    CalendarPreferences,
    CalendarSourceExclusion,
    CalendarProfile,
    CalendarSourceList,
    CalendarSourceSetting,
    UpdateCalendarSourcePayload,
    CreateCalendarEventPayload,
    UpdateCalendarPreferencesPayload,
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

    updatePreferences(payload: UpdateCalendarPreferencesPayload) {
        return fetchWrapper.patch('/api/calendar/preferences', payload) as Promise<CalendarPreferences>;
    },

    sources() {
        return fetchWrapper.get('/api/calendar/sources') as Promise<CalendarSourceList>;
    },

    updateSource(key: string, payload: UpdateCalendarSourcePayload) {
        return fetchWrapper.patch(`/api/calendar/sources/${encodeURIComponent(key)}`, payload) as Promise<CalendarSourceSetting>;
    },

    setSourceProfile(profile: CalendarProfile) {
        return fetchWrapper.put('/api/calendar/sources/profile', { profile }) as Promise<CalendarSourceList>;
    },

    exclusions() {
        return fetchWrapper.get('/api/calendar/exclusions') as Promise<{ items: CalendarSourceExclusion[] }>;
    },

    exclude(sourceKey: string, entityPublicId: string) {
        return fetchWrapper.post('/api/calendar/exclusions', { sourceKey, entityPublicId }) as Promise<CalendarSourceExclusion>;
    },

    include(sourceKey: string, entityPublicId: string) {
        return fetchWrapper.delete(
            `/api/calendar/exclusions/${encodeURIComponent(sourceKey)}/${encodeURIComponent(entityPublicId)}`
        ) as Promise<void>;
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
