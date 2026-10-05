/** Minuscules sans accents (`Épargne` → `epargne`), pour comparer comme le serveur. */
export function foldSearchText(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Recherche « contient » : chaque mot du needle doit apparaître dans haystack (casse et accents ignorés).
 */
export function matchesSearchTokens(haystack: string, needle: string): boolean {
    const tokens = foldSearchText(needle.trim()).split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = foldSearchText(haystack);
    return tokens.every((token) => hay.includes(token));
}
