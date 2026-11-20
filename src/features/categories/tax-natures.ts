/**
 * Natures fiscales (catalogue fermé de l'API, `TaxNatureCatalogue`). Facultatives : une catégorie
 * peut n'en avoir aucune. Les libellés vivent sous `taxNatures.<code>` dans les fichiers de langue.
 */
export const TAX_NATURE_CODES = [
    'pillar3aContribution',
    'pillar2BuyIn',
    'healthInsurancePremium',
    'lifeInsurancePremium',
    'medicalExpense',
    'medicalReimbursement',
    'disabilityExpense',
    'childcare',
    'alimonyPaid',
    'commuting',
    'jobExpense',
    'trainingExpense',
    'donation',
    'politicalContribution',
    'debtInterest',
    'taxPayment'
] as const;

export type TaxNatureCode = (typeof TAX_NATURE_CODES)[number];

/** Natures proposées dans un sélecteur de catégorie, selon son type (revenu : remboursements seulement). */
export function taxNatureCodesForType(type: 'depense' | 'revenu' | 'transfert' | 'mixte'): readonly TaxNatureCode[] {
    if (type === 'mixte') return TAX_NATURE_CODES;
    if (type === 'revenu') return ['medicalReimbursement'];
    return TAX_NATURE_CODES.filter((code) => code !== 'medicalReimbursement');
}
