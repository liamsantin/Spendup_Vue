/**
 * Date lisible d'une déclaration (dépôt, correction). Une date seule (`yyyy-mm-dd`) reste ce jour-là ; une date-heure
 * ISO est lue dans le fuseau du navigateur.
 */
export function formatTaxDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12) : new Date(trimmed);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

/**
 * Montant saisi à la main : espaces et apostrophes de milliers retirés (« 1'200.50 », « 1 200,50 »), virgule décimale
 * acceptée. Vide → `null` (la case se vide) ; illisible → `NaN`, que l'appelant signale au lieu de l'ignorer.
 */
export function parseTaxAmount(raw: string): number | null {
    const text = raw.replace(/[’'`\s]/g, '').replace(',', '.');
    if (!text) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : Number.NaN;
}
