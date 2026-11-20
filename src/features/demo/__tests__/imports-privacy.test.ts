import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
    useAuthStore: () => ({
        accessToken: 'demo',
        refreshToken: null,
        ensureAccessToken: vi.fn(async () => 'demo'),
        refreshSession: vi.fn(async () => false),
        forceReLogin: vi.fn(async () => undefined)
    })
}));

/** Chaque appel « API » de la démo est noté : son adresse ne doit rien porter du fichier. */
const demoCalls = vi.hoisted(() => ({ urls: [] as string[] }));
vi.mock('@/features/demo/handle', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/demo/handle')>();
    return {
        ...actual,
        handleDemoRequest: (method: string, url: string, body?: unknown) => {
            demoCalls.urls.push(url);
            return actual.handleDemoRequest(method, url, body);
        }
    };
});

import axios from 'axios';
import { createTestPinia } from '@/test/pinia';
import { clearDemoSession, markDemoSession } from '@/features/demo/session';
import { demoDb, localYmd, resetDemoDb } from '@/features/demo/db';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import { importDetailPath, importLinesRouteQuery } from '@/features/imports/paths';
import { IMPORT_LINE_SEARCH_MAX, IMPORT_LINE_SORT_DEFAULT } from '@/features/imports/types';
import { clearVaultKeys, loadVaultRecord } from '@/features/vault/key-storage';

/**
 * Preuves de l'import en démo (roadmap « import dans la démo », chantier D4) : un parcours complet
 * par le store de l'écran, sans aucune requête, sans rien laisser sur l'appareil, sans que le
 * contenu du fichier entre dans une adresse.
 */

/** Textes propres au relevé : ils ne doivent apparaître nulle part hors de la mémoire de l'onglet. */
const SECRETS = ['Librairie Kx7Q', 'Pharmacie Zr4W', 'Salaire Vb2N', 'CH93 0076 2011 6238 5295 7'];

function dmy(iso: string): string {
    const [year, month, day] = iso.split('-');
    return `${day}.${month}.${year}`;
}

function statementFile(): File {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = dmy(localYmd(yesterday));
    const rows = [
        `Compte ${SECRETS[3]}`,
        'Date;Libellé;Montant;Bénéficiaire',
        `${day};Achat livres;-42.00;${SECRETS[0]}`,
        `${day};Médicaments;-18.50;${SECRETS[1]}`,
        `${day};${SECRETS[2]};5200.00;Employeur`,
        `${day};${SECRETS[2]};5200.00;Employeur`
    ];
    return new File([rows.join('\r\n')], 'releve-prive.csv', { type: 'text/csv' });
}

