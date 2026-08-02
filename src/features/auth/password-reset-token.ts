import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';

function tokenFromHash(hash: string): string | null {
    const raw = hash.replace(/^#/, '').trim();
    if (!raw) return null;
    const params = new URLSearchParams(raw.includes('=') ? raw : `token=${raw}`);
    const value = params.get('token')?.trim();
    return value || null;
}

function tokenFromQuery(query: RouteLocationNormalizedLoaded['query']): string | null {
    const q = query.token;
    if (typeof q === 'string' && q.trim()) return q.trim();
    if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) return q[0].trim();
    return null;
}

/**
 * Lit le jeton reset.
 * Priorité au fragment `#token=` (contrat mail API — non envoyé en Referer),
 * puis `?token=` (liens legacy).
 */
export function readPasswordResetToken(route: RouteLocationNormalizedLoaded): string | null {
    const fromRouteHash = tokenFromHash(route.hash);
    if (fromRouteHash) return fromRouteHash;

    if (typeof window !== 'undefined') {
        const fromWindow = tokenFromHash(window.location.hash);
        if (fromWindow) return fromWindow;
    }

    return tokenFromQuery(route.query);
}

/** Retire `?token=` / `#token=` de la barre d’adresse (historique + Referer). */
export function clearPasswordResetTokenFromUrl(router: Router, route: RouteLocationNormalizedLoaded): void {
    const hasQueryToken = !!tokenFromQuery(route.query);
    const hasHashToken = !!tokenFromHash(route.hash) || (typeof window !== 'undefined' && !!tokenFromHash(window.location.hash));

    if (hasQueryToken || hasHashToken || route.hash) {
        void router.replace({ path: route.path, query: {}, hash: '' });
    }

    if (typeof window !== 'undefined' && window.location.hash) {
        const { pathname, search } = window.location;
        window.history.replaceState(window.history.state, '', `${pathname}${search}`);
    }
}
