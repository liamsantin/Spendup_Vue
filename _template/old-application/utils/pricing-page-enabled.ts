/** `VITE_PRICING_PAGE` : `true` affiche la page Tarifs, `false` la masque partout. */
export function isPricingPageEnabled(): boolean {
    const raw = String(import.meta.env.VITE_PRICING_PAGE ?? 'false')
        .trim()
        .toLowerCase();
    return raw === 'true' || raw === '1';
}
