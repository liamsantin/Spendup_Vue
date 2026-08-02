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
    createApiAxios: () => ({ request: axiosRequest })
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
        expect(forceReLogin).toHaveBeenCalled();
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

    it('force le re-login si le retry après refresh renvoie encore 401', async () => {
        axiosRequest.mockResolvedValue({
            status: 401,
            data: { message: 'Unauthorized' },
            statusText: 'Unauthorized'
        });
        refreshSession.mockResolvedValue(true);

        await expect(fetchWrapper.get('/api/countries')).rejects.toMatchObject({ name: 'AppError', status: 401 });
        expect(axiosRequest).toHaveBeenCalledTimes(2);
        expect(forceReLogin).toHaveBeenCalled();
    });
});
