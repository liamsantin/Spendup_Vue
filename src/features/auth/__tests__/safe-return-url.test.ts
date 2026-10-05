import { describe, expect, it } from 'vitest';
import { isSafeAppPath, sanitizeReturnUrl } from '@/features/auth/safe-return-url';

describe('isSafeAppPath', () => {
    it('accepte les chemins /app stricts', () => {
        expect(isSafeAppPath('/app')).toBe(true);
        expect(isSafeAppPath('/app?tab=1')).toBe(true);
        expect(isSafeAppPath('/app#section')).toBe(true);
        expect(isSafeAppPath('/app/comptes')).toBe(true);
        expect(isSafeAppPath('/app/comptes?tab=1')).toBe(true);
    });

    it('rejette préfixe ambigu, traversal et externes', () => {
        expect(isSafeAppPath('/application')).toBe(false);
        expect(isSafeAppPath('/app.evil.com/x')).toBe(false);
        expect(isSafeAppPath('/app/../etc')).toBe(false);
        expect(isSafeAppPath('//evil.com')).toBe(false);
        expect(isSafeAppPath('/\\evil.com')).toBe(false);
        expect(isSafeAppPath('https://evil.com')).toBe(false);
        expect(isSafeAppPath('/auth/login')).toBe(false);
        expect(isSafeAppPath(null)).toBe(false);
        expect(isSafeAppPath('')).toBe(false);
    });
});

describe('sanitizeReturnUrl', () => {
    it('accepte les chemins /app', () => {
        expect(sanitizeReturnUrl('/app')).toBe('/app');
        expect(sanitizeReturnUrl('/app?tab=1')).toBe('/app?tab=1');
        expect(sanitizeReturnUrl('/app#section')).toBe('/app#section');
        expect(sanitizeReturnUrl('/app/comptes')).toBe('/app/comptes');
        expect(sanitizeReturnUrl('/app/comptes?tab=1')).toBe('/app/comptes?tab=1');
    });

    it('rejette les redirections externes ou hors /app', () => {
        expect(sanitizeReturnUrl('https://evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('//evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('/\\evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('/auth/login')).toBe('/app');
        expect(sanitizeReturnUrl('/application')).toBe('/app');
        expect(sanitizeReturnUrl('/app/../etc')).toBe('/app');
        expect(sanitizeReturnUrl('/app.evil.com/x')).toBe('/app');
        expect(sanitizeReturnUrl(null)).toBe('/app');
        expect(sanitizeReturnUrl('')).toBe('/app');
    });
});
