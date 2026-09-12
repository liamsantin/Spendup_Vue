/**
 * Recherche « contient » : chaque mot du needle doit apparaître dans haystack (casse ignorée).
 */
export function matchesSearchTokens(haystack: string, needle: string): boolean {
    const tokens = needle.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = haystack.toLowerCase();
    return tokens.every((token) => hay.includes(token));
}
