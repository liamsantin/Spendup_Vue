import { ref } from 'vue';
import { calendarApi } from '@/features/calendar/api';
import type { CalendarPreferences, UpdateCalendarPreferencesPayload } from '@/features/calendar/types';

const preferences = ref<CalendarPreferences | null>(null);
let pending: Promise<CalendarPreferences> | null = null;

/** Réglages partagés entre l'écran et le calendrier ouvert. */
export function useCalendarPreferences() {
    async function load(): Promise<CalendarPreferences> {
        if (preferences.value) return preferences.value;
        pending ??= calendarApi.preferences().finally(() => (pending = null));
        const value = await pending;
        preferences.value = value;
        return value;
    }

    async function save(payload: UpdateCalendarPreferencesPayload): Promise<CalendarPreferences> {
        const value = await calendarApi.updatePreferences(payload);
        preferences.value = value;
        return value;
    }

    return { preferences, load, save };
}
