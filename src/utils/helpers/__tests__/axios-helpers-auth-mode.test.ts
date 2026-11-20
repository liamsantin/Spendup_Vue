import { afterEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ tauri: false }));

vi.mock('@/utils/helpers/platform-helpers', () => ({
    isTauri: () => platform.tauri
}));

describe('isAuthCookieMode', () => {
    afterEach(() => {
        platform.tauri = false;
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('reste en Bearer en production tant que le même site n’est pas attesté', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        vi.stubEnv('VITE_AUTH_SAME_SITE_API', '');
        const { isAuthCookieMode, shouldSendBearerAuth } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(false);
        expect(shouldSendBearerAuth()).toBe(true);
    });

    it('passe en cookie-mode en production quand l’API est attestée sur le même site', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        vi.stubEnv('VITE_AUTH_SAME_SITE_API', 'true');
        const { isAuthCookieMode, shouldSendBearerAuth } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(true);
        expect(shouldSendBearerAuth()).toBe(false);
    });

    it('l’attestation seule ne suffit pas : le cookie-mode doit être demandé', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'false');
        vi.stubEnv('VITE_AUTH_SAME_SITE_API', 'true');
        const { isAuthCookieMode } = await import('../axios-helpers');
        expect(isAuthCookieMode()).toBe(false);
    });

    it('reste en Bearer dans l’app de bureau, quels que soient les réglages', async () => {
        platform.tauri = true;
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_AUTH_COOKIE_MODE', 'true');
        vi.stubEnv('VITE_AUTH_SAME_SITE_API', 'true');
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
