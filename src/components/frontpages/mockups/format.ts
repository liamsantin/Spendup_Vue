/**
 * Formats des maquettes marketing : conventions suisses (apostrophe des milliers, point décimal).
 * Les maquettes affichent des données fictives mais crédibles pour un utilisateur en Suisse.
 */

/** `12840.5` → `12’840.50` */
export function swissNumber(value: number, decimals = 2): string {
    const fixed = Math.abs(value).toFixed(decimals);
    const [int, dec] = fixed.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '’');
    return `${value < 0 ? '−' : ''}${grouped}${dec ? `.${dec}` : ''}`;
}

/** `-84.37` → `− CHF 84.37`, `2450` → `CHF 2’450.00` */
export function chf(value: number, decimals = 2): string {
    const sign = value < 0 ? '− ' : '';
    return `${sign}CHF ${swissNumber(Math.abs(value), decimals)}`;
}

/** Montant signé pour les listes de transactions : `+ 6’250.00` / `− 84.37`. */
export function signedAmount(value: number): string {
    return `${value < 0 ? '−' : '+'} ${swissNumber(Math.abs(value))}`;
}

/** Domaine affiché dans les barres d'adresse des maquettes (Spend.Up est une application web). */
export const MOCK_APP_HOST = 'spendup.ch';
