import { describe, expect, it } from 'vitest';
import { CSP_DEV_REPORT_ONLY, CSP_PROD_ENFORCE, SECURITY_HEADERS_BASE } from './csp';

describe('csp', () => {
    it('prod enforce sans unsafe-eval ni ws HMR, connect-src resserré', () => {
        expect(CSP_PROD_ENFORCE).toContain("default-src 'self'");
        expect(CSP_PROD_ENFORCE).toContain('https://accounts.google.com');
        expect(CSP_PROD_ENFORCE).toContain('http://localhost:*');
        expect(CSP_PROD_ENFORCE).not.toContain('unsafe-eval');
        expect(CSP_PROD_ENFORCE).not.toMatch(/connect-src[^;]*\bhttp:(?!\/\/localhost|\/\/127\.0\.0\.1)/);
        expect(CSP_PROD_ENFORCE).not.toMatch(/(?:^|;\s)ws:/);
    });

    it('dev report-only autorise HMR', () => {
        expect(CSP_DEV_REPORT_ONLY).toContain('unsafe-eval');
        expect(CSP_DEV_REPORT_ONLY).toContain('ws:');
    });

    it('expose les headers de base', () => {
        expect(SECURITY_HEADERS_BASE['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(SECURITY_HEADERS_BASE['X-Content-Type-Options']).toBe('nosniff');
    });
});
