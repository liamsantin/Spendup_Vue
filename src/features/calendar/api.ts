import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    CalendarEvent,
    CalendarBudgetTransaction,
    CalendarEventBudget,
    SetCalendarEventBudgetPayload,
    CalendarForecast,
    CalendarEventScope,
    CalendarInfo,
    CalendarInvitation,
    CalendarParticipantList,
    CalendarRsvpStatus,
    CalendarShare,
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

    forecast(from: string, to: string) {
        return fetchWrapper.get(`/api/calendar/forecast?${new URLSearchParams({ from, to }).toString()}`) as Promise<CalendarForecast>;
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

    /** Supprime l'événement ancré d'une journée s'il est resté vide (aucune note, aucun invité, aucun rappel). */
    releaseAnchor(sourceKey: string, entityPublicId: string, date: string) {
        return fetchWrapper.post(`/api/calendar/sources/${encodeURIComponent(sourceKey)}/anchor/release`, {
            entityPublicId,
            date
        }) as Promise<void>;
    },

    /** Événement d'une journée ancré sur une occurrence de source (créé au besoin) : note, rappel, invités. */
    anchor(sourceKey: string, entityPublicId: string, date: string) {
        return fetchWrapper.post(`/api/calendar/sources/${encodeURIComponent(sourceKey)}/anchor`, {
            entityPublicId,
            date
        }) as Promise<CalendarEvent>;
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
    },

    eventBudget(eventPublicId: string) {
        return fetchWrapper.get(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget`) as Promise<CalendarEventBudget>;
    },

    setEventBudget(eventPublicId: string, payload: SetCalendarEventBudgetPayload) {
        return fetchWrapper.put(
            `/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget`,
            payload
        ) as Promise<CalendarEventBudget>;
    },

    deleteEventBudget(eventPublicId: string) {
        return fetchWrapper.delete(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget`) as Promise<void>;
    },

    attachBudgetTransaction(eventPublicId: string, transactionPublicId: string) {
        return fetchWrapper.post(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget/transactions`, {
            transactionPublicId
        }) as Promise<CalendarEventBudget>;
    },

    detachBudgetTransaction(eventPublicId: string, transactionPublicId: string) {
        return fetchWrapper.delete(
            `/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget/transactions/${encodeURIComponent(transactionPublicId)}`
        ) as Promise<CalendarEventBudget>;
    },

    participants(eventPublicId: string) {
        return fetchWrapper.get(
            `/api/calendar-events/${encodeURIComponent(eventPublicId)}/participants`
        ) as Promise<CalendarParticipantList>;
    },

    invite(eventPublicId: string, userPublicId: string, message?: string) {
        return fetchWrapper.post(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/participants`, {
            userPublicId,
            ...(message?.trim() ? { message: message.trim() } : {})
        }) as Promise<CalendarParticipantList>;
    },

    removeParticipant(eventPublicId: string, userPublicId: string) {
        return fetchWrapper.delete(
            `/api/calendar-events/${encodeURIComponent(eventPublicId)}/participants/${encodeURIComponent(userPublicId)}`
        ) as Promise<void>;
    },

    respond(eventPublicId: string, status: CalendarRsvpStatus, commentaire?: string) {
        return fetchWrapper.put(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/response`, {
            status,
            ...(commentaire?.trim() ? { commentaire: commentaire.trim() } : {})
        }) as Promise<CalendarParticipantList>;
    },

    /** Invitations reçues ; par défaut celles en attente de réponse. */
    invitations(pendingOnly = true) {
        return fetchWrapper.get(`/api/calendar/invitations?pendingOnly=${pendingOnly}`) as Promise<{ items: CalendarInvitation[] }>;
    },

    shares(calendarPublicId: string) {
        return fetchWrapper.get(`/api/calendars/${encodeURIComponent(calendarPublicId)}/shares`) as Promise<{ items: CalendarShare[] }>;
    },

    /** Partage à un ami, ou change le niveau d'un partage existant. */
    share(calendarPublicId: string, userPublicId: string, permission: string) {
        return fetchWrapper.put(`/api/calendars/${encodeURIComponent(calendarPublicId)}/shares/${encodeURIComponent(userPublicId)}`, {
            permission
        }) as Promise<CalendarShare>;
    },

    unshare(calendarPublicId: string, userPublicId: string) {
        return fetchWrapper.delete(
            `/api/calendars/${encodeURIComponent(calendarPublicId)}/shares/${encodeURIComponent(userPublicId)}`
        ) as Promise<void>;
    },

    /** Le destinataire quitte un calendrier partagé. */
    leaveShare(calendarPublicId: string) {
        return fetchWrapper.post(`/api/calendars/${encodeURIComponent(calendarPublicId)}/shares/leave`, {}) as Promise<void>;
    },

    /** Réglages du destinataire : couleur (vide = celle du propriétaire), masquage. */
    updateMyShare(calendarPublicId: string, payload: { color?: string; isHidden?: boolean }) {
        return fetchWrapper.patch(`/api/calendars/${encodeURIComponent(calendarPublicId)}/shares/me`, payload) as Promise<CalendarInfo>;
    },

    budgetSuggestions(eventPublicId: string) {
        return fetchWrapper.get(`/api/calendar-events/${encodeURIComponent(eventPublicId)}/budget/suggestions`) as Promise<{
            items: CalendarBudgetTransaction[];
        }>;
    }
};
