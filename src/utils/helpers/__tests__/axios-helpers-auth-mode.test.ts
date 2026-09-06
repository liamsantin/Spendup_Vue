import { afterEach, describe, expect, it, vi } from 'vitest';

describe('isAuthCookieMode', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('force Bearer en production même si l’env demande le cookie-mode', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        const { isAuthCookieMode, shouldSendBearerAuth } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(false);
        expect(shouldSendBearerAuth()).toBe(true);
    });

    it('autorise le cookie-mode hors production', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        const { isAuthCookieMode, shouldSendBearerAuth } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(true);
        expect(shouldSendBearerAuth()).toBe(false);
    });

    it('Bearer hors production si le flag est false', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
        const { isAuthCookieMode, shouldSendBearerAuth } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(false);
        expect(shouldSendBearerAuth()).toBe(true);
    });
});
