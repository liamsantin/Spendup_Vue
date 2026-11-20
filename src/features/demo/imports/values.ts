/**
 * Lecture locale d'un relevé (mode démo) : montants et dates.
 * Portage de `Application/Imports/Parsing/ImportValueParsers.cs` de l'API.
 */
import { isBlank, isWhite, trimNet } from '@/features/demo/imports/text';

// ---- Montants -----------------------------------------------------------------------------

/** Nombre décimal exact : `units / 10^scale`. Un `number` perdrait des centimes sur les sommes. */
export interface Dec {
    units: bigint;
    scale: number;
}

/** Plus grand `decimal` de .NET : au-delà, `decimal.TryParse` échoue. */
const DECIMAL_MAX = 79228162514264337593543950335n;
const MAX_SCALE = 28;

const WORD = '[\\p{L}\\p{Mn}\\p{Nd}\\p{Pc}]';
/** Code devise courant (CHF, EUR, USD, GBP, SFR, FR) ou symbole €, $, £. */
const CURRENCY_TOKEN = new RegExp(`(?<!${WORD})(?:chf|eur|usd|gbp|sfr|fr)(?!${WORD})\\.?|[€$£]`, 'giu');
/** « 12.– » / « 12.- » : francs ronds, notation suisse des prix. */
/** Apostrophe typographique (U+2019), tirets (U+2013, U+2014) et signe moins (U+2212) : écrits par leur code. */
const APOSTROPHE = String.fromCharCode(0x2019);
const EN_DASH = String.fromCharCode(0x2013);
const DASHES = new RegExp(`[${String.fromCharCode(0x2212, 0x2013, 0x2014)}]`, 'g');
const ROUND_FRANCS = new RegExp(`^([+-]?[\\p{Nd}' ${APOSTROPHE}]+)[.,][-${EN_DASH}]$`, 'u');
/** Séparateurs de milliers : apostrophes, espace, espace insécable (U+00A0), fine insécable (U+202F), fine (U+2009). */
const THOUSANDS = new Set(["'", APOSTROPHE, ' ', ...String.fromCharCode(0x00a0, 0x202f, 0x2009)]);

function count(text: string, char: string): number {
    return text.split(char).length - 1;
}

/**
 * Ramène le texte à « chiffres + point décimal ». Sans séparateur imposé : le dernier des deux
 * signes est décimal ; un signe unique suivi de 3 chiffres est un séparateur de milliers,
 * sauf après un « 0 » seul.
 */
function normalizeSeparators(text: string, decimalSeparator: '.' | ',' | null): string | null {
    if (decimalSeparator) {
        const thousands = decimalSeparator === '.' ? ',' : '.';
        const stripped = text.split(thousands).join('');
        if (count(stripped, decimalSeparator) > 1) return null;
        return stripped.split(decimalSeparator).join('.');
    }

    const lastDot = text.lastIndexOf('.');
    const lastComma = text.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
        const decimalChar = lastDot > lastComma ? '.' : ',';
        const thousandsChar = decimalChar === '.' ? ',' : '.';
        const stripped = text.split(thousandsChar).join('');
        return count(stripped, decimalChar) > 1 ? null : stripped.split(decimalChar).join('.');
    }

    const separator = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    if (separator === null) return text;
    if (count(text, separator) > 1) return text.split(separator).join('');

    const index = text.indexOf(separator);
    const integerPart = text.slice(0, index);
    const fraction = text.slice(index + 1);
    if (fraction.length === 3 && integerPart.length > 0 && integerPart.length <= 3 && integerPart !== '0') {
        return integerPart + fraction;
    }
    return integerPart.length === 0 ? `0.${fraction}` : `${integerPart}.${fraction}`;
}

