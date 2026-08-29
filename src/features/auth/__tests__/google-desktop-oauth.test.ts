import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const listen = vi.fn();
const openUrl = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => invoke(...args)
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: (...args: unknown[]) => listen(...args)
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
    openUrl: (...args: unknown[]) => openUrl(...args)
}));

type ReadyHandler = (e: { payload: string }) => void;

function mockLoopbackFlow() {
    const handlers: ReadyHandler[] = [];
    let resolveWait: ((url: string) => void) | undefined;
    let rejectWait: ((err: Error) => void) | undefined;

    listen.mockImplementation(async (_event: string, handler: ReadyHandler) => {
        handlers.push(handler);
        return vi.fn();
    });

    invoke.mockImplementation(async (cmd: string, args?: unknown) => {
        if (cmd === 'oauth_loopback_wait') {
            return new Promise<string>((resolve, reject) => {
                resolveWait = resolve;
                rejectWait = reject;
            });
        }
        if (cmd === 'oauth_loopback_cancel') {
            rejectWait?.(new Error('Google sign-in cancelled'));
            return undefined;
        }
        if (cmd === 'google_exchange_code') {
            return `exchanged:${(args as { code?: string })?.code ?? ''}`;
        }
        return undefined;
    });

    openUrl.mockResolvedValue(undefined);

    return {
        handlers,
        emitReady: (uri = 'http://127.0.0.1:33333/auth/google/callback') => {
            handlers[0]!({ payload: uri });
        },
        resolveWait: (url: string) => resolveWait?.(url),
        rejectWait: (err: Error) => rejectWait?.(err),
        authStateFromOpenUrl: () => {
            const url = new URL(String(openUrl.mock.calls[0]?.[0]));
            return url.searchParams.get('state') ?? '';
        }
    };
}

async function loadOAuthModule() {
    const mod = await import('../google-desktop-oauth');
    mod.__resetGoogleDesktopOAuthForTests();
    return mod;
}

