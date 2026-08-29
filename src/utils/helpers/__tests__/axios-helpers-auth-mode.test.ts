import { afterEach, describe, expect, it, vi } from 'vitest';

describe('assertProductionAuthCookieMode', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('no-op hors production', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
        const { assertProductionAuthCookieMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthCookieMode()).not.toThrow();
    });

    it('autorise la prod en cookie-mode', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        const { assertProductionAuthCookieMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthCookieMode()).not.toThrow();
    });

    it('refuse la prod en mode legacy', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
        const { assertProductionAuthCookieMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthCookieMode()).toThrow(/VITE_AUTH_COOKIE_MODE must be true/);
    });
});