/** `decimal.TryParse` (chiffres et un point décimal au plus). */
function toDec(normalized: string): Dec | null {
    if (!/^[0-9]*\.?[0-9]*$/.test(normalized) || !/[0-9]/.test(normalized)) return null;
    const [integerPart, fractionPart = ''] = normalized.split('.');
    const fraction = fractionPart.slice(0, MAX_SCALE);
    const units = BigInt(`${integerPart}${fraction}` || '0');
    if (BigInt(integerPart || '0') > DECIMAL_MAX) return null;
    return { units, scale: fraction.length };
}

/**
 * Montants tels que les écrivent les banques suisses et les tableurs : `1'234.50`, `1 234,50`,
 * `-50.00`, `50.00-`, `(50.00)`, `CHF 12.–`.
 * @returns Le montant signé, ou `null` si le texte n'est pas un montant.
 */
export function parseAmount(raw: string | null | undefined, decimalSeparator: '.' | ',' | null): Dec | null {
    if (isBlank(raw)) return null;

    let text = (raw as string).replace(CURRENCY_TOKEN, ' ');
    text = trimNet(text.replace(DASHES, '-'));
    text = text.replace(ROUND_FRANCS, '$1');

    let negative = false;
    if (text.startsWith('(') && text.endsWith(')')) {
        negative = true;
        text = trimNet(text.slice(1, -1));
    }

    if (text.startsWith('-')) {
        negative = !negative;
        text = trimNet(text.slice(1));
    } else if (text.startsWith('+')) {
        text = trimNet(text.slice(1));
    } else if (text.endsWith('-')) {
        negative = !negative;
        text = trimNet(text.slice(0, -1));
    }

    let compact = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (THOUSANDS.has(c)) continue;
        if (!/[0-9.,]/.test(c)) return null;
        compact += c;
    }
    if (compact.length === 0 || !/[0-9]/.test(compact)) return null;

    const normalized = normalizeSeparators(compact, decimalSeparator);
    const parsed = normalized === null ? null : toDec(normalized);
    if (!parsed) return null;
    return negative ? { units: -parsed.units, scale: parsed.scale } : parsed;
}

export function decAbs(value: Dec): Dec {
    return value.units < 0n ? { units: -value.units, scale: value.scale } : value;
}

export function decNegate(value: Dec): Dec {
    return { units: -value.units, scale: value.scale };
}

export function decAdd(a: Dec, b: Dec): Dec {
    const scale = Math.max(a.scale, b.scale);
    const lift = (value: Dec) => value.units * 10n ** BigInt(scale - value.scale);
    return { units: lift(a) + lift(b), scale };
}

/** Arrondi au centime, demi-unité loin de zéro (`MidpointRounding.AwayFromZero`). */
export function decToCents(value: Dec): bigint {
    if (value.scale <= 2) return value.units * 10n ** BigInt(2 - value.scale);
    const divisor = 10n ** BigInt(value.scale - 2);
    const negative = value.units < 0n;
    const magnitude = negative ? -value.units : value.units;
    const quotient = magnitude / divisor;
    const rounded = (magnitude % divisor) * 2n >= divisor ? quotient + 1n : quotient;
    return negative ? -rounded : rounded;
}

/** Montant en francs et centimes, pour l'affichage et la base de la démo. */
export function centsToNumber(cents: bigint): number {
    return Number(cents) / 100;
}

// ---- Dates ----------------------------------------------------------------------------------

export interface CivilDate {
    year: number;
    month: number;
    day: number;
}

/** Formats essayés sans format imposé : jour avant mois, un export suisse n'écrit jamais MM/dd. */
const DATE_FORMATS = [
    'yyyy-MM-dd',
    'dd.MM.yyyy',
    'd.M.yyyy',
    'dd.MM.yy',
    'd.M.yy',
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd/MM/yy',
    'd/M/yy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'yyyy/MM/dd',
    'yyyyMMdd',
    'yyyy-MM-ddTHH:mm:ss',
    'yyyy-MM-ddTHH:mm:ss.fff',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss.f',
    'yyyy-MM-dd HH:mm:ss.ff',
    'yyyy-MM-dd HH:mm:ss.fff',
    'yyyy-MM-dd HH:mm',
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy HH:mm:ss'
];

