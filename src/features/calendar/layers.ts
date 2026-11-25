import { occurrenceTone } from '@/features/calendar/occurrences';
import { CALENDAR_SOURCE_KEYS, type CalendarOccurrence, type CalendarTone } from '@/features/calendar/types';

/** Couche des événements saisis (les autres couches sont les clés de source). */
export const EVENTS_LAYER = 'events';

export type CalendarLayerKey = typeof EVENTS_LAYER | (typeof CALENDAR_SOURCE_KEYS)[number];

export const CALENDAR_LAYER_KEYS: readonly CalendarLayerKey[] = [EVENTS_LAYER, ...CALENDAR_SOURCE_KEYS];

const STORAGE_KEY = 'spendup.calendar.hiddenLayers';

export function layerOf(occurrence: CalendarOccurrence): string {
    return occurrence.sourceKey ?? EVENTS_LAYER;
}

/** Ton (couleur) d'une couche, pour sa pastille. */
export function layerTone(key: string): CalendarTone {
    return occurrenceTone({ sourceKey: key === EVENTS_LAYER ? null : key, amount: null } as CalendarOccurrence);
}

/** Occurrences des couches affichées ; une clé inconnue reste visible. */
export function filterByLayers(items: readonly CalendarOccurrence[], hidden: ReadonlySet<string>): CalendarOccurrence[] {
    if (hidden.size === 0) return [...items];
    return items.filter((occurrence) => !hidden.has(layerOf(occurrence)));
}

/** Nombre d'occurrences par couche (toutes les couches connues, à 0 si vides). */
export function countByLayer(items: readonly CalendarOccurrence[]): Map<string, number> {
    const counts = new Map<string, number>(CALENDAR_LAYER_KEYS.map((key) => [key, 0]));
    for (const occurrence of items) {
        const key = layerOf(occurrence);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

/** Couches masquées sur cet appareil (préférence locale, voir roadmap 7.1). */
export function loadHiddenLayers(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
    } catch {
        return new Set();
    }
}

export function saveHiddenLayers(hidden: ReadonlySet<string>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
    } catch {
        // stockage indisponible : le choix vaut pour la session seulement
    }
}
