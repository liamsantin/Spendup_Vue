import { afterEach, describe, expect, it, vi } from 'vitest';

describe('assertProductionAuthBearerMode', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('no-op hors production', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        const { assertProductionAuthBearerMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthBearerMode()).not.toThrow();
    });

    it('autorise la prod en Bearer', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
        const { assertProductionAuthBearerMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthBearerMode()).not.toThrow();
    });

    it('refuse la prod en cookie-mode', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        const { assertProductionAuthBearerMode } = await import('../axios-helpers');
        expect(() => assertProductionAuthBearerMode()).toThrow(/VITE_AUTH_COOKIE_MODE must be false/);
    });
});
