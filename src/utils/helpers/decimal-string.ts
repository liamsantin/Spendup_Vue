/**
 * Nombre en notation décimale simple, sans exposant : `String(0.0000005)` donne `"5e-7"`, que les champs de
 * saisie (et leurs regex) refusent. Les zéros de fin sont retirés.
 * @param value Nombre à afficher dans un champ.
 * @param maxDecimals Décimales au plus (12 : quantités crypto).
 */
export function toPlainDecimalString(value: number, maxDecimals = 12): string {
    if (!Number.isFinite(value)) return '';
    const fixed = value.toFixed(maxDecimals);
    if (!fixed.includes('.')) return fixed;
    const trimmed = fixed.replace(/0+$/, '').replace(/\.$/, '');
    return trimmed === '-0' ? '0' : trimmed;
}
