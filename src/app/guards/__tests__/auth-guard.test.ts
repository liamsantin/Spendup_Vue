import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import type { RouteLocationNormalized } from 'vue-router';

vi.mock('@/utils/helpers/env-helpers', () => ({
    isDevAppEnv: () => false
}));

vi.mock('@/utils/helpers/axios-helpers', async () => {
    const actual = await vi.importActual<typeof import('@/utils/helpers/axios-helpers')>('@/utils/helpers/axios-helpers');
    return {
        ...actual,
        isAuthCookieMode: () => false
    };
});

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        onAuthenticatedSession: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn()
    })
}));

vi.mock('@/features/friends', () => ({
    useFriendsStore: () => ({
        onAuthenticatedSession: vi.fn()
    })
}));

vi.mock('@/features/accounts', () => ({
    useAccountsStore: () => ({
        onAuthenticatedSession: vi.fn()
    })
}));

vi.mock('@/features/user-settings', () => ({
    useUserSettingsStore: () => ({
        ensureLoaded: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn()
    })
}));

import { authGuard } from '@/app/guards/auth-guard';
import { useAuthStore } from '@/features/auth/stores/auth-store';

function route(path: string, requiresAuth = true): RouteLocationNormalized {
    return {
        path,
        fullPath: path,
        name: undefined,
        hash: '',
        query: {},
        params: {},
        matched: requiresAuth
            ? [{ meta: { requiresAuth: true }, path, name: undefined, components: {}, children: [], props: {}, redirect: undefined }]
            : [],
        meta: requiresAuth ? { requiresAuth: true } : {},
        redirectedFrom: undefined
    } as unknown as RouteLocationNormalized;
}

describe('authGuard', () => {
    beforeEach(() => {
        createTestPinia();
    });

    it('redirige vers login si non authentifié', async () => {
        const auth = useAuthStore();
        const next = vi.fn();
        await authGuard(route('/app/comptes'), route('/'), next);
        expect(next).toHaveBeenCalledWith('/auth/login');
        expect(auth.returnUrl).toBe('/app/comptes');
    });

    it('redirige vers login si fetchMe renvoie null', async () => {
        const auth = useAuthStore();
        auth.refreshToken = 'refresh-1';
        auth.bootstrapSession = vi.fn().mockResolvedValue(undefined);
        auth.fetchMe = vi.fn().mockResolvedValue(null);
        auth.forceReLogin = vi.fn().mockResolvedValue(undefined);

        const next = vi.fn();
        await authGuard(route('/app/settings'), route('/'), next);

        expect(auth.fetchMe).toHaveBeenCalled();
        expect(auth.forceReLogin).toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith('/auth/login');
    });

    it('laisse passer si user déjà chargé', async () => {
        const auth = useAuthStore();
        auth.refreshToken = 'refresh-1';
        auth.bootstrapSession = vi.fn().mockResolvedValue(undefined);
        auth.user = {
            userPublicId: 'ABC1234',
            email: 'a@b.c',
            username: 'alice',
            firstName: null,
            name: null,
            emailVerified: true,
            twoFactorEnabled: false,
            pendingEmail: null,
            phone: null,
            birthDate: null,
            street: null,
            streetNumber: null,
            countryId: null,
            profilePicture: null
        };
        auth.fetchMe = vi.fn();

        const next = vi.fn();
        await authGuard(route('/app'), route('/'), next);

        expect(auth.fetchMe).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith();
    });
});
