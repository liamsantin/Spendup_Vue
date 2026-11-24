import { ref, shallowRef, watch, type Ref } from 'vue';
import { calendarApi } from '@/features/calendar/api';
import type { CalendarOccurrence } from '@/features/calendar/types';
import { AppError } from '@/utils/errors/app-error';

/**
 * Occurrences de la fenêtre `from`–`to` (`GET /api/calendar/occurrences`), rechargées quand la fenêtre change.
 * Une réponse arrivée après un changement plus récent est ignorée.
 */
export function useCalendarOccurrences(from: Readonly<Ref<string>>, to: Readonly<Ref<string>>) {
    const items = shallowRef<CalendarOccurrence[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    let seq = 0;

    async function load() {
        const ticket = ++seq;
        loading.value = true;
        error.value = null;
        try {
            const result = await calendarApi.occurrences({ from: from.value, to: to.value });
            if (ticket === seq) items.value = result.items ?? [];
        } catch (e) {
            if (ticket === seq) {
                items.value = [];
                error.value = AppError.fromUnknown(e).message;
            }
        } finally {
            if (ticket === seq) loading.value = false;
        }
    }

    watch([from, to], () => void load(), { immediate: true });

    return { items, loading, error, reload: load };
}
