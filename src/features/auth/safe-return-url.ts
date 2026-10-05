/** Fallback post-login — aligné sur `APP_HOME_ROUTE`. */
const DEFAULT_RETURN = '/app';

/**
 * Chemins internes `/app`, `/app?…`, `/app#…` ou `/app/…` uniquement.
 * Bloque `//evil.com`, URLs absolues, `/application…`, `..`, etc.
 */
export function isSafeAppPath(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('/')) return false;
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('/\\')) return false;
    if (trimmed.includes('..')) return false;
    const isAppRoot = trimmed === '/app' || trimmed.startsWith('/app?') || trimmed.startsWith('/app#');
    return isAppRoot || trimmed.startsWith('/app/');
}

/**
 * N’accepte que des chemins internes `/app…` (voir `isSafeAppPath`).
 * Sinon renvoie `fallback` (défaut `/app`).
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback: string = DEFAULT_RETURN): string {
    if (!isSafeAppPath(url)) return fallback;
    return url!.trim();
}
