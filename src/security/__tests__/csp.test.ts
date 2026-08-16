import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CSP_DEV_REPORT_ONLY, CSP_PROD_ENFORCE, SECURITY_HEADERS_BASE } from '../csp';

const tauriConf = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../src-tauri/tauri.conf.json'), 'utf8')) as {
    app: {
        security: {
            csp: Record<string, string> | null;
            devCsp?: Record<string, string>;
        };
    };
};

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
        expect(SECURITY_HEADERS_BASE['Permissions-Policy']).toContain('camera=(self)');
        expect(SECURITY_HEADERS_BASE['Permissions-Policy']).toContain('microphone=()');
    });
});

describe('tauri.conf.json CSP', () => {
    it('prod csp alignée sur CSP_PROD_ENFORCE + IPC Tauri', () => {
        const csp = tauriConf.app.security.csp;
        expect(csp).not.toBeNull();
        if (!csp) throw new Error('expected csp');
        expect(csp['script-src']).toContain("'self'");
        expect(csp['script-src']).not.toContain('unsafe-eval');
        expect(csp['connect-src']).toContain('ipc:');
        expect(csp['connect-src']).toContain('http://ipc.localhost');
        expect(csp['connect-src']).toContain('https://accounts.google.com');
        expect(csp['connect-src']).toContain('wss:');
        expect(csp['connect-src']).not.toMatch(/(?:^|\s)ws:(?!\w)/);
        expect(csp['img-src']).toContain('asset:');
        expect(csp['img-src']).toContain('http://asset.localhost');
        expect(csp['object-src']).toBe("'none'");
    });

    it('devCsp autorise HMR tout en gardant IPC', () => {
        const devCsp = tauriConf.app.security.devCsp;
        expect(devCsp).toBeDefined();
        if (!devCsp) throw new Error('expected devCsp');
        expect(devCsp['script-src']).toContain('unsafe-eval');
        expect(devCsp['connect-src']).toContain('ws:');
        expect(devCsp['connect-src']).toContain('ipc:');
        expect(devCsp['connect-src']).toContain('http://ipc.localhost');
    });
});