/** Horodatage ISO avec décalage : on garde la date civile écrite, sans conversion de fuseau. */
const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Siècle d'une année sur deux chiffres : 00 à 49 → 20xx, 50 à 99 → 19xx. */
const TWO_DIGIT_YEAR_MAX = 2049;

type FormatToken =
    | { kind: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'fraction'; length: number }
    | { kind: 'literal'; text: string };

const SPECIFIERS: Record<string, FormatToken['kind']> = {
    y: 'year',
    M: 'month',
    d: 'day',
    H: 'hour',
    m: 'minute',
    s: 'second',
    f: 'fraction'
};
/** Jetons .NET que ce lecteur ne connaît pas (heure sur 12 h, fuseau, ère, nom du jour) : format refusé. */
const UNSUPPORTED = new Set(['F', 'g', 'h', 't', 'z', 'K', '%']);

/** Découpe un format .NET personnalisé (`dd.MM.yyyy`…). `null` si un jeton n'est pas pris en charge. */
function tokenizeFormat(format: string): FormatToken[] | null {
    // Un seul caractère est un format standard en .NET (« d » = date courte) : non pris en charge.
    if (format.length < 2) return null;
    const tokens: FormatToken[] = [];
    let i = 0;
    while (i < format.length) {
        const c = format[i];
        if (c === "'" || c === '"') {
            const end = format.indexOf(c, i + 1);
            if (end < 0) return null;
            tokens.push({ kind: 'literal', text: format.slice(i + 1, end) });
            i = end + 1;
            continue;
        }
        if (c === '\\') {
            if (i + 1 >= format.length) return null;
            tokens.push({ kind: 'literal', text: format[i + 1] });
            i += 2;
            continue;
        }
        if (UNSUPPORTED.has(c)) return null;
        const kind = SPECIFIERS[c];
        if (!kind) {
            tokens.push({ kind: 'literal', text: c });
            i++;
            continue;
        }
        let length = 1;
        while (format[i + length] === c) length++;
        if (kind === 'day' && length > 2) return null;
        if (kind === 'month' && length > 4) return null;
        if (kind === 'fraction' && length > 7) return null;
        tokens.push({ kind, length } as FormatToken);
        i += length;
    }
    return tokens;
}