describe('requestGoogleIdTokenDesktop', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', 'desktop-client-id');
    });

    it('refuse un second flux tant que le premier est en cours', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop, isGoogleDesktopOAuthInProgress } = await loadOAuthModule();

        const first = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => {
            expect(flow.handlers.length).toBe(1);
            expect(isGoogleDesktopOAuthInProgress()).toBe(true);
        });

        await expect(requestGoogleIdTokenDesktop()).rejects.toThrow(/already in progress/i);

        flow.emitReady('http://127.0.0.1:54321/auth/google/callback');
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalled());

        flow.resolveWait('http://127.0.0.1:54321/auth/google/callback?error=access_denied');
        await expect(first).rejects.toThrow(/access_denied/);
        expect(isGoogleDesktopOAuthInProgress()).toBe(false);
    });

    it('ouvre le navigateur après oauth-loopback-ready', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));

        flow.emitReady('http://127.0.0.1:11111/auth/google/callback');
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalledTimes(1));
        expect(decodeURIComponent(String(openUrl.mock.calls[0]?.[0]))).toContain(
            'redirect_uri=http://127.0.0.1:11111/auth/google/callback'
        );

        flow.resolveWait('http://127.0.0.1:11111/auth/google/callback?error=access_denied');
        await expect(pending).rejects.toThrow(/access_denied/);
    });

    it('annule le wait et remonte une erreur si openUrl échoue', async () => {
        const flow = mockLoopbackFlow();
        openUrl.mockRejectedValue(new Error('no default browser'));

        const { requestGoogleIdTokenDesktop, isGoogleDesktopBrowserOpenError, BROWSER_OPEN_ERROR } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));
        flow.emitReady('http://127.0.0.1:22222/auth/google/callback');

        await expect(pending).rejects.toSatisfy((err: unknown) => {
            expect(isGoogleDesktopBrowserOpenError(err)).toBe(true);
            expect(String(err)).toContain(BROWSER_OPEN_ERROR);
            expect(String(err)).toContain('no default browser');
            return true;
        });
        expect(invoke).toHaveBeenCalledWith('oauth_loopback_cancel');
    });

    it('échange le code quand callback code/state sont valides', async () => {
        const flow = mockLoopbackFlow();
        const onAuthorized = vi.fn();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop({ onAuthorized });
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));
        flow.emitReady();
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalled());

        const state = flow.authStateFromOpenUrl();
        flow.resolveWait(`http://127.0.0.1:33333/auth/google/callback?code=auth-code-1&state=${encodeURIComponent(state)}`);

        await expect(pending).resolves.toBe('exchanged:auth-code-1');
        expect(onAuthorized).toHaveBeenCalledTimes(1);
        expect(invoke).toHaveBeenCalledWith(
            'google_exchange_code',
            expect.objectContaining({
                clientId: 'desktop-client-id',
                code: 'auth-code-1',
                redirectUri: 'http://127.0.0.1:33333/auth/google/callback',
                codeVerifier: expect.any(String)
            })
        );
        expect(invoke.mock.calls.some((c) => c[0] === 'google_exchange_code' && c[1] && 'clientSecret' in (c[1] as object))).toBe(false);
    });

    it('rejette un state OAuth invalide', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));
        flow.emitReady();
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalled());

        flow.resolveWait('http://127.0.0.1:33333/auth/google/callback?code=auth-code-1&state=tampered');
        await expect(pending).rejects.toThrow(/Invalid OAuth state/);
        expect(invoke).not.toHaveBeenCalledWith('google_exchange_code', expect.anything());
    });

    it('rejette un callback sans code ou state', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));
        flow.emitReady();
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalled());

        flow.resolveWait('http://127.0.0.1:33333/auth/google/callback?state=only-state');
        await expect(pending).rejects.toThrow(/missing code\/state/);
    });

    it('propage error_description du callback Google', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));
        flow.emitReady();
        await vi.waitFor(() => expect(openUrl).toHaveBeenCalled());

        flow.resolveWait('http://127.0.0.1:33333/auth/google/callback?error=access_denied&error_description=User%20denied');
        await expect(pending).rejects.toThrow(/User denied/);
    });

    it('propage l’annulation du wait loopback', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop, isGoogleDesktopCancelled } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));

        flow.rejectWait(new Error('Google sign-in cancelled'));
        await expect(pending).rejects.toSatisfy((err: unknown) => {
            expect(isGoogleDesktopCancelled(err)).toBe(true);
            return true;
        });
    });

    it('propage le timeout du wait loopback', async () => {
        const flow = mockLoopbackFlow();
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => expect(flow.handlers.length).toBe(1));

        flow.rejectWait(new Error('Google sign-in timed out'));
        await expect(pending).rejects.toThrow(/timed out/i);
    });

    it('refuse de démarrer si la config Desktop est incomplète', async () => {
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', '');
        const { requestGoogleIdTokenDesktop } = await loadOAuthModule();

        await expect(requestGoogleIdTokenDesktop()).rejects.toThrow(/CLIENT_ID must be configured/);
        expect(listen).not.toHaveBeenCalled();
    });
});

describe('helpers Google desktop OAuth', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it('isGoogleDesktopConfigured exige seulement le client ID (secret natif)', async () => {
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', '');
        const incomplete = await loadOAuthModule();
        expect(incomplete.isGoogleDesktopConfigured()).toBe(false);

        vi.resetModules();
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', 'desktop-id');
        const complete = await loadOAuthModule();
        expect(complete.isGoogleDesktopConfigured()).toBe(true);
    });

    it('isGoogleDesktopCancelled reconnaît cancelled / canceled', async () => {
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', 'id');
        const { isGoogleDesktopCancelled } = await loadOAuthModule();

        expect(isGoogleDesktopCancelled(new Error('Google sign-in cancelled'))).toBe(true);
        expect(isGoogleDesktopCancelled(new Error('Google sign-in canceled'))).toBe(true);
        expect(isGoogleDesktopCancelled(new Error('Invalid OAuth state'))).toBe(false);
    });

    it('cancelGoogleDesktopOAuth invoque oauth_loopback_cancel', async () => {
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', 'id');
        invoke.mockResolvedValue(undefined);
        const { cancelGoogleDesktopOAuth } = await loadOAuthModule();

        await cancelGoogleDesktopOAuth();
        expect(invoke).toHaveBeenCalledWith('oauth_loopback_cancel');
    });
});
