import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { APP_HOME_ROUTE } from '@/features/auth';
import { isTauri } from '@/utils/helpers/platform-helpers';

/**
 * Cible « home » hors zone `/app` :
 * - Tauri → login (pas de landings marketing)
 * - Web → `/` (landings) sauf override explicite
 */
export function useAppHomeTarget(explicitHomeTo?: string) {
    return computed(() => {
        if (isTauri()) return '/auth';
        return explicitHomeTo ?? '/';
    });
}

/** Cible logo sous `/app` ou après auth. */
export function appAuthenticatedHome(): string {
    return APP_HOME_ROUTE;
}

const RETURN_TO_KEY = 'returnTo';

/**
 * Ouvre `path` en retenant la page d'où l'on vient. L'information vit dans l'historique du navigateur
 * (pas dans l'URL) : elle survit à un rechargement et disparaît avec l'entrée d'historique.
 */
export function withReturnTo(path: string, returnTo: string): RouteLocationRaw {
    return { path, state: { [RETURN_TO_KEY]: returnTo } };
}

/** Page d'origine retenue par `withReturnTo`, ou `null`. Seuls les chemins internes sont acceptés. */
export function readReturnTo(state: unknown = typeof window === 'undefined' ? null : window.history.state): string | null {
    const value = (state as Record<string, unknown> | null)?.[RETURN_TO_KEY];
    if (typeof value !== 'string') return null;
    return value.startsWith('/') && !value.startsWith('//') ? value : null;
}
