/**
 * Cibles de déploiement web : un même code, trois builds (`vite build --mode <cible>`).
 *   - landing : spendup.ch       → pages publiques
 *   - demo    : demo.spendup.ch  → démo (préfixe /demo)
 *   - app     : app.spendup.ch   → authentification + application
 * `all` (VITE_TARGET absent : dev, tests, application Windows) = toutes les routes sur une origine.
 */
export type AppTarget = 'landing' | 'demo' | 'app';
export type BuildTarget = AppTarget | 'all';

function readTarget(): BuildTarget {
    const raw = String(import.meta.env.VITE_TARGET ?? '')
        .trim()
        .toLowerCase();
    return raw === 'landing' || raw === 'demo' || raw === 'app' ? raw : 'all';
}

export const APP_TARGET: BuildTarget = readTarget();

function baseUrl(target: AppTarget): string {
    const env = import.meta.env;
    const raw = target === 'landing' ? env.VITE_LANDING_URL : target === 'demo' ? env.VITE_DEMO_URL : env.VITE_APP_URL;
    return String(raw ?? '')
        .trim()
        .replace(/\/$/, '');
}

/**
 * Lien vers une page d'une autre cible. Sur la même cible (ou en mode `all`, ou URL non configurée),
 * renvoie le chemin relatif. À utiliser avec `<a href>` / `:href` : un `router.push` ne change pas de domaine.
 */
export function crossHref(target: AppTarget, path: string): string {
    // Sur demo.spendup.ch les URLs sont sans préfixe : `/demo/finances` s'y écrit `/finances`.
    const local = target === 'demo' && APP_TARGET !== 'all' ? stripDemoPrefix(path) : path;
    if (APP_TARGET === 'all' || APP_TARGET === target) return local;
    return `${baseUrl(target)}${local}`;
}

/** `/demo/x` → `/x`, `/demo` → `/`, `/demo?a=1` → `/?a=1`. */
export function stripDemoPrefix(path: string): string {
    if (!/^\/demo(?=[/?#]|$)/.test(path)) return path;
    const rest = path.slice('/demo'.length);
    return rest === '' || rest.startsWith('?') || rest.startsWith('#') ? `/${rest}` : rest;
}
