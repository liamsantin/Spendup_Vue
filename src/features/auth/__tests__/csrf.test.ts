import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    clearCsrfToken,
    csrfHeaderRecord,
    getCsrfToken,
    readCsrfCookie,
    rememberCsrfToken
} from '../csrf';

describe('csrf', () => {
    beforeEach(() => {
        clearCsrfToken();
        document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
    });

    afterEach(() => {
        clearCsrfToken();
        document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
    });

    it('lit le cookie et construit le header', () => {
        document.cookie = `${CSRF_COOKIE_NAME}=abc123; Path=/`;
        expect(readCsrfCookie()).toBe('abc123');
        expect(getCsrfToken()).toBe('abc123');
        expect(csrfHeaderRecord()).toEqual({ [CSRF_HEADER_NAME]: 'abc123' });
    });

    it('priorise la mémoire (csrfToken body) sur le cookie', () => {
        document.cookie = `${CSRF_COOKIE_NAME}=from-cookie; Path=/`;
        rememberCsrfToken('from-body');
        expect(getCsrfToken()).toBe('from-body');
    });

    it('retourne {} sans jeton', () => {
        expect(csrfHeaderRecord()).toEqual({});
    });
});
