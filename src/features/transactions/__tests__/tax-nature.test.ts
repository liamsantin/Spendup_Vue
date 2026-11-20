import { describe, expect, it } from 'vitest';
import { resolveTaxNature } from '@/features/transactions/tax-nature';

describe('nature fiscale effective d’une transaction', () => {
    it('sans geste ni catégorie : aucune', () => {
        expect(resolveTaxNature({}, null)).toEqual({ code: null, state: 'none' });
    });

    it('sans geste : la nature de la catégorie n’est qu’une suggestion', () => {
        expect(resolveTaxNature({ taxNature: null, taxNatureStatus: null }, 'medicalExpense')).toEqual({
            code: 'medicalExpense',
            state: 'suggested'
        });
    });

    it('la nature confirmée sur la transaction l’emporte sur celle de la catégorie', () => {
        expect(resolveTaxNature({ taxNature: 'donation', taxNatureStatus: 'confirmee' }, 'medicalExpense')).toEqual({
            code: 'donation',
            state: 'confirmed'
        });
    });

    it('écartée vaut aucune, même si la catégorie en propose une', () => {
        expect(resolveTaxNature({ taxNature: null, taxNatureStatus: 'ecartee' }, 'medicalExpense')).toEqual({
            code: null,
            state: 'dismissed'
        });
    });

    it('un statut confirmé sans code retombe sur la suggestion de la catégorie', () => {
        expect(resolveTaxNature({ taxNature: null, taxNatureStatus: 'confirmee' }, 'childcare')).toEqual({
            code: 'childcare',
            state: 'suggested'
        });
    });
});
