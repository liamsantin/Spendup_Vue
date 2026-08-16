import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
/** Chemin de callback loopback (Google OAuth native / Desktop). */
export const GOOGLE_DESKTOP_CALLBACK_PATH = '/auth/google/callback';
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const IN_PROGRESS_ERROR = 'Google sign-in already in progress';
/** Message stable pour UI / tests quand `openUrl` échoue. */
export const BROWSER_OPEN_ERROR = 'Failed to open system browser for Google sign-in';

/** @deprecated Conservé pour compat imports — le redirect réel est `http://127.0.0.1:<port>/auth/google/callback`. */
export const GOOGLE_DESKTOP_REDIRECT_URI = `http://127.0.0.1${GOOGLE_DESKTOP_CALLBACK_PATH}`;

/** Verrou process : un seul flux OAuth desktop à la fois (évite listeners croisés). */
let flowActive = false;
/** Incrémenté à chaque nouveau flux / reset — les listeners périmés ignorent les events. */
let flowGeneration = 0;

function desktopClientId(): string {
    return String(import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID ?? '').trim();
}

function desktopClientSecret(): string {
    return String(import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET ?? '').trim();
}

export function isGoogleDesktopConfigured(): boolean {
    // Google Desktop affiche un secret client et le token endpoint l’exige souvent même avec PKCE.
    return desktopClientId().length > 0 && desktopClientSecret().length > 0;
}

export function isGoogleDesktopOAuthInProgress(): boolean {
    return flowActive;
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

export function isGoogleDesktopBrowserOpenError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes(BROWSER_OPEN_ERROR);
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

function buildAuthorizeUrl(redirectUri: string, state: string, codeChallenge: string): string {
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', desktopClientId());
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'select_account');
    return authUrl.toString();
}

export type GoogleDesktopOAuthOptions = {
    /** Appelé dès que Google a redirigé avec un code valide, avant l’échange du token. */
    onAuthorized?: () => void;
};

/**
 * Ouvre Google OAuth (PKCE) dans le navigateur système et résout un ID token
 * via redirect loopback + échange token **natif** (pas de fetch WebView → CORS).
 * Un seul appel à la fois : sinon erreur « already in progress ».
 */
export async function requestGoogleIdTokenDesktop(options: GoogleDesktopOAuthOptions = {}): Promise<string> {
    if (!isGoogleDesktopConfigured()) {
        throw new Error('VITE_GOOGLE_DESKTOP_CLIENT_ID and VITE_GOOGLE_DESKTOP_CLIENT_SECRET must both be configured');
    }
    if (flowActive) {
        throw new Error(IN_PROGRESS_ERROR);
    }

    flowActive = true;
    const generation = ++flowGeneration;

    let unlisten: UnlistenFn | undefined;
    try {
        const state = randomUrlSafe(16);
        const codeVerifier = randomUrlSafe(32);
        const codeChallenge = await pkceChallenge(codeVerifier);

        let resolveReady: ((uri: string) => void) | undefined;
        let rejectReady: ((err: unknown) => void) | undefined;
        const readyPromise = new Promise<string>((resolve, reject) => {
            resolveReady = resolve;
            rejectReady = reject;
        });

        unlisten = await listen<string>('oauth-loopback-ready', (event) => {
            if (generation !== flowGeneration) return;
            resolveReady?.(event.payload);
        });

        const waitPromise = invoke<string>('oauth_loopback_wait', { timeoutMs: OAUTH_TIMEOUT_MS });
        // Si le wait échoue avant l’event ready (cancel / timeout / bind), débloque readyPromise.
        void waitPromise.then(
            () => undefined,
            (err) => {
                rejectReady?.(err);
            }
        );

        let redirectUri: string;
        try {
            redirectUri = await readyPromise;
        } catch (err) {
            // Attendre le rejet du wait pour ne pas laisser une promesse orpheline.
            await waitPromise.catch(() => undefined);
            throw err;
        }

        if (generation !== flowGeneration) {
            await cancelGoogleDesktopOAuth().catch(() => undefined);
            await waitPromise.catch(() => undefined);
            throw new Error(IN_PROGRESS_ERROR);
        }

        try {
            await openUrl(buildAuthorizeUrl(redirectUri, state, codeChallenge));
        } catch (err) {
            await cancelGoogleDesktopOAuth().catch(() => undefined);
            await waitPromise.catch(() => undefined);
            const detail = err instanceof Error ? err.message : String(err);
            throw new Error(detail ? `${BROWSER_OPEN_ERROR}: ${detail}` : BROWSER_OPEN_ERROR);
        }

        const callbackUrl = await waitPromise;
        if (generation !== flowGeneration) {
            throw new Error(IN_PROGRESS_ERROR);
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
        unlisten?.();
        if (generation === flowGeneration) {
            flowActive = false;
        }
    }
}

/** Tests / teardown — libère le verrou et invalide les listeners. */
export function __resetGoogleDesktopOAuthForTests() {
    flowActive = false;
    flowGeneration += 1;
}
