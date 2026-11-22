import { ref } from 'vue';

/** Sections épinglées en tête : jamais déplacées, jamais déplaçables par-dessus. */
export const LOCKED_NAV_IDS: readonly string[] = ['dashboard'];

const STORAGE_KEY = 'spendup.nav.order';

/**
 * Trie les sections selon l'ordre sauvegardé. Les sections verrouillées gardent leur
 * place en tête ; une section absente de l'ordre sauvegardé (ajoutée depuis) se glisse
 * après celle qui la précède par défaut ; un id sauvegardé qui n'existe plus est ignoré.
 */
export function applyNavOrder<T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] {
    const locked = items.filter((item) => LOCKED_NAV_IDS.includes(item.id));
    const movable = items.filter((item) => !LOCKED_NAV_IDS.includes(item.id));
    const byId = new Map(movable.map((item) => [item.id, item]));

    const result: T[] = [];
    const seen = new Set<string>();
    for (const id of order) {
        const item = byId.get(id);
        if (item && !seen.has(id)) {
            result.push(item);
            seen.add(id);
        }
    }
    movable.forEach((item, index) => {
        if (seen.has(item.id)) return;
        const previous = movable[index - 1];
        const at = previous ? result.findIndex((entry) => entry.id === previous.id) + 1 : 0;
        result.splice(at, 0, item);
        seen.add(item.id);
    });
    return [...locked, ...result];
}

/** Place `fromId` juste avant ou après `overId`. Renvoie la liste inchangée si rien ne bouge. */
export function moveNavId(ids: readonly string[], fromId: string, overId: string, after: boolean): string[] {
    if (fromId === overId || !ids.includes(fromId) || !ids.includes(overId)) return [...ids];
    const rest = ids.filter((id) => id !== fromId);
    const target = rest.indexOf(overId) + (after ? 1 : 0);
    rest.splice(target, 0, fromId);
    return rest;
}

/** Décale `id` d'un cran (delta ±1) ; ne sort pas de la liste. */
export function shiftNavId(ids: readonly string[], id: string, delta: number): string[] {
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return [...ids];
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    return next;
}

function readStored(): string[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

function writeStored(order: string[]) {
    try {
        if (order.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* stockage indisponible : l'ordre ne tient que pour la session */
    }
}

/** Ordre choisi par l'utilisateur, partagé par tous les consommateurs. */
const savedOrder = ref<string[]>(readStored());

export function useNavOrder() {
    function save(order: string[]) {
        savedOrder.value = order;
        writeStored(order);
    }

    return {
        savedOrder,
        save,
        reset: () => save([])
    };
}
