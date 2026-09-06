import { beforeEach, describe, expect, it } from 'vitest';
import {
    ACCESS_KEY,
    EXPIRES_AT_KEY,
    REFRESH_KEY,
    clearStoredTokens,
    readAccessToken,
    readExpiresAt,
    readRefreshToken,
    writeTokens
} from '@/features/auth/session-storage';

describe('session-storage (Bearer)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('écrit access et refresh en sessionStorage, jamais en localStorage', () => {
        writeTokens('access-1', 'refresh-1', '2026-09-06T20:00:00.000Z');

        expect(sessionStorage.getItem(ACCESS_KEY)).toBe('access-1');
        expect(sessionStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
        expect(sessionStorage.getItem(EXPIRES_AT_KEY)).toBe('2026-09-06T20:00:00.000Z');
        expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
        expect(readAccessToken()).toBe('access-1');
        expect(readRefreshToken()).toBe('refresh-1');
        expect(readExpiresAt()).toBe('2026-09-06T20:00:00.000Z');
    });

    it('migre un refresh legacy localStorage vers sessionStorage', () => {
        localStorage.setItem(REFRESH_KEY, 'legacy-refresh');

        expect(readRefreshToken()).toBe('legacy-refresh');
        expect(sessionStorage.getItem(REFRESH_KEY)).toBe('legacy-refresh');
        expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    });

    it('clearStoredTokens purge sessionStorage et localStorage', () => {
        writeTokens('a', 'r', 'soon');
        localStorage.setItem(REFRESH_KEY, 'stale');
        clearStoredTokens();

        expect(sessionStorage.getItem(ACCESS_KEY)).toBeNull();
        expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull();
        expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    });
});
