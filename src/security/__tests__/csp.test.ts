import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    apiConnectSources,
    buildCspProdEnforce,
    buildProdConnectSrc,
    CSP_DEV_REPORT_ONLY,
    CSP_PROD_ENFORCE,
    SECURITY_HEADERS_BASE
} from '../csp';

const tauriConf = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../src-tauri/tauri.conf.json'), 'utf8')) as {
    app: {
        security: {
            csp: Record<string, string> | null;
            devCsp?: Record<string, string>;
        };
    };
};

describe('csp', () => {
    it('prod enforce sans unsafe-eval ni wildcards https:/wss:', () => {
        expect(CSP_PROD_ENFORCE).toContain("default-src 'self'");
        expect(CSP_PROD_ENFORCE).toContain('https://accounts.google.com');
        expect(CSP_PROD_ENFORCE).toContain('http://localhost:*');
        expect(CSP_PROD_ENFORCE).toContain('ws://localhost:*');
        expect(CSP_PROD_ENFORCE).not.toContain('unsafe-eval');
        // Pas de source « https: » / « wss: » nue (wildcard schéma).
        expect(CSP_PROD_ENFORCE).not.toMatch(/connect-src[^;]*?(?:^|[\s;])https:(?=[\s;]|$)/);
        expect(CSP_PROD_ENFORCE).not.toMatch(/connect-src[^;]*?(?:^|[\s;])wss:(?=[\s;]|$)/);
    });

    it('buildCspProdEnforce injecte l’origine API + wss', () => {
        const csp = buildCspProdEnforce('https://api.spendup.test');
        expect(csp).toContain('https://api.spendup.test');
        expect(csp).toContain('wss://api.spendup.test');
        expect(buildProdConnectSrc('http://localhost:5124')).toContain('http://localhost:5124');
        expect(apiConnectSources('not-a-url')).toEqual([]);
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
    it('prod csp alignée + IPC Tauri sans wildcard https:', () => {
        const csp = tauriConf.app.security.csp;
        expect(csp).not.toBeNull();
        if (!csp) throw new Error('expected csp');
        expect(csp['script-src']).toContain("'self'");
        expect(csp['script-src']).not.toContain('unsafe-eval');
        expect(csp['connect-src']).toContain('ipc:');
        expect(csp['connect-src']).toContain('http://ipc.localhost');
        expect(csp['connect-src']).toContain('https://accounts.google.com');
        expect(csp['connect-src']).toContain('https://api-spendup.ch');
        expect(csp['connect-src']).toContain('wss://api-spendup.ch');
        expect(csp['connect-src']).toContain('wss://localhost:*');
        expect(csp['connect-src']).not.toMatch(/(?:^|\s)https:(?=\s|$)/);
        expect(csp['connect-src']).not.toMatch(/(?:^|\s)wss:(?=\s|$)/);
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
