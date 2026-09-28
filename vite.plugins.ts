import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * L’installeur Windows vit dans `public/downloads/` pour être servi par le site.
 * Or `dist/` sert aussi de `frontendDist` à Tauri : sans ça, chaque build embarquerait
 * l’installeur précédent dans l’app (poids cumulatif à chaque release).
 */
export function excludeDesktopInstaller(): Plugin {
    return {
        name: 'spendup-exclude-desktop-installer',
        apply: 'build',
        async closeBundle() {
            if (!process.env.TAURI_ENV_PLATFORM) return;
            await rm(resolve(process.cwd(), 'dist/downloads'), { recursive: true, force: true });
        }
    };
}

/**
 * `public/_headers` (Netlify) est copié tel quel dans `dist/` : sa CSP figée n’autorise
 * que localhost en `connect-src`. Un header CSP s’applique en plus de la meta CSP (le
 * navigateur impose les deux), donc on y réécrit la politique calculée pour le build —
 * sinon l’API de prod (`VITE_API_BASE_URL`) et SignalR seraient bloqués.
 */
export function netlifyHeadersCsp(csp: string): Plugin {
    return {
        name: 'spendup-netlify-headers-csp',
        apply: 'build',
        async closeBundle() {
            const file = resolve(process.cwd(), 'dist/_headers');
            let content: string;
            try {
                content = await readFile(file, 'utf8');
            } catch {
                return;
            }
            const next = content.replace(/^(\s*Content-Security-Policy:).*$/m, `$1 ${csp}`);
            if (next !== content) await writeFile(file, next, 'utf8');
        }
    };
}

/**
 * Réécrit les imports nommés `vue-tabler-icons` vers les fichiers individuels
 * (`icons/FooIcon.js`) pour permettre le tree-shaking. Le barrel ES (~6 Mo)
 * n’est jamais chargé en prod.
 */
export function vueTablerIconsTreeshake(): Plugin {
    const namedImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]vue-tabler-icons['"]\s*;?/g;

    return {
        name: 'vue-tabler-icons-treeshake',
        enforce: 'pre',
        transform(code, id) {
            if (id.includes('node_modules')) return null;
            if (!/\.(vue|ts|tsx|js|jsx)$/.test(id)) return null;
            if (!code.includes('vue-tabler-icons')) return null;

            let changed = false;
            const next = code.replace(namedImportRe, (full, body: string) => {
                // Laisser les imports type-only sur le barrel (effacés à la compile).
                if (/^\s*type\s/.test(body.trim()) && !body.includes(',')) {
                    return full;
                }

                const specs = body
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);

                const lines: string[] = [];
                for (const spec of specs) {
                    if (spec.startsWith('type ')) {
                        const name = spec.slice(5).trim();
                        lines.push(`import type { ${name} } from 'vue-tabler-icons';`);
                        continue;
                    }
                    const asMatch = spec.match(/^(\w+)\s+as\s+(\w+)$/);
                    if (asMatch) {
                        const [, exported, local] = asMatch;
                        lines.push(`import ${local} from 'vue-tabler-icons/icons/${exported}.js';`);
                        changed = true;
                        continue;
                    }
                    lines.push(`import ${spec} from 'vue-tabler-icons/icons/${spec}.js';`);
                    changed = true;
                }
                return lines.join('\n');
            });

            return changed ? { code: next, map: null } : null;
        }
    };
}
