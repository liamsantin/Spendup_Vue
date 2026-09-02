import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { isSafeAppNotificationPath } from '@/features/notifications';
import { isTauri } from '@/utils/helpers/platform-helpers';

/**
 * Convertit une URL `spendup://…` en chemin Vue interne `/app…`.
 * Ex. `spendup://app/friends` → `/app/friends`
 *     `spendup:///app/comptes?tab=Security` → `/app/comptes?tab=Security` (redirect vue-router)
 * Refuse tout hors scheme `spendup:` ou chemin non `/app…` (open-redirect).
 */
export function resolveSpendupDeepLink(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return null;
    }

    if (url.protocol !== 'spendup:') return null;

    let path: string;
    if (url.hostname) {
        // spendup://app/friends → host=app, pathname=/friends
        const suffix = url.pathname === '/' ? '' : url.pathname;
        path = `/${url.hostname}${suffix}`;
    } else {
        // spendup:///app/friends → pathname=/app/friends
        path = url.pathname || '/';
    }

    if (url.search) {
        path += url.search;
    }

    if (!isSafeAppNotificationPath(path)) return null;
    return path;
}

function navigateFirstSafe(urls: string[], navigate: (path: string) => void) {
    for (const raw of urls) {
        const path = resolveSpendupDeepLink(raw);
        if (path) {
            navigate(path);
            return;
        }
    }
}

/**
 * Écoute les deep links OS (`spendup://`) : cold start (`getCurrent`) + runtime (`onOpenUrl`).
 * Sur Windows/Linux, le plugin single-instance (feature deep-link) forward les argv
 * de la 2ᵉ instance vers l’instance primaire avant d’émettre l’événement.
 */
export async function registerDesktopDeepLinks(navigate: (path: string) => void): Promise<void> {
    if (!isTauri()) return;

    try {
        const startUrls = await getCurrent();
        if (startUrls?.length) {
            navigateFirstSafe(startUrls, navigate);
        }
    } catch {
        // Plugin / plateforme — non bloquant
    }

    try {
        await onOpenUrl((urls) => {
            navigateFirstSafe(urls, navigate);
        });
    } catch {
        // Unsupported sans single-instance — non bloquant
    }
}
