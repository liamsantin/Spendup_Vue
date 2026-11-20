import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
    useAuthStore: () => ({
        accessToken: 'demo',
        refreshToken: null,
        ensureAccessToken: vi.fn(async () => 'demo'),
        refreshSession: vi.fn(async () => false),
        forceReLogin: vi.fn(async () => undefined)
    })
}));

import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authAxios, createApiAxios, DemoNetworkBlockedError } from '@/utils/helpers/axios-helpers';
import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import { clearDemoSession, markDemoSession } from '@/features/demo/session';
import { resetDemoDb } from '@/features/demo/db';
import { resolveFriendAvatarSrc } from '@/features/friends/profilePicture';
import { DEFAULT_AVATAR_SRC } from '@/features/auth/profilePicture';

/** Verrou réseau de la démo (roadmap « import dans la démo », chantier D1). */
describe('verrou réseau de la démo', () => {
    const adapter = vi.fn(
        async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
            data: null,
            status: 200,
            statusText: 'OK',
            headers: {},
            config
        })
    );
    const xhrSend = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => undefined);
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => undefined);
    const fetchSpy = vi.fn(async () => new Response(null));

    beforeEach(() => {
        adapter.mockClear();
        xhrSend.mockClear();
        xhrOpen.mockClear();
        fetchSpy.mockClear();
        vi.stubGlobal('fetch', fetchSpy);
        resetDemoDb();
        markDemoSession();
    });

    afterEach(() => {
        clearDemoSession();
        vi.unstubAllGlobals();
    });

    function expectSilentNetwork() {
        expect(adapter).not.toHaveBeenCalled();
        expect(xhrOpen).not.toHaveBeenCalled();
        expect(xhrSend).not.toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
    }

    it('refuse toute requête d’un client HTTP pendant la démo', async () => {
        const client = createApiAxios();
        await expect(client.request({ url: '/api/accounts', method: 'GET', adapter })).rejects.toBeInstanceOf(DemoNetworkBlockedError);
        await expect(client.post('/api/transactions', { amount: 1 }, { adapter })).rejects.toBeInstanceOf(DemoNetworkBlockedError);
        expectSilentNetwork();
    });

    it('refuse aussi le client d’authentification, envoi de fichier compris', async () => {
        const form = new FormData();
        form.append('file', new File(['secret;1'], 'releve.csv', { type: 'text/csv' }));

        await expect(authAxios.request({ url: '/api/auth/me', method: 'GET', adapter })).rejects.toBeInstanceOf(DemoNetworkBlockedError);
        await expect(authAxios.request({ url: '/api/auth/logout', method: 'POST', adapter })).rejects.toBeInstanceOf(
            DemoNetworkBlockedError
        );
        await expect(authAxios.request({ url: '/api/auth/me/avatar', method: 'POST', data: form, adapter })).rejects.toBeInstanceOf(
            DemoNetworkBlockedError
        );
        expectSilentNetwork();
    });

    it('laisse passer les requêtes hors démo', async () => {
        clearDemoSession();
        await createApiAxios().request({ url: '/api/accounts', method: 'GET', adapter });
        expect(adapter).toHaveBeenCalledTimes(1);
    });

    it('sert les écrans de la démo depuis la mémoire, sans aucune requête', async () => {
        const accounts = (await fetchWrapper.get('/api/accounts')) as { items: unknown[] };
        expect(accounts.items.length).toBeGreaterThan(0);

        await fetchWrapper.get('/api/transactions?page=1&pageSize=50');
        await fetchWrapper.get('/api/categories');
        await fetchWrapper.get('/api/budgets?page=1&pageSize=50');
        await fetchWrapper.get('/api/tax-returns');
        await fetchWrapper.get('/api/friends?page=1&pageSize=50');
        await fetchWrapper.post('/api/transactions', {
            type: 'depense',
            accountPublicId: 'ACCCOUR',
            amount: 12.5,
            label: 'Test verrou',
            date: '2026-11-20'
        });

        expectSilentNetwork();
    });

    it('refuse un fichier envoyé vers une route que la démo ne reproduit pas', async () => {
        const form = new FormData();
        form.append('file', new File(['date;montant\n2026-11-20;-12.50'], 'releve.csv', { type: 'text/csv' }));
        form.append('accountPublicId', 'ACCCOUR');

        await expect(fetchWrapper.postForm('/api/imports', form)).rejects.toMatchObject({ name: 'AppError' });
        await expect(fetchWrapper.putForm('/api/imports/IMP1/content', form)).rejects.toMatchObject({ name: 'AppError' });
        expectSilentNetwork();
    });

    it('n’affiche en démo que des images embarquées dans l’application', () => {
        expect(resolveFriendAvatarSrc('/api/users/U1/photo')).toBe(DEFAULT_AVATAR_SRC);
        expect(resolveFriendAvatarSrc('https://exemple.test/a.png?d=donnee')).toBe(DEFAULT_AVATAR_SRC);
        expect(resolveFriendAvatarSrc('a'.repeat(64))).toBe(DEFAULT_AVATAR_SRC);
        expect(resolveFriendAvatarSrc('/avatar/user-3')).not.toBe(DEFAULT_AVATAR_SRC);
        expect(resolveFriendAvatarSrc('blob:http://localhost/1')).toBe('blob:http://localhost/1');
    });
});
