import type { LocationQuery, RouteLocationNormalized } from 'vue-router';

/** Routes canoniques des pages paramètres (ex-onglets de `/app/comptes`). */
export const SETTINGS_PATHS = {
    account: '/app/parametres/compte',
    preferences: '/app/parametres/preferences',
    notifications: '/app/parametres/notifications',
    security: '/app/parametres/securite'
} as const;

const LEGACY_TAB_TO_PATH: Record<string, string> = {
    Account: SETTINGS_PATHS.account,
    Preferences: SETTINGS_PATHS.preferences,
    Notifications: SETTINGS_PATHS.notifications,
    Security: SETTINGS_PATHS.security
};

function pathWithoutQuery(path: string): string {
    const q = path.indexOf('?');
    const h = path.indexOf('#');
    const end = [q, h].filter((i) => i >= 0).sort((a, b) => a - b)[0];
    return end == null ? path : path.slice(0, end);
}

function settingsPathForTab(tab: string | null | undefined): string {
    if (!tab) return SETTINGS_PATHS.account;
    return LEGACY_TAB_TO_PATH[tab] ?? SETTINGS_PATHS.account;
}

/** `/app/comptes` et `/app/applications` — anciennes URLs de la page à onglets. */
export function isLegacySettingsPath(path: string): boolean {
    const pathname = pathWithoutQuery(path);
    return pathname === '/app/comptes' || pathname === '/app/applications';
}

/**
 * Réécrit un lien `/app/comptes?tab=Security` (ou `/app/applications`) vers la page dédiée.
 * Conserve query (hors `tab`) et hash. `null` si ce n’est pas une ancienne URL paramètres.
 */
export function rewriteLegacySettingsLink(link: string): string | null {
    if (!isLegacySettingsPath(link)) return null;

    const url = new URL(link, 'https://spendup.local');
    if (url.pathname === '/app/applications') {
        return SETTINGS_PATHS.account + url.hash;
    }

    const dest = settingsPathForTab(url.searchParams.get('tab'));
    url.searchParams.delete('tab');
    const search = url.searchParams.toString();
    return dest + (search ? `?${search}` : '') + url.hash;
}

/** Redirect vue-router pour `/app/comptes?tab=…`. */
export function resolveLegacySettingsRedirect(to: Pick<RouteLocationNormalized, 'query' | 'hash'>): {
    path: string;
    query: LocationQuery;
    hash: string;
} {
    const tab = typeof to.query.tab === 'string' ? to.query.tab : '';
    const query = { ...to.query };
    delete query.tab;
    return { path: settingsPathForTab(tab), query, hash: to.hash };
}
