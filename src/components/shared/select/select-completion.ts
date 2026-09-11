/** Complétion inline d’un select : le texte tapé est un préfixe d’un libellé. */

export type SelectCompletionItem<T = unknown> = {
    title: string;
    value: T;
};

export type SelectCompletion<T = unknown> = SelectCompletionItem<T> & {
    ghost: string;
};

function searchTitle(title: string) {
    return title.replace(/^↳\s*/, '');
}

function startsWithInsensitive(haystack: string, needle: string) {
    return haystack.toLowerCase().startsWith(needle.toLowerCase());
}

function ghostFrom(title: string, query: string) {
    if (!startsWithInsensitive(title, query)) return '';
    return title.slice(query.length);
}

/**
 * Première suggestion dont le libellé (ou un segment « · ») commence par `query`.
 * `ghost` est le suffixe à afficher après le texte déjà saisi.
 */
export function findSelectCompletion<T>(items: readonly SelectCompletionItem<T>[], query: string): SelectCompletion<T> | null {
    const needle = query.trim();
    if (!needle) return null;

    for (const item of items) {
        const title = searchTitle(item.title).trim();
        if (!title) continue;
        if (startsWithInsensitive(title, needle)) {
            const ghost = ghostFrom(title, needle);
            if (!ghost) return null;
            return { title: item.title, value: item.value, ghost };
        }
    }

    for (const item of items) {
        const title = searchTitle(item.title).trim();
        const segment = title.split('·').pop()?.trim() ?? '';
        if (!segment || segment === title) continue;
        if (!startsWithInsensitive(segment, needle)) continue;
        const ghost = ghostFrom(segment, needle);
        if (!ghost) continue;
        return { title: item.title, value: item.value, ghost };
    }

    return null;
}

export function findExactSelectItem<T>(items: readonly SelectCompletionItem<T>[], query: string): SelectCompletionItem<T> | null {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return (
        items.find((item) => searchTitle(item.title).trim().toLowerCase() === needle) ??
        items.find((item) => {
            const segment = searchTitle(item.title).split('·').pop()?.trim().toLowerCase();
            return segment === needle;
        }) ??
        null
    );
}
