/**
 * Démo glissante (V6.7). Les données de démo sont écrites autour d’un « aujourd’hui » de référence ;
 * passé ce mois, le tableau de bord du mois courant serait vide. Au chargement, les dates sont donc
 * décalées d’un nombre entier de mois, pour que le mois de référence tombe sur le mois réel.
 */

/** Jour autour duquel les données de démo sont écrites. */
export const DEMO_REFERENCE_TODAY = '2026-11-14';
/** Année de la déclaration d’impôts écrite dans les données de démo. */
export const DEMO_REFERENCE_TAX_YEAR = 2026;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/;

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function ymd(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Mois entiers entre le mois de référence et le mois de `now`, jamais négatif.
 * Sans `now`, les tests gardent les dates de référence (0) : ils comparent des dates écrites en dur.
 */
export function demoMonthShift(now?: Date): number {
    if (!now && import.meta.env.MODE === 'test') return 0;
    const today = now ?? new Date();
    const [year, month] = DEMO_REFERENCE_TODAY.split('-').map(Number);
    return Math.max(0, today.getFullYear() * 12 + today.getMonth() - (year * 12 + (month - 1)));
}

/** Décale une date (`YYYY-MM-DD`, avec ou sans heure) de `months` mois ; le jour est ramené à la fin du mois si besoin. */
export function shiftYmd(value: string, months: number): string {
    const match = DATE_RE.exec(value);
    if (!match || !months) return value;
    const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + months;
    const year = Math.floor(index / 12);
    const month = index % 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${pad(month + 1)}-${pad(Math.min(Number(match[3]), lastDay))}${match[4] ?? ''}`;
}

/**
 * Décale toutes les dates d’une valeur (objets et tableaux parcourus en profondeur).
 * Une date passée à la référence reste passée : si le décalage la pousse après `now`
 * (on est le 3 du mois, elle tombait le 12), elle est ramenée à aujourd’hui.
 */
export function shiftDemoDates<T>(value: T, months: number, now: Date = new Date()): T {
    if (!months) return value;
    const today = ymd(now);
    const walk = (node: unknown): unknown => {
        if (typeof node === 'string') {
            const match = DATE_RE.exec(node);
            if (!match) return node;
            const shifted = shiftYmd(node, months);
            const wasPast = node.slice(0, 10) <= DEMO_REFERENCE_TODAY;
            if (wasPast && shifted.slice(0, 10) > today) return match[4] ? `${today}T00:00:00.000Z` : today;
            return shifted;
        }
        if (Array.isArray(node)) return node.map(walk);
        if (node && typeof node === 'object') {
            return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([key, item]) => [key, walk(item)]));
        }
        return node;
    };
    return walk(value) as T;
}

/**
 * Année que suit la déclaration d’impôts de démo : celle qui contient le plus d’opérations
 * (la plus récente en cas d’égalité). Sans opération, l’année de référence.
 */
export function demoTaxYear(operationDates: readonly string[]): number {
    const counts = new Map<number, number>();
    for (const date of operationDates) {
        const year = Number(date.slice(0, 4));
        if (Number.isFinite(year) && year > 0) counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    return best ? best[0] : DEMO_REFERENCE_TAX_YEAR;
}

/**
 * Porte une déclaration de démo sur une autre année : champ `year`, dates (années entières, donc
 * le 31 mars reste le 31 mars) et mentions de l’année dans les textes.
 */
export function shiftTaxYear<T>(value: T, taxYear: number): T {
    const delta = taxYear - DEMO_REFERENCE_TAX_YEAR;
    if (!delta) return value;
    const walk = (node: unknown, key?: string): unknown => {
        if (typeof node === 'number') return key === 'year' ? node + delta : node;
        if (typeof node === 'string') {
            if (DATE_RE.test(node)) return shiftYmd(node, delta * 12);
            return key === 'detail' || key === 'label' || key === 'title' || key === 'note'
                ? node.replaceAll(String(DEMO_REFERENCE_TAX_YEAR), String(taxYear))
                : node;
        }
        if (Array.isArray(node)) return node.map((item) => walk(item, key));
        if (node && typeof node === 'object') {
            return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, item]) => [k, walk(item, k)]));
        }
        return node;
    };
    return walk(value) as T;
}
