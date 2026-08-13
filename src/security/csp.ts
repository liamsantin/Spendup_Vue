/**
 * Politiques CSP Spendup (SPA Vue).
 * - Dev : Report-Only (HMR Vite nécessite unsafe-eval / ws).
 * - Prod : enforce (build hashé + Google GIS + fonts).
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

/** Dev / HMR — ne pas enforce (casse Vite). */
export const CSP_DEV_REPORT_ONLY = [
    ...SHARED,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
    "connect-src 'self' http: https: ws: wss:"
].join('; ');

/**
 * Prod enforce — pas de `unsafe-eval` ni `ws` (HMR).
 * Prérequis : `__INTLIFY_JIT_COMPILATION__` dans vite (sinon vue-i18n → EvalError).
 * connect-src resserré : self, Google, localhost (preview → API), https/wss.
 */
export const CSP_PROD_ENFORCE = [
    ...SHARED,
    "script-src 'self' https://accounts.google.com",
    "connect-src 'self' https://accounts.google.com https://*.googleapis.com http://localhost:* http://127.0.0.1:* https: wss:"
].join('; ');

export const SECURITY_HEADERS_BASE = {
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    // camera=(self) : scan QR amis (Découvrir). micro / géoloc / paiement restent coupés.
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()'
} as const;
