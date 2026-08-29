/**
 * Politiques CSP Spendup (SPA Vue).
 * - Dev : Report-Only (HMR Vite nécessite unsafe-eval / ws).
 * - Prod : enforce (build hashé + Google GIS + fonts).
 * - Desktop Tauri : miroir dans `src-tauri/tauri.conf.json` (`app.security.csp` + `devCsp`)
 *   avec en plus `ipc:` / `http://ipc.localhost` et `asset:` / `http://asset.localhost`.
 *   Tauri ajoute nonces/hashes script au build.
 */

const SHARED = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'frame-src https://accounts.google.com',
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'"
] as const;

/** Origins API (HTTP + WS) dérivées de `VITE_API_BASE_URL` — pas de wildcard `https:` / `wss:`. */
export function apiConnectSources(apiBaseUrl: string | null | undefined): string[] {
    const raw = String(apiBaseUrl ?? '')
        .trim()
        .replace(/\/$/, '');
    if (!raw) return [];
    try {
        const url = new URL(raw);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return [];
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return [url.origin, `${wsProtocol}//${url.host}`];
    } catch {
        return [];
    }
}

/** connect-src prod : self + Google + localhost + origine API (si fournie). */
export function buildProdConnectSrc(apiBaseUrl?: string | null): string {
    const parts = [
        "'self'",
        'https://accounts.google.com',
        'https://*.googleapis.com',
        'http://localhost:*',
        'http://127.0.0.1:*',
        'ws://localhost:*',
        'ws://127.0.0.1:*',
        'wss://localhost:*',
        'wss://127.0.0.1:*',
        ...apiConnectSources(apiBaseUrl)
    ];
    return `connect-src ${Array.from(new Set(parts)).join(' ')}`;
}

/** Dev / HMR — ne pas enforce (casse Vite). */
export const CSP_DEV_REPORT_ONLY = [
    ...SHARED,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
    "connect-src 'self' http: https: ws: wss:"
].join('; ');

/**
 * Prod enforce — pas de `unsafe-eval` ni wildcard `https:` / `wss:`.
 * Prérequis : `__INTLIFY_JIT_COMPILATION__` dans vite (sinon vue-i18n → EvalError).
 * Passer `VITE_API_BASE_URL` au build pour autoriser l’API distante + SignalR.
 */
export function buildCspProdEnforce(apiBaseUrl?: string | null): string {
    return [...SHARED, "script-src 'self' https://accounts.google.com", buildProdConnectSrc(apiBaseUrl)].join('; ');
}

/** Défaut build local (localhost API) — surchargé au build via `buildCspProdEnforce`. */
export const CSP_PROD_ENFORCE = buildCspProdEnforce('http://localhost:5124');

export const SECURITY_HEADERS_BASE = {
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    // camera=(self) : scan QR amis (Découvrir). micro / géoloc / paiement restent coupés.
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()'
} as const;
