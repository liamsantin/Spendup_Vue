import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { CalendarOccurrencesQuery, CalendarOccurrencesResult } from '@/features/calendar/types';

export const calendarApi = {
    occurrences(query: CalendarOccurrencesQuery) {
        const params = new URLSearchParams({ from: query.from, to: query.to });
        if (query.q?.trim()) params.set('q', query.q.trim());
        if (query.layers) params.set('layers', query.layers);
        return fetchWrapper.get(`/api/calendar/occurrences?${params.toString()}`) as Promise<CalendarOccurrencesResult>;
    }
};
