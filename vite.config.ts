/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { CSP_DEV_REPORT_ONLY, CSP_PROD_ENFORCE, SECURITY_HEADERS_BASE } from './src/security/csp';
import { vueTablerIconsTreeshake } from './vite.plugins';

/** Injecte une CSP enforce en meta sur le HTML de build (filet si le CDN omet le header). */
function htmlCspMetaPlugin(): Plugin {
    return {
        name: 'spendup-html-csp-meta',
        transformIndexHtml: {
            order: 'pre',
            handler(html, ctx) {
                if (ctx.server) return html;
                const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP_PROD_ENFORCE}" />`;
                return html.replace(/<head>/i, `<head>\n        ${meta}`);
            }
        }
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), vueTablerIconsTreeshake(), vuetify({ autoImport: true }), htmlCspMetaPlugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        headers: {
            ...SECURITY_HEADERS_BASE,
            'Content-Security-Policy-Report-Only': CSP_DEV_REPORT_ONLY
        }
    },
    preview: {
        headers: {
            ...SECURITY_HEADERS_BASE,
            'Content-Security-Policy': CSP_PROD_ENFORCE
        }
    },
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.ts'],
        clearMocks: true,
        restoreMocks: true,
        css: true,
        server: {
            deps: {
                inline: ['vuetify']
            }
        }
    }
});
