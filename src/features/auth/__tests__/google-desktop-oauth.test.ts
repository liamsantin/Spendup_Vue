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

describe('requestGoogleIdTokenDesktop', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_ID', 'desktop-client-id');
        vi.stubEnv('VITE_GOOGLE_DESKTOP_CLIENT_SECRET', 'desktop-secret');
    });

    it('refuse un second flux tant que le premier est en cours', async () => {
        const handlers: Array<(e: { payload: string }) => void> = [];
        let resolveWait: ((url: string) => void) | undefined;
        const waitPromise = new Promise<string>((resolve) => {
            resolveWait = resolve;
        });

        listen.mockImplementation(async (_event: string, handler: (e: { payload: string }) => void) => {
            handlers.push(handler);
            return vi.fn();
        });
        invoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'oauth_loopback_wait') return waitPromise;
            return undefined;
        });
        openUrl.mockResolvedValue(undefined);

        const { requestGoogleIdTokenDesktop, isGoogleDesktopOAuthInProgress, __resetGoogleDesktopOAuthForTests } =
            await import('../google-desktop-oauth');
        __resetGoogleDesktopOAuthForTests();

        const first = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => {
            expect(handlers.length).toBe(1);
            expect(isGoogleDesktopOAuthInProgress()).toBe(true);
        });

        await expect(requestGoogleIdTokenDesktop()).rejects.toThrow(/already in progress/i);

        handlers[0]!({ payload: 'http://127.0.0.1:54321/auth/google/callback' });
        await vi.waitFor(() => {
            expect(openUrl).toHaveBeenCalled();
        });

        resolveWait?.('http://127.0.0.1:54321/auth/google/callback?error=access_denied');
        await expect(first).rejects.toThrow(/access_denied/);
        expect(isGoogleDesktopOAuthInProgress()).toBe(false);
    });

    it('ouvre le navigateur après oauth-loopback-ready', async () => {
        const handlers: Array<(e: { payload: string }) => void> = [];

        listen.mockImplementation(async (_event: string, handler: (e: { payload: string }) => void) => {
            handlers.push(handler);
            return vi.fn();
        });

        let resolveWait: ((url: string) => void) | undefined;
        invoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'oauth_loopback_wait') {
                return new Promise<string>((resolve) => {
                    resolveWait = resolve;
                });
            }
            return undefined;
        });
        openUrl.mockResolvedValue(undefined);

        const { requestGoogleIdTokenDesktop, __resetGoogleDesktopOAuthForTests } = await import('../google-desktop-oauth');
        __resetGoogleDesktopOAuthForTests();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => {
            expect(handlers.length).toBe(1);
        });

        handlers[0]!({ payload: 'http://127.0.0.1:11111/auth/google/callback' });
        await vi.waitFor(() => {
            expect(openUrl).toHaveBeenCalledTimes(1);
        });
        expect(decodeURIComponent(String(openUrl.mock.calls[0]?.[0]))).toContain(
            'redirect_uri=http://127.0.0.1:11111/auth/google/callback'
        );

        resolveWait?.('http://127.0.0.1:11111/auth/google/callback?error=access_denied');
        await expect(pending).rejects.toThrow(/access_denied/);
    });

    it('annule le wait et remonte une erreur si openUrl échoue', async () => {
        const handlers: Array<(e: { payload: string }) => void> = [];

        listen.mockImplementation(async (_event: string, handler: (e: { payload: string }) => void) => {
            handlers.push(handler);
            return vi.fn();
        });

        let rejectWait: ((err: Error) => void) | undefined;
        invoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'oauth_loopback_wait') {
                return new Promise<string>((_resolve, reject) => {
                    rejectWait = reject;
                });
            }
            if (cmd === 'oauth_loopback_cancel') {
                rejectWait?.(new Error('Google sign-in cancelled'));
                return undefined;
            }
            return undefined;
        });
        openUrl.mockRejectedValue(new Error('no default browser'));

        const {
            requestGoogleIdTokenDesktop,
            isGoogleDesktopBrowserOpenError,
            BROWSER_OPEN_ERROR,
            __resetGoogleDesktopOAuthForTests
        } = await import('../google-desktop-oauth');
        __resetGoogleDesktopOAuthForTests();

        const pending = requestGoogleIdTokenDesktop();
        await vi.waitFor(() => {
            expect(handlers.length).toBe(1);
        });

        handlers[0]!({ payload: 'http://127.0.0.1:22222/auth/google/callback' });

        await expect(pending).rejects.toSatisfy((err: unknown) => {
            expect(isGoogleDesktopBrowserOpenError(err)).toBe(true);
            expect(String(err)).toContain(BROWSER_OPEN_ERROR);
            expect(String(err)).toContain('no default browser');
            return true;
        });
        expect(invoke).toHaveBeenCalledWith('oauth_loopback_cancel');
    });
});
