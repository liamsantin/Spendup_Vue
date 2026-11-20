/**
 * Lecture locale d'un relevé (mode démo) : fichier CSV.
 * Portage de `Application/Imports/Parsing/CsvTableReader.cs` et `ImportTable.cs` de l'API.
 * Le fichier est lu en mémoire, dans l'onglet : rien n'est envoyé ni écrit sur le poste.
 */
import { AppError } from '@/utils/errors/app-error';
import { isBlank, trimNet } from '@/features/demo/imports/text';

export const ENCODING_UTF8 = 'utf-8';
export const ENCODING_UTF16 = 'utf-16';
export const ENCODING_WINDOWS_1252 = 'windows-1252';
export const ENCODING_LATIN1 = 'iso-8859-1';

/** Longueur maximale d'une cellule texte : au-delà, tronquée. */
export const MAX_CELL_TEXT_LENGTH = 1000;

const SEPARATOR_CANDIDATES = [';', ',', '\t', '|'];
/** Nombre de lignes non vides examinées pour choisir le séparateur. */
const SEPARATOR_SAMPLE_LINES = 30;

/** Cellule d'un CSV : son texte brut, ou `null` si elle est vide. (Un classeur aurait aussi des nombres et des dates.) */
export type ImportCell = string | null;

/** Ligne source : `rowNumber` est le numéro affiché à l'utilisateur (1-based). */
export interface ImportRow {
    rowNumber: number;
    cells: ImportCell[];
}

export interface ImportTable {
    rows: ImportRow[];
    encoding: string | null;
    separator: string | null;
}

export function refuse(message: string): never {
    throw new AppError(message, 400);
}

export function cellFromText(text: string | null | undefined): ImportCell {
    if (isBlank(text)) return null;
    const value = text as string;
    return value.length > MAX_CELL_TEXT_LENGTH ? value.slice(0, MAX_CELL_TEXT_LENGTH) : value;
}

/** Représentation lisible d'une cellule (échantillon, en-têtes, libellés). */
export function cellDisplay(cell: ImportCell | undefined): string {
    return cell == null ? '' : trimNet(cell);
}

export function rowIsBlank(row: ImportRow): boolean {
    return row.cells.every((cell) => cell === null);
}

export function cellAt(row: ImportRow, index: number): ImportCell {
    return index >= 0 && index < row.cells.length ? row.cells[index] : null;
}

/** Normalise le nom d'encodage accepté par le mapping. */
export function normalizeEncodingName(raw: string | null | undefined): string | null {
    if (isBlank(raw)) return null;
    switch (trimNet(raw as string).toLowerCase()) {
        case 'utf-8':
        case 'utf8':
            return ENCODING_UTF8;
        case 'utf-16':
        case 'utf16':
        case 'unicode':
            return ENCODING_UTF16;
        case 'windows-1252':
        case 'cp1252':
        case '1252':
        case 'ansi':
            return ENCODING_WINDOWS_1252;
        case 'iso-8859-1':
        case 'latin1':
        case 'latin-1':
            return ENCODING_LATIN1;
        default:
            return refuse('Encodage non supporté (utf-8, utf-16, windows-1252, iso-8859-1).');
    }
}

/** Séparateur accepté par le mapping : `;`, `,`, `|` ou `\t` / `tab`. */
export function parseSeparator(raw: string): string {
    switch (raw) {
        case ';':
        case ',':
        case '|':
            return raw;
        case '\t':
        case '\\t':
        case 'tab':
            return '\t';
        default:
            return refuse('Séparateur non supporté (;, ,, | ou tab).');
    }
}

/** Jeton du séparateur : `tab` pour la tabulation, sinon le caractère lui-même. */
export function separatorToApi(separator: string): string {
    return separator === '\t' ? 'tab' : separator;
}

function decodeStrict(label: string, bytes: Uint8Array, offset: number): string {
    try {
        return new TextDecoder(label, { fatal: true, ignoreBOM: true }).decode(bytes.subarray(offset));
    } catch {
        return refuse("Le fichier ne correspond pas à l'encodage attendu.");
    }
}

/** ISO-8859-1 : un octet = un caractère. (`TextDecoder('iso-8859-1')` décode en réalité du Windows-1252.) */
function decodeLatin1(bytes: Uint8Array): string {
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192) {
        text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return text;
}

/**
 * Décode selon le BOM, sinon l'encodage imposé, sinon UTF-8 puis Windows-1252.
 * Un octet NUL hors UTF-16, ou un encodage imposé qui ne correspond pas, est refusé.
 */
