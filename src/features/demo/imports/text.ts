/**
 * Lecture locale d'un relevé (mode démo) : normalisations de texte.
 * Portage de `Application/Imports/Parsing/ImportText.cs` de l'API. Les deux lecteurs doivent donner
 * le même résultat sur les mêmes fichiers : voir `__tests__/fixtures/parsing-cases.json`.
 */

/** Espaces au sens de .NET (`char.IsWhiteSpace`) : `trim()` de JavaScript retire aussi U+FEFF et pas U+0085. */
const NET_WHITE_RANGES: [number, number][] = [
    [0x09, 0x0d],
    [0x1c, 0x1f],
    [0x20, 0x20],
    [0x85, 0x85],
    [0xa0, 0xa0],
    [0x1680, 0x1680],
    [0x2000, 0x200a],
    [0x2028, 0x2029],
    [0x202f, 0x202f],
    [0x205f, 0x205f],
    [0x3000, 0x3000]
];
const hex = (code: number) => `\\u${code.toString(16).padStart(4, '0')}`;
/** Classe construite à partir des codes : aucun espace invisible n'est écrit dans ce fichier. */
const NET_WHITE = new RegExp(`[${NET_WHITE_RANGES.map(([from, to]) => (from === to ? hex(from) : `${hex(from)}-${hex(to)}`)).join('')}]`);
const NET_WHITE_START = new RegExp(`^${NET_WHITE.source}+`);
const NET_WHITE_END = new RegExp(`${NET_WHITE.source}+$`);
const NET_WHITE_RUN = new RegExp(`${NET_WHITE.source}+`);

const LETTER_OR_DIGIT = /[\p{L}\p{Nd}]/u;
const NON_SPACING_MARK = /\p{Mn}/u;
const DIGIT = /\p{Nd}/u;

export function isWhite(char: string): boolean {
    return NET_WHITE.test(char);
}

export function trimNet(value: string): string {
    return value.replace(NET_WHITE_START, '').replace(NET_WHITE_END, '');
}

export function trimEndNet(value: string): string {
    return value.replace(NET_WHITE_END, '');
}

/** `string.IsNullOrWhiteSpace`. */
export function isBlank(value: string | null | undefined): boolean {
    return value == null || trimNet(value).length === 0;
}

/** Minuscules, sans accents, ponctuation → espace, espaces fusionnés. */
export function normalizeText(raw: string | null | undefined): string {
    if (isBlank(raw)) return '';
    const decomposed = (raw as string).normalize('NFD');
    let out = '';
    let pendingSpace = false;
    // Par unité UTF-16, comme `foreach (var c in string)` : un caractère hors plan de base compte comme ponctuation.
    for (let i = 0; i < decomposed.length; i++) {
        const c = decomposed[i];
        if (NON_SPACING_MARK.test(c)) continue;
        if (LETTER_OR_DIGIT.test(c)) {
            if (pendingSpace && out.length > 0) out += ' ';
            pendingSpace = false;
            out += c.toLowerCase();
        } else {
            pendingSpace = true;
        }
    }
    return out;
}

/** Clé « même commerçant » : sans chiffres (dates, n° de carte, références). */
export function labelKey(label: string | null | undefined): string {
    const normalized = normalizeText(label);
    if (normalized.length === 0) return '';
    return normalized
        .split(' ')
        .filter((word) => word.length > 0)
        .map((word) => [...word].filter((c) => !DIGIT.test(c)).join(''))
        .filter((word) => word.length > 0)
        .join(' ');
}

/** Clé de doublon : libellé normalisé, chiffres conservés. */
export function duplicateKey(label: string | null | undefined): string {
    return normalizeText(label);
}

/** Libellé propre : espaces fusionnés, tronqué à `maxLength`. */
export function cleanLabel(raw: string | null | undefined, maxLength: number): string | null {
    if (isBlank(raw)) return null;
    const collapsed = (raw as string)
        .split(NET_WHITE_RUN)
        .filter((part) => part.length > 0)
        .join(' ');
    return collapsed.length <= maxLength ? collapsed : trimEndNet(collapsed.slice(0, maxLength));
}
