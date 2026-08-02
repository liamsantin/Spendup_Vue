import type { Plugin } from 'vite';

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
