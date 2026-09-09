import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureAccessToken, refreshSession, forceReLogin, clearSession, axiosRequest } = vi.hoisted(() => ({
    ensureAccessToken: vi.fn(),
    refreshSession: vi.fn(),
    forceReLogin: vi.fn(),
    clearSession: vi.fn(),
    axiosRequest: vi.fn()
}));

vi.mock('@/features/auth', () => ({
    useAuthStore: () => ({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isAuthenticated: true,
        ensureAccessToken,
        refreshSession,
        forceReLogin,
        clearSession
    })
}));

vi.mock('@/utils/helpers/axios-helpers', () => ({
    getApiBaseUrl: () => 'http://api.test',
    createApiAxios: () => ({ request: axiosRequest }),
    isAuthCookieMode: () => false
}));

import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

describe('fetchWrapper', () => {
    beforeEach(() => {
        ensureAccessToken.mockReset().mockResolvedValue('access-token');
        refreshSession.mockReset();
        forceReLogin.mockReset().mockResolvedValue(undefined);
        clearSession.mockReset();
        axiosRequest.mockReset();
    });

    it('force le re-login après 401 si le refresh échoue', async () => {
        axiosRequest.mockResolvedValue({
            status: 401,
            data: { message: 'Unauthorized' },
            statusText: 'Unauthorized'
        });
        refreshSession.mockResolvedValue(false);

        await expect(fetchWrapper.get('/api/countries')).rejects.toMatchObject({ name: 'AppError', status: 401 });
        expect(refreshSession).toHaveBeenCalled();
        expect(forceReLogin).toHaveBeenCalledWith('Unauthorized');
    });

    it('retente une fois après refresh réussi', async () => {
        axiosRequest
            .mockResolvedValueOnce({
                status: 401,
                data: { message: 'Unauthorized' },
                statusText: 'Unauthorized'
            })
            .mockResolvedValueOnce({
                status: 200,
                data: { success: true, message: null, result: { items: [] } },
                statusText: 'OK'
            });
        refreshSession.mockResolvedValue(true);

        const result = await fetchWrapper.get('/api/countries');
        expect(result).toEqual({ items: [] });
        expect(axiosRequest).toHaveBeenCalledTimes(2);
        expect(forceReLogin).not.toHaveBeenCalled();
    });

    it('attache Authorization Bearer et n’envoie pas de CSRF', async () => {
        axiosRequest.mockResolvedValue({
            status: 200,
            data: { success: true, message: null, result: { ok: true } },
            statusText: 'OK'
        });

        await fetchWrapper.get('/api/countries');

        expect(axiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { Authorization: 'Bearer access-token' }
            })
        );
    });

    it('force le re-login si le retry après refresh renvoie encore 401', async () => {
        axiosRequest.mockResolvedValue({
            status: 401,
            data: { message: 'Unauthorized' },
            statusText: 'Unauthorized'
        });
        refreshSession.mockResolvedValue(true);

        await expect(fetchWrapper.get('/api/countries')).rejects.toMatchObject({ name: 'AppError', status: 401 });
        expect(axiosRequest).toHaveBeenCalledTimes(2);
        expect(forceReLogin).toHaveBeenCalledWith('Unauthorized');
    });

    it('passe le message idle au re-login si le refresh échoue', async () => {
        axiosRequest.mockResolvedValue({
            status: 401,
            data: { message: 'Session expirée pour inactivité.' },
            statusText: 'Unauthorized'
        });
        refreshSession.mockResolvedValue(false);

        await expect(fetchWrapper.get('/api/countries')).rejects.toMatchObject({ status: 401 });
        expect(forceReLogin).toHaveBeenCalledWith('Session expirée pour inactivité.');
    });

    it('préserve code et details sur les erreurs 4xx', async () => {
        axiosRequest.mockResolvedValue({
            status: 403,
            data: {
                success: false,
                message: 'Step-up required',
                code: 'STEP_UP_REQUIRED',
                details: { requiresPassword: true, requiresOtp: false, requiresGoogleIdToken: false }
            },
            statusText: 'Forbidden'
        });

        await expect(fetchWrapper.post('/api/settings', {})).rejects.toMatchObject({
            name: 'AppError',
            status: 403,
            code: 'STEP_UP_REQUIRED',
            details: expect.objectContaining({ requiresPassword: true })
        });
    });

    it('renvoie un blob et parse une erreur JSON encapsulée dans un blob', async () => {
        const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        axiosRequest.mockResolvedValue({
            status: 200,
            data: pdf,
            statusText: 'OK'
        });

        await expect(fetchWrapper.getBlob('/api/files/abc/content')).resolves.toBe(pdf);
        expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'blob' }));

        axiosRequest.mockResolvedValue({
            status: 404,
            data: new Blob([JSON.stringify({ success: false, message: 'Introuvable.' })], { type: 'application/json' }),
            statusText: 'Not Found'
        });

        await expect(fetchWrapper.getBlob('/api/files/missing/content')).rejects.toMatchObject({
            name: 'AppError',
            status: 404,
            message: 'Introuvable.'
        });
    });

    it('envoie un FormData sans forcer Content-Type JSON', async () => {
        axiosRequest.mockResolvedValue({
            status: 200,
            data: { success: true, message: null, result: { publicId: 'file-1' } },
            statusText: 'OK'
        });
        const form = new FormData();
        form.append('file', new Blob(['%PDF'], { type: 'application/pdf' }), 'a.pdf');

        const result = await fetchWrapper.postForm('/api/files', form);
        expect(result).toEqual({ publicId: 'file-1' });
        expect(axiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'POST',
                data: form,
                transformRequest: expect.any(Array)
            })
        );
    });

    it('traite un 204 comme succès sans enveloppe', async () => {
        axiosRequest.mockResolvedValue({
            status: 204,
            data: '',
            statusText: 'No Content'
        });

        await expect(fetchWrapper.delete('/api/files/abc')).resolves.toBeUndefined();
    });
});
