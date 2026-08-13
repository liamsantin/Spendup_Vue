import { computed } from 'vue';
import { APP_HOME_ROUTE } from '@/features/auth';
import { isTauri } from '@/utils/helpers/platform-helpers';

/**
 * Cible « home » hors zone `/app` :
 * - Tauri → login (pas de landings marketing)
 * - Web → `/` (landings) sauf override explicite
 */
export function useAppHomeTarget(explicitHomeTo?: string) {
    return computed(() => {
        if (isTauri()) return '/auth/login';
        return explicitHomeTo ?? '/';
    });
}

/** Cible logo sous `/app` ou après auth. */
export function appAuthenticatedHome(): string {
    return APP_HOME_ROUTE;
}
