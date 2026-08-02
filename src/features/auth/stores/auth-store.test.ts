import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { ApiError } from '@/features/auth/api';
import type { AuthTokens, Me } from '@/features/auth/types';

const routerPush = vi.fn();
const routerReplace = vi.fn();

vi.mock('@/router', () => ({
    router: {
        push: (...args: unknown[]) => routerPush(...args),
        replace: (...args: unknown[]) => routerReplace(...args)
    }
}));

const authApiMock = vi.hoisted(() => ({
    refresh: vi.fn(),
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    confirmEmail: vi.fn(),
    google: vi.fn(),
    verify2fa: vi.fn(),
    setup2fa: vi.fn(),
    enable2fa: vi.fn(),
    disable2fa: vi.fn(),
    listDevices: vi.fn(),
    revokeDevice: vi.fn(),
    setDeviceTrust: vi.fn(),
    revokeAllDevices: vi.fn(),
    updateProfile: vi.fn(),
    setCatalogAvatar: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
    getAvatarBlob: vi.fn(),
    setUsername: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendVerification: vi.fn(),
    unlinkGoogle: vi.fn()
}));

vi.mock('@/features/auth/api', async () => {
    const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api');
    return {
        ...actual,
        authApi: authApiMock
    };
});

const cookieMode = vi.hoisted(() => ({ enabled: false }));

vi.mock('@/utils/helpers/axios-helpers', async () => {
    const actual = await vi.importActual<typeof import('@/utils/helpers/axios-helpers')>('@/utils/helpers/axios-helpers');
    return {
        ...actual,
        isAuthCookieMode: () => cookieMode.enabled
    };
});

import { useAuthStore } from '@/features/auth/stores/auth-store';
import { REFRESH_KEY } from '@/features/auth/session-storage';

function tokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
    return {
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        userPublicId: 'ABC1234',
        ...overrides
    };
}

function meUser(overrides: Partial<Me> = {}): Me {
    return {
        userPublicId: 'ABC1234',
        email: 'a@b.c',
        username: 'alice',
        firstName: 'Alice',
        name: 'Doe',
        emailVerified: true,
        twoFactorEnabled: false,
        pendingEmail: null,
        phone: null,
        birthDate: null,
        street: null,
        streetNumber: null,
        countryId: null,
        profilePicture: null,
        hasPassword: true,
        hasGoogle: false,
        ...overrides
    };
}

