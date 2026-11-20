import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sorties réseau du front (roadmap « import dans la démo », chantier D1).
 *
 * Le verrou de la démo est posé sur les clients créés par `createApiAxios`. Il ne vaut que si aucun
 * autre moyen d'émettre n'existe dans le code : ce test échoue dès qu'un fichier en ajoute un.
 * Pour un besoin légitime, passer par `createApiAxios` (ou `fetchWrapper`), ou ajouter le fichier à
 * la liste ci-dessous après avoir vérifié qu'il n'émet rien pendant une session démo.
 */
const SRC = join(process.cwd(), 'src');

const RULES: { name: string; pattern: RegExp; allowed: string[] }[] = [
    { name: 'axios.create', pattern: /\baxios\s*\.\s*create\s*\(/, allowed: ['utils/helpers/axios-helpers.ts'] },
    { name: 'appel direct à axios', pattern: /\baxios\s*(?:\.\s*(?:get|post|put|patch|delete|request|head|options)\s*)?\(/, allowed: [] },
    { name: 'fetch', pattern: /(?<![\w.$])fetch\s*\(/, allowed: [] },
    { name: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/, allowed: [] },
    { name: 'sendBeacon', pattern: /\bsendBeacon\b/, allowed: [] },
    { name: 'WebSocket', pattern: /\bnew\s+WebSocket\b/, allowed: [] },
    { name: 'EventSource', pattern: /\bEventSource\b/, allowed: [] },
    // SignalR : `startNotificationsHub` refuse de démarrer en démo (voir `hub-demo.test.ts`).
    { name: 'HubConnectionBuilder', pattern: /\bnew\s+HubConnectionBuilder\b/, allowed: ['features/notifications/hub.ts'] }
];

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'test' ? [] : sourceFiles(path);
        return /\.(ts|vue)$/.test(entry.name) && !/\.(test|spec|d)\.ts$/.test(entry.name) ? [path] : [];
    });
}

/** Retire les commentaires, pour ne pas confondre une phrase et un appel. */
function withoutComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('sorties réseau du front', () => {
    const files = sourceFiles(SRC).map((path) => ({
        name: relative(SRC, path).split(sep).join('/'),
        code: withoutComments(readFileSync(path, 'utf8'))
    }));

    it('lit bien les sources', () => {
        expect(files.length).toBeGreaterThan(300);
        expect(files.some((file) => file.name === 'utils/helpers/axios-helpers.ts')).toBe(true);
    });

    it.each(RULES)('$name : seulement dans les fichiers prévus', ({ pattern, allowed }) => {
        const found = files.filter((file) => pattern.test(file.code)).map((file) => file.name);
        expect(found.filter((name) => !allowed.includes(name))).toEqual([]);
        // Une exception devenue inutile se retire : la liste reste le reflet exact du code.
        expect(allowed.filter((name) => !found.includes(name))).toEqual([]);
    });
});
