/**
 * Nature fiscale effective d'une transaction. Miroir de `TaxNatureResolver` (API) :
 * la transaction l'emporte sur la catégorie ; écartée vaut « aucune » ;
 * sans geste, la nature de la catégorie n'est qu'une suggestion.
 */
export type TransactionTaxNatureStatus = 'confirmee' | 'ecartee';

export type TaxNatureState = 'none' | 'suggested' | 'confirmed' | 'dismissed';

export type EffectiveTaxNature = { code: string | null; state: TaxNatureState };

/** Geste envoyé à `PUT /api/transactions/{id}/tax-nature`. */
export type SetTransactionTaxNaturePayload = { taxNature: string | null; dismissed?: boolean };

export type TransactionTaxNatureResult = {
    publicId: string;
    taxNature: string | null;
    taxNatureStatus: TransactionTaxNatureStatus | null;
};

export function resolveTaxNature(
    transaction: { taxNature?: string | null; taxNatureStatus?: TransactionTaxNatureStatus | null },
    categoryNature: string | null | undefined
): EffectiveTaxNature {
    if (transaction.taxNatureStatus === 'ecartee') return { code: null, state: 'dismissed' };
    if (transaction.taxNatureStatus === 'confirmee' && transaction.taxNature) {
        return { code: transaction.taxNature, state: 'confirmed' };
    }
    return categoryNature ? { code: categoryNature, state: 'suggested' } : { code: null, state: 'none' };
}
