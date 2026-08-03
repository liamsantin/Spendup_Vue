import { describe, expect, it } from 'vitest';
import { sanitizeReturnUrl } from '../safe-return-url';

describe('sanitizeReturnUrl', () => {
    it('accepte les chemins /app', () => {
        expect(sanitizeReturnUrl('/app')).toBe('/app');
        expect(sanitizeReturnUrl('/app/comptes')).toBe('/app/comptes');
        expect(sanitizeReturnUrl('/app/comptes?tab=1')).toBe('/app/comptes?tab=1');
    });

    it('rejette les redirections externes ou hors /app', () => {
        expect(sanitizeReturnUrl('https://evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('//evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('/\\evil.com')).toBe('/app');
        expect(sanitizeReturnUrl('/auth/login')).toBe('/app');
        expect(sanitizeReturnUrl(null)).toBe('/app');
        expect(sanitizeReturnUrl('')).toBe('/app');
    });
});