function decode(bytes: Uint8Array, forcedEncoding: string | null | undefined): { text: string; encoding: string } {
    const forced = normalizeEncodingName(forcedEncoding);

    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return { text: decodeStrict('utf-8', bytes, 3), encoding: ENCODING_UTF8 };
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return { text: decodeStrict('utf-16le', bytes, 2), encoding: ENCODING_UTF16 };
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return { text: decodeStrict('utf-16be', bytes, 2), encoding: ENCODING_UTF16 };
    }

    if (forced !== null) {
        const decoded =
            forced === ENCODING_UTF8
                ? decodeStrict('utf-8', bytes, 0)
                : forced === ENCODING_UTF16
                  ? decodeStrict('utf-16le', bytes, 0)
                  : forced === ENCODING_WINDOWS_1252
                    ? new TextDecoder('windows-1252', { ignoreBOM: true }).decode(bytes)
                    : decodeLatin1(bytes);
        if (decoded.includes('\0')) refuse("Le fichier n'est pas un CSV texte lisible.");
        return { text: decoded, encoding: forced };
    }

    // Un NUL hors UTF-16 trahit un binaire (PDF, image, xlsx renommé en .csv).
    if (bytes.includes(0)) refuse("Le fichier n'est pas un CSV texte lisible.");

    try {
        return { text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes), encoding: ENCODING_UTF8 };
    } catch {
        // Octets invalides en UTF-8 : export « ANSI » des banques suisses.
        return { text: new TextDecoder('windows-1252', { ignoreBOM: true }).decode(bytes), encoding: ENCODING_WINDOWS_1252 };
    }
}

export interface CsvRecord {
    startLine: number;
    fields: string[];
}

/**
 * Découpe RFC 4180. Un guillemet au milieu d'un champ non quoté reste littéral. Chaque
 * enregistrement porte la ligne physique où il commence, même si un champ quoté s'étend sur plusieurs lignes.
 */
export function* tokenizeCsv(text: string, separator: string): Generator<CsvRecord> {
    let fields: string[] = [];
    let field = '';
    let inQuotes = false;
    let fieldStarted = false;
    let i = 0;
    let line = 1;
    let recordStart = 1;

    while (i < text.length) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }
            if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) line++;
            field += c;
            i++;
            continue;
        }

        if (c === '"' && !fieldStarted) {
            inQuotes = true;
            fieldStarted = true;
            i++;
            continue;
        }

        if (c === separator) {
            fields.push(field);
            field = '';
            fieldStarted = false;
            i++;
            continue;
        }

        if (c === '\r' || c === '\n') {
            fields.push(field);
            field = '';
            fieldStarted = false;
            yield { startLine: recordStart, fields };
            fields = [];
            if (c === '\r' && text[i + 1] === '\n') i++;
            i++;
            line++;
            recordStart = line;
            continue;
        }

        field += c;
        fieldStarted = true;
        i++;
    }

    if (field.length > 0 || fields.length > 0 || fieldStarted) {
        fields.push(field);
        yield { startLine: recordStart, fields };
    }
}

/**
 * Retient le séparateur qui découpe le plus régulièrement les lignes en plusieurs champs.
 * Score = occurrences du nombre de champs le plus fréquent × ce nombre.
 */
function detectSeparator(text: string): string {
    let best = ';';
    let bestScore = 0;

    for (const candidate of SEPARATOR_CANDIDATES) {
        const counts: number[] = [];
        let sampled = 0;
        for (const record of tokenizeCsv(text, candidate)) {
            if (!record.fields.some((field) => !isBlank(field))) continue;
            if (sampled++ >= SEPARATOR_SAMPLE_LINES) break;
            if (record.fields.length > 1) counts.push(record.fields.length);
        }
        if (counts.length === 0) continue;

        const frequency = new Map<number, number>();
        for (const value of counts) frequency.set(value, (frequency.get(value) ?? 0) + 1);
        const [modeKey, modeCount] = [...frequency.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
        const score = modeCount * modeKey;
        if (score > bestScore) {
            best = candidate;
            bestScore = score;
        }
    }
    return best;
}

/**
 * Lit un CSV complet.
 * @param bytes Contenu brut du fichier.
 * @param forcedEncoding Encodage imposé par le mapping, sinon détection.
 * @param forcedSeparator Séparateur imposé par le mapping, sinon détection.
 * @param maxRows Plafond de lignes physiques, au-delà le fichier est refusé.
 * @param maxColumns Colonnes conservées par ligne ; les suivantes sont ignorées.
 */
export function readCsv(
    bytes: Uint8Array,
    forcedEncoding: string | null | undefined,
    forcedSeparator: string | null | undefined,
    maxRows: number,
    maxColumns = 100
): ImportTable {
    const { text, encoding } = decode(bytes, forcedEncoding);
    const separator = forcedSeparator ? parseSeparator(forcedSeparator) : detectSeparator(text);

    const rows: ImportRow[] = [];
    let records = 0;
    for (const record of tokenizeCsv(text, separator)) {
        records++;
        if (records > maxRows) refuse(`Le fichier dépasse ${maxRows} lignes : découpez-le en plusieurs imports.`);
        rows.push({ rowNumber: record.startLine, cells: record.fields.slice(0, Math.max(1, maxColumns)).map(cellFromText) });
    }
    return { rows, encoding, separator: separatorToApi(separator) };
}