describe('import en démo : preuves de non-envoi', () => {
    const network = { calls: [] as string[] };
    const blocked = (name: string) =>
        vi.fn((...args: unknown[]) => {
            network.calls.push(`${name} ${String(args[0])}`);
            throw new Error(`Requête réseau pendant la démo : ${name}`);
        });
    let axiosRequest: ReturnType<typeof vi.spyOn>;
    let pushState: ReturnType<typeof vi.spyOn>;
    let replaceState: ReturnType<typeof vi.spyOn>;
    const idbOpen = vi.fn();
    const cachesOpen = vi.fn();

    beforeEach(() => {
        network.calls = [];
        demoCalls.urls = [];
        createTestPinia();
        resetDemoDb();
        localStorage.clear();
        sessionStorage.clear();
        markDemoSession();

        vi.stubGlobal('fetch', blocked('fetch'));
        vi.stubGlobal('WebSocket', blocked('WebSocket'));
        vi.stubGlobal('EventSource', blocked('EventSource'));
        vi.stubGlobal('indexedDB', { open: idbOpen, deleteDatabase: vi.fn(), databases: vi.fn(async () => []) });
        vi.stubGlobal('caches', { open: cachesOpen, keys: vi.fn(async () => []) });
        Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: blocked('sendBeacon') });
        vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(blocked('XMLHttpRequest.open'));
        vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(blocked('XMLHttpRequest.send'));
        axiosRequest = vi.spyOn(axios.Axios.prototype, 'request');
        pushState = vi.spyOn(history, 'pushState');
        replaceState = vi.spyOn(history, 'replaceState');
    });

    afterEach(() => {
        clearDemoSession();
        vi.unstubAllGlobals();
    });

    async function runFullImport() {
        const store = useImportsStore();
        await store.bootstrap();

        const created = await store.uploadImport({ file: statementFile(), accountPublicId: 'ACCCOUR' });
        expect(created.status).toBe('aValider');
        await store.openImport(created.publicId);
        expect(store.lines.length).toBe(4);

        // Revue : recherche, correction d'une ligne, action groupée.
        await store.loadLines({ q: 'Achat' });
        const book = store.lines[0];
        await store.updateLine(book.publicId, { categoryPublicId: 'CATREST' });
        await store.loadLines({ q: '' });
        const duplicate = store.lines.find((line) => line.duplicateOfLineNumber != null);
        expect(duplicate).toBeDefined();
        await store.bulkUpdateLines({ action: 'ignore', linePublicIds: [duplicate?.publicId ?? ''] });

        // Relecture du fichier gardé en mémoire, puis aperçu.
        await store.reparseImport(created.publicId, { mapping: { ...(store.current?.analysis.mapping ?? {}) } });
        await store.loadPreview(created.publicId);
        expect(store.preview?.toCreate).toBeGreaterThan(0);

        // Modèle, validation, retour arrière, suppression.
        await store.loadTemplates();
        const template = await store.saveImportAsTemplate(created.publicId, { name: 'Mon modèle' });
        const committed = await store.commitImport(created.publicId, { ignoreUnresolved: true });
        expect(committed.createdTransactions).toBeGreaterThan(0);
        expect(demoDb().transactions.some((tx) => tx.source === 'import')).toBe(true);
        await store.revertImport(created.publicId);
        expect(demoDb().transactions.some((tx) => tx.source === 'import')).toBe(false);
        await store.deleteImport(created.publicId);
        await store.deleteTemplate(template.publicId);
        return created.publicId;
    }

    it('fait tout le parcours sans émettre une seule requête', async () => {
        await runFullImport();
        expect(network.calls).toEqual([]);
        expect(axiosRequest).not.toHaveBeenCalled();
        expect(demoCalls.urls.length).toBeGreaterThan(10);
    });

    it('ne laisse rien sur l’appareil en dehors du drapeau de la démo', async () => {
        await runFullImport();

        expect(Object.keys(localStorage)).toEqual([]);
        expect(Object.keys(sessionStorage)).toEqual(['spendup.demo']);
        expect(idbOpen).not.toHaveBeenCalled();
        expect(cachesOpen).not.toHaveBeenCalled();
        expect(document.cookie).toBe('');
        // Le fichier est oublié dès la clôture de l'import.
        expect(demoDb().importFiles).toEqual({});
    });

    it('ne met rien du fichier dans une adresse', async () => {
        const publicId = await runFullImport();

        const addresses = [
            ...demoCalls.urls,
            ...pushState.mock.calls.map((call: unknown[]) => String(call[2] ?? '')),
            ...replaceState.mock.calls.map((call: unknown[]) => String(call[2] ?? '')),
            window.location.href,
            ...Array.from(document.querySelectorAll('img, script, link, iframe')).map(
                (element) => element.getAttribute('src') ?? element.getAttribute('href') ?? ''
            )
        ];
        for (const secret of SECRETS) {
            const words = secret.split(' ');
            for (const address of addresses) {
                const decoded = decodeURIComponent(address);
                expect(words.every((word) => decoded.includes(word))).toBe(false);
            }
        }
        // Les seules adresses propres à l'import portent son identifiant, pas son contenu.
        expect(importDetailPath(publicId)).toBe(`/app/finances/imports/${publicId}`);
    });

    it('n’ouvre pas la base du Coffre pendant la démo', async () => {
        await loadVaultRecord('USRDEMO');
        await clearVaultKeys();
        expect(idbOpen).not.toHaveBeenCalled();
    });

    it('garde la recherche hors de l’adresse en démo', () => {
        const options = { maxSearch: IMPORT_LINE_SEARCH_MAX, defaultSort: IMPORT_LINE_SORT_DEFAULT };
        expect(importLinesRouteQuery({ status: 'erreur', q: SECRETS[0], sort: '-amount' }, { ...options, inDemo: true })).toEqual({
            status: 'erreur',
            sort: '-amount'
        });
        expect(importLinesRouteQuery({ q: 'Migros', sort: IMPORT_LINE_SORT_DEFAULT }, { ...options, inDemo: false })).toEqual({
            q: 'Migros'
        });
    });
});
