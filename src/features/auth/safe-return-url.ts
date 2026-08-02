/** Fallback post-login — aligné sur `APP_HOME_ROUTE`. */
const DEFAULT_RETURN = '/app';

/**
 * N’accepte que des chemins internes `/app…` (bloque `//evil.com`, URLs absolues, etc.).
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback: string = DEFAULT_RETURN): string {
    if (!url) return fallback;
    const trimmed = url.trim();
    if (!trimmed.startsWith('/')) return fallback;
    if (trimmed.startsWith('//')) return fallback;
    if (trimmed.startsWith('/\\')) return fallback;
    if (!trimmed.startsWith('/app')) return fallback;
    return trimmed;
}
