import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { clearPasswordResetTokenFromUrl, readPasswordResetToken } from './password-reset-token';

function fakeRoute(partial: Partial<RouteLocationNormalizedLoaded>): RouteLocationNormalizedLoaded {
    return {
        path: '/auth/reset-password',
        fullPath: '/auth/reset-password',
        hash: '',
        query: {},
        params: {},
        name: undefined,
        matched: [],
        meta: {},
        redirectedFrom: undefined,
        ...partial
    } as RouteLocationNormalizedLoaded;
}

describe('readPasswordResetToken', () => {
    afterEach(() => {
        window.history.replaceState(null, '', '/auth/reset-password');
    });

    it('priorise #token= sur ?token=', () => {
        expect(
            readPasswordResetToken(
                fakeRoute({
                    query: { token: 'from-query' },
                    hash: '#token=from-hash'
                })
            )
        ).toBe('from-hash');
    });

    it('lit #token= URL-encodé', () => {
        expect(readPasswordResetToken(fakeRoute({ hash: `#token=${encodeURIComponent('a/b+c=')}` }))).toBe('a/b+c=');
    });

    it('lit ?token= legacy', () => {
        expect(readPasswordResetToken(fakeRoute({ query: { token: 'abc' } }))).toBe('abc');
    });

    it('lit le hash window si la route est vide', () => {
        window.history.replaceState(null, '', '/auth/reset-password#token=win-token');
        expect(readPasswordResetToken(fakeRoute({ hash: '' }))).toBe('win-token');
    });

    it('retourne null sans jeton', () => {
        expect(readPasswordResetToken(fakeRoute({}))).toBeNull();
    });
});

describe('clearPasswordResetTokenFromUrl', () => {
    it('replace la route sans query ni hash', () => {
        const replace = vi.fn();
        const router = { replace } as unknown as Router;
        clearPasswordResetTokenFromUrl(router, fakeRoute({ query: { token: 'x' }, hash: '#token=y' }));
        expect(replace).toHaveBeenCalledWith({ path: '/auth/reset-password', query: {}, hash: '' });
    });
});