function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidDate(year: number, month: number, day: number): boolean {
    return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** `DateTime.TryParseExact` (culture invariante, espaces tolérés) pour un format déjà découpé. */
function parseWithTokens(text: string, tokens: FormatToken[], defaultYear: number): CivilDate | null {
    let pos = 0;
    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;
    let hour = 0;
    let minute = 0;
    let second = 0;

    const skipWhite = () => {
        while (pos < text.length && isWhite(text[pos])) pos++;
    };
    /** Un jeton d'un seul caractère lit 1 ou 2 chiffres ; sinon exactement sa longueur. */
    const digits = (length: number): number | null => {
        const min = length === 1 ? 1 : length;
        const max = length === 1 ? 2 : length;
        let end = pos;
        while (end < text.length && end - pos < max && text[end] >= '0' && text[end] <= '9') end++;
        if (end - pos < min) return null;
        const value = Number(text.slice(pos, end));
        pos = end;
        return value;
    };

    for (const token of tokens) {
        skipWhite();
        if (token.kind === 'literal') {
            for (const c of token.text) {
                if (isWhite(c)) {
                    skipWhite();
                    continue;
                }
                if (text[pos] !== c) return null;
                pos++;
            }
            continue;
        }
        if (token.kind === 'month' && token.length >= 3) {
            const rest = text.slice(pos).toLowerCase();
            const names = token.length === 3 ? MONTHS.map((name) => name.slice(0, 3)) : MONTHS;
            const index = names.findIndex((name) => rest.startsWith(name.toLowerCase()));
            if (index < 0) return null;
            month = index + 1;
            pos += names[index].length;
            continue;
        }
        const value = digits(token.length);
        if (value === null) return null;
        switch (token.kind) {
            case 'year':
                if (token.length <= 2) {
                    const century = Math.floor(TWO_DIGIT_YEAR_MAX / 100) * 100;
                    year = value + (value > TWO_DIGIT_YEAR_MAX % 100 ? century - 100 : century);
                } else {
                    year = value;
                }
                break;
            case 'month':
                month = value;
                break;
            case 'day':
                day = value;
                break;
            case 'hour':
                hour = value;
                break;
            case 'minute':
                minute = value;
                break;
            case 'second':
                second = value;
                break;
            default:
                break;
        }
    }

    skipWhite();
    if (pos !== text.length) return null;
    const result = { year: year ?? defaultYear, month: month ?? 1, day: day ?? 1 };
    if (!isValidDate(result.year, result.month, result.day) || hour > 23 || minute > 59 || second > 59) return null;
    return result;
}

function inRange(date: CivilDate): boolean {
    const key = date.year * 10_000 + date.month * 100 + date.day;
    return key >= 19500101 && key <= 21001231;
}

const DEFAULT_TOKENS = DATE_FORMATS.map((format) => tokenizeFormat(format) as FormatToken[]);

/**
 * Lit une date avec le format imposé seul, ou les formats européens connus.
 * @returns La date, ou `null` si elle est illisible ou hors de la plage 1950–2100.
 */
export function parseDateText(raw: string | null | undefined, forcedFormat: string | null): CivilDate | null {
    if (isBlank(raw)) return null;
    const text = trimNet(raw as string);
    const forced = isBlank(forcedFormat) ? null : trimNet(forcedFormat as string);
    const formats = forced === null ? DEFAULT_TOKENS : [tokenizeFormat(forced)];
    const currentYear = new Date().getFullYear();

    for (const tokens of formats) {
        if (!tokens) continue;
        const parsed = parseWithTokens(text, tokens, currentYear);
        if (parsed) return inRange(parsed) ? parsed : null;
    }

    if (forced === null) {
        const match = ISO_WITH_OFFSET.exec(text);
        if (match) {
            const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
            const timeOk = Number(match[4]) < 24 && Number(match[5]) < 60 && Number(match[6]) < 60;
            if (timeOk && isValidDate(date.year, date.month, date.day)) return inRange(date) ? date : null;
        }
    }
    return null;
}

function pad(value: number, length: number): string {
    return String(value).padStart(length, '0');
}

/** Écrit le 31.12.2024 à minuit selon le format, pour vérifier qu'il se relit. */
function formatSample(tokens: FormatToken[]): string {
    return tokens
        .map((token) => {
            switch (token.kind) {
                case 'literal':
                    return token.text;
                case 'year':
                    return token.length <= 2 ? pad(24, token.length) : pad(2024, token.length);
                case 'month':
                    return token.length === 3 ? 'Dec' : token.length === 4 ? 'December' : pad(12, token.length);
                case 'day':
                    return pad(31, token.length);
                default:
                    return pad(0, token.length);
            }
        })
        .join('');
}

/** Valide un `dateFormat` du mapping : le format doit relire la date qu'il écrit (jour, mois et année compris). */
export function isValidDateFormat(format: string): boolean {
    if (isBlank(format) || format.length > 40) return false;
    const tokens = tokenizeFormat(format);
    if (!tokens) return false;
    // Année par défaut volontairement fausse : un format sans année ne doit pas passer.
    const back = parseWithTokens(formatSample(tokens), tokens, 1);
    return !!back && back.year === 2024 && back.month === 12 && back.day === 31;
}

export function toIsoDate(date: CivilDate): string {
    return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}
