import { banksApi } from '@/features/banks/api';
import type { Bank, ListBanksQuery } from '@/features/banks/types';

/**
 * Référentiel SIX : lecture seule, mis à jour hors session (import admin). Les réponses de
 * `GET /api/banks` sont gardées en mémoire pour l’onglet : rouvrir un sélecteur ou retaper la même
 * recherche ne refait pas d’appel. Requêtes identiques en vol partagées ; échec non mis en cache.
 */
export const BANK_REGISTRY_CACHE_TTL_MS = 60 * 60 * 1000;
export const BANK_REGISTRY_CACHE_MAX_ENTRIES = 100;

type Entry = { at: number; promise: Promise<Bank[]> };

const entries = new Map<string, Entry>();

function keyOf(query: ListBanksQuery): string {
    return JSON.stringify([query.q?.trim() ?? '', query.country?.trim().toUpperCase() ?? '', query.page ?? 1, query.pageSize ?? null]);
}

export function listRegistryBanks(query: ListBanksQuery = {}, now = Date.now()): Promise<Bank[]> {
    const key = keyOf(query);
    const hit = entries.get(key);
    if (hit && now - hit.at < BANK_REGISTRY_CACHE_TTL_MS) {
        // LRU : la clé relue repasse en dernière position.
        entries.delete(key);
        entries.set(key, hit);
        return hit.promise;
    }

    const promise = banksApi.list(query).then((result) => (Array.isArray(result?.items) ? result.items : []));
    const entry: Entry = { at: now, promise };
    entries.set(key, entry);
    promise.catch(() => {
        if (entries.get(key) === entry) entries.delete(key);
    });
    while (entries.size > BANK_REGISTRY_CACHE_MAX_ENTRIES) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
    }
    return promise;
}

export function clearRegistryBanksCache() {
    entries.clear();
}
