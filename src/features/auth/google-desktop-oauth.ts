import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
/** Chemin de callback loopback (Google OAuth native / Desktop). */
export const GOOGLE_DESKTOP_CALLBACK_PATH = '/auth/google/callback';
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

/** @deprecated Conservé pour compat imports — le redirect réel est `http://127.0.0.1:<port>/auth/google/callback`. */
export const GOOGLE_DESKTOP_REDIRECT_URI = `http://127.0.0.1${GOOGLE_DESKTOP_CALLBACK_PATH}`;

function desktopClientId(): string {
    return String(import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID ?? '').trim();
}

function desktopClientSecret(): string {
    return String(import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET ?? '').trim();
}

export function isGoogleDesktopConfigured(): boolean {
    return desktopClientId().length > 0;
}

/**
 * Interrompt l’attente du callback loopback : le navigateur ne prévient pas
 * quand l’utilisateur ferme l’onglet Google, seul un abandon explicite débloque.
 */
export async function cancelGoogleDesktopOAuth(): Promise<void> {
    await invoke('oauth_loopback_cancel');
}

export function isGoogleDesktopCancelled(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /cancell?ed/i.test(message);
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomUrlSafe(byteLength: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
    return base64UrlEncode(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
}

function parseCallbackUrl(url: string): { code?: string; state?: string; error?: string; errorDescription?: string } {
    const parsed = new URL(url);
    return {
        code: parsed.searchParams.get('code') ?? undefined,
        state: parsed.searchParams.get('state') ?? undefined,
        error: parsed.searchParams.get('error') ?? undefined,
        errorDescription: parsed.searchParams.get('error_description') ?? undefined
    };
}

export type GoogleDesktopOAuthOptions = {
    /** Appelé dès que Google a redirigé avec un code valide, avant l’échange du token. */
    onAuthorized?: () => void;
};

/**
 * Ouvre Google OAuth (PKCE) dans le navigateur système et résout un ID token
 * via redirect loopback + échange token **natif** (pas de fetch WebView → CORS).
 */
export async function requestGoogleIdTokenDesktop(options: GoogleDesktopOAuthOptions = {}): Promise<string> {
    if (!isGoogleDesktopConfigured()) {
        throw new Error('VITE_GOOGLE_DESKTOP_CLIENT_ID is not configured');
    }

    const state = randomUrlSafe(16);
    const codeVerifier = randomUrlSafe(32);
    const codeChallenge = await pkceChallenge(codeVerifier);

    let redirectUri = '';
    const unlisten = await listen<string>('oauth-loopback-ready', (event) => {
        redirectUri = event.payload;
        const authUrl = new URL(GOOGLE_AUTH_URL);
        authUrl.searchParams.set('client_id', desktopClientId());
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('prompt', 'select_account');
        void openUrl(authUrl.toString());
    });

    try {
        const callbackUrl = await invoke<string>('oauth_loopback_wait', { timeoutMs: OAUTH_TIMEOUT_MS });
        if (!redirectUri) {
            const u = new URL(callbackUrl);
            redirectUri = `${u.protocol}//${u.host}${GOOGLE_DESKTOP_CALLBACK_PATH}`;
        }

        const parsed = parseCallbackUrl(callbackUrl);
        if (parsed.error) {
            throw new Error(parsed.errorDescription || parsed.error);
        }
        if (!parsed.code || !parsed.state) {
            throw new Error('Google OAuth callback missing code/state');
        }
        if (parsed.state !== state) {
            throw new Error('Invalid OAuth state');
        }

        options.onAuthorized?.();

        return await invoke<string>('google_exchange_code', {
            clientId: desktopClientId(),
            code: parsed.code,
            codeVerifier,
            redirectUri,
            clientSecret: desktopClientSecret() || null
        });
    } finally {
        unlisten();
    }
}

/** Tests / teardown. */
export function __resetGoogleDesktopOAuthForTests() {
    // no-op
}