describe('useAuthStore', () => {
    beforeEach(() => {
        cookieMode.enabled = false;
        localStorage.clear();
        sessionStorage.clear();
        createTestPinia();
        routerPush.mockReset();
        routerReplace.mockReset();
        Object.values(authApiMock).forEach((fn) => fn.mockReset());
    });

    it('ne stocke pas le mot de passe pending en sessionStorage', async () => {
        const auth = useAuthStore();
        authApiMock.register.mockResolvedValue({ email: 'new@spendup.test', username: null });

        await auth.register({
            email: 'new@spendup.test',
            username: null,
            password: 'Secret123',
            firstName: null,
            name: null
        });

        expect(auth.pendingPassword).toBe('Secret123');
        expect(sessionStorage.getItem('spendup_pending_password')).toBeNull();
        expect(sessionStorage.getItem('spendup_pending_email')).toBe('new@spendup.test');
    });

    it('ensureAccessToken rafraîchit si expiresAt est passé', async () => {
        const auth = useAuthStore();
        auth.setTokens(
            tokens({
                accessToken: 'old-access',
                expiresAt: new Date(Date.now() - 5_000).toISOString()
            })
        );
        authApiMock.refresh.mockResolvedValue(
            tokens({
                accessToken: 'new-access',
                refreshToken: 'refresh-1',
                expiresAt: new Date(Date.now() + 60_000).toISOString()
            })
        );

        const token = await auth.ensureAccessToken();

        expect(authApiMock.refresh).toHaveBeenCalledTimes(1);
        expect(token).toBe('new-access');
        expect(auth.accessToken).toBe('new-access');
    });

    it('ensureAccessToken réutilise l’access token encore valide', async () => {
        const auth = useAuthStore();
        auth.setTokens(tokens({ accessToken: 'still-good' }));

        const token = await auth.ensureAccessToken();

        expect(authApiMock.refresh).not.toHaveBeenCalled();
        expect(token).toBe('still-good');
    });

    it('refreshSession partage un seul appel concurrent (mutex)', async () => {
        const auth = useAuthStore();
        auth.setTokens(tokens());

        let resolveRefresh!: (value: AuthTokens) => void;
        authApiMock.refresh.mockImplementation(
            () =>
                new Promise<AuthTokens>((resolve) => {
                    resolveRefresh = resolve;
                })
        );

        const p1 = auth.refreshSession();
        const p2 = auth.refreshSession();

        expect(authApiMock.refresh).toHaveBeenCalledTimes(1);
        resolveRefresh(
            tokens({
                accessToken: 'after-refresh',
                expiresAt: new Date(Date.now() + 60_000).toISOString()
            })
        );

        await expect(Promise.all([p1, p2])).resolves.toEqual([true, true]);
        expect(auth.accessToken).toBe('after-refresh');
    });

    it('fetchMe retente après 401 via refresh', async () => {
        const auth = useAuthStore();
        auth.setTokens(tokens({ accessToken: 'expired-but-skew-ok' }));

        authApiMock.me.mockRejectedValueOnce(new ApiError('Unauthorized', 401)).mockResolvedValueOnce(meUser({ username: 'alice' }));
        authApiMock.refresh.mockResolvedValue(
            tokens({
                accessToken: 'fresh-access',
                expiresAt: new Date(Date.now() + 60_000).toISOString()
            })
        );

        const me = await auth.fetchMe();

        expect(authApiMock.refresh).toHaveBeenCalledTimes(1);
        expect(authApiMock.me).toHaveBeenCalledTimes(2);
        expect(me?.username).toBe('alice');
        expect(auth.accessToken).toBe('fresh-access');
    });

    it('fetchMe renvoie null sans token utilisable', async () => {
        const auth = useAuthStore();
        const me = await auth.fetchMe();
        expect(me).toBeNull();
        expect(authApiMock.me).not.toHaveBeenCalled();
    });

    describe('mode cookie HttpOnly', () => {
        beforeEach(() => {
            cookieMode.enabled = true;
            createTestPinia();
        });

        it('n’écrit ni refresh ni access en storage JS', async () => {
            const auth = useAuthStore();
            localStorage.setItem(REFRESH_KEY, 'legacy-refresh');
            auth.setTokens(tokens({ refreshToken: 'should-not-persist' }));

            expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
            expect(auth.refreshToken).toBeNull();
            expect(auth.accessToken).toBe('access-1');
            expect(sessionStorage.getItem('spendup_access_token')).toBeNull();
        });

        it('applySession accepte une session sans refreshToken body', async () => {
            const auth = useAuthStore();
            authApiMock.me.mockResolvedValue(meUser());

            const outcome = await auth.applySession({
                requiresTwoFactor: false,
                twoFactorToken: null,
                accessToken: 'access-cookie',
                refreshToken: null,
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                userPublicId: 'ABC1234'
            });

            expect(outcome).toBe('ok');
            expect(auth.accessToken).toBe('access-cookie');
            expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
        });

        it('refreshSession appelle /refresh sans body token', async () => {
            const auth = useAuthStore();
            authApiMock.refresh.mockResolvedValue(
                tokens({
                    accessToken: 'from-cookie',
                    refreshToken: null,
                    expiresAt: new Date(Date.now() + 60_000).toISOString()
                })
            );

            const ok = await auth.refreshSession();

            expect(ok).toBe(true);
            expect(authApiMock.refresh).toHaveBeenCalledWith(null);
            expect(auth.accessToken).toBe('from-cookie');
        });
    });

    describe('devices & password (step-up)', () => {
        it('listDevices passe le access token', async () => {
            const auth = useAuthStore();
            auth.setTokens(tokens({ accessToken: 'tok-devices' }));
            authApiMock.listDevices.mockResolvedValue([{ deviceIdentifier: 'd1' }]);

            const list = await auth.listDevices();

            expect(authApiMock.listDevices).toHaveBeenCalledWith('tok-devices');
            expect(list).toEqual([{ deviceIdentifier: 'd1' }]);
        });

        it('revokeDevice propage la preuve step-up', async () => {
            const auth = useAuthStore();
            auth.setTokens(tokens());
            authApiMock.revokeDevice.mockResolvedValue(undefined);

            const stepUp = { password: 'Secret123' };
            await auth.revokeDevice('device-xyz', stepUp);

            expect(authApiMock.revokeDevice).toHaveBeenCalledWith('access-1', 'device-xyz', stepUp);
        });

        it('changePassword envoie step-up puis force re-login', async () => {
            const auth = useAuthStore();
            auth.setTokens(tokens());
            authApiMock.changePassword.mockResolvedValue(undefined);
            authApiMock.logout.mockResolvedValue(undefined);

            const stepUp = { otp: '123456' };
            await auth.changePassword('old-pass', 'NewPass12', undefined, stepUp);

            expect(authApiMock.changePassword).toHaveBeenCalledWith('access-1', 'old-pass', 'NewPass12', stepUp);
            expect(routerPush).toHaveBeenCalledWith('/auth/login');
            expect(auth.accessToken).toBeNull();
        });
    });
});
