/**
 * Lecture locale d'un relevé (mode démo) : point d'entrée.
 *
 * Le fichier choisi par le visiteur est lu ici, dans l'onglet, et nulle part ailleurs : aucun
 * appel réseau, aucun stockage du navigateur. Les règles suivent celles de l'API
 * (`Application/Imports`) ; `__tests__/fixtures/parsing-cases.json`, partagé avec les tests de
 * l'API, vérifie que les deux lecteurs donnent le même résultat.
 */
import type { ImportMapping } from '@/features/imports/types';
import { readCsv, refuse, type ImportTable } from '@/features/demo/imports/csv';
import { interpret, type ImportInterpretation, type ImportMappingSpec } from '@/features/demo/imports/interpreter';
import { retainedMapping, toMappingSpec } from '@/features/demo/imports/mapping';

/** Plafonds de l'API (`ImportOptions`). */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_LINES = 2000;
export const MAX_COLUMNS = 100;
/** Lignes physiques tolérées en plus des lignes de données (titres, pied de page, lignes vides). */
const EXTRA_PHYSICAL_ROWS = 200;

export interface StatementReading {
    table: ImportTable;
    spec: ImportMappingSpec;
    interpretation: ImportInterpretation;
    /** Mapping à rejouer pour retrouver la même lecture (relecture, modèle). */
    retained: ImportMapping;
}

function extensionOf(fileName: string | null | undefined): string {
    const name = (fileName ?? '').split(/[\\/]/).pop() ?? '';
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

/**
 * Refuse ce que la démo ne lit pas. Mêmes messages que l'API pour les formats qu'elle refuse aussi ;
 * la démo refuse en plus les classeurs Excel, que seule l'application complète sait lire.
 */
export function ensureCsvSource(bytes: Uint8Array, fileName: string | null | undefined): void {
    const extension = extensionOf(fileName);
    if (extension === '.xlsm' || extension === '.xltm') {
        refuse('Les classeurs contenant des macros (.xlsm) sont refusés : enregistrez-le en .xlsx.');
    }
    const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    const isOle = bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    if (isOle || extension === '.xls') {
        refuse("L'ancien format Excel (.xls) n'est pas supporté : enregistrez le fichier en .xlsx ou .csv.");
    }
    if (isZip || extension === '.xlsx') {
        refuse('La démo lit les relevés au format CSV : exportez votre relevé en .csv depuis votre e-banking.');
    }
    if (!['', '.csv', '.txt', '.tsv', '.tab'].includes(extension)) {
        refuse('Format non supporté : importez un fichier .csv ou .xlsx.');
    }
    if (bytes.length === 0) refuse('Le fichier est vide.');
    if (bytes.length > MAX_CSV_BYTES) {
        refuse(`Le fichier dépasse la taille maximale autorisée (${MAX_CSV_BYTES / (1024 * 1024)} Mo pour un CSV).`);
    }
}

/**
 * Lit et interprète un relevé CSV déjà chargé en mémoire.
 * @param bytes Contenu brut du fichier.
 * @param mapping Mapping de l'écran ou d'un modèle ; `null` = détection automatique.
 */
export function readStatement(bytes: Uint8Array, mapping: ImportMapping | null | undefined): StatementReading {
    const { read, spec } = toMappingSpec(mapping);
    const table = readCsv(bytes, read.encoding, read.separator, MAX_LINES + EXTRA_PHYSICAL_ROWS, MAX_COLUMNS);
    const interpretation = interpret(table, spec, MAX_LINES);
    return { table, spec, interpretation, retained: retainedMapping(table, interpretation, spec) };
}

/** Lit le fichier choisi par le visiteur. Le contenu reste dans la mémoire de l'onglet. */
export async function readStatementFile(file: File, mapping: ImportMapping | null | undefined): Promise<StatementReading> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    ensureCsvSource(bytes, file.name);
    return readStatement(bytes, mapping);
}
