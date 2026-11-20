import { describe, expect, it } from 'vitest';
import { buildCreateCategoryPayload, buildUpdateCategoryPayload, isCategoryFormDirty } from '@/features/categories/payload';
import { DEFAULT_CATEGORY_PLAN } from '@/features/categories/plans';
import { TAX_NATURE_CODES, taxNatureCodesForType } from '@/features/categories/tax-natures';
import type { Category } from '@/features/categories/types';
import fr from '@/utils/locales/fr.json';
import en from '@/utils/locales/en.json';

const base = { name: 'Dentiste', type: 'depense' as const, color: null, icone: '', parentPublicId: '' };

function category(taxNature: string | null): Category {
    return {
        publicId: 'C1',
        name: 'Dentiste',
        type: 'depense',
        color: null,
        icone: null,
        parentPublicId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        children: [],
        taxNature
    };
}

describe('nature fiscale des catégories', () => {
    it('envoie la nature à la création seulement quand elle est choisie', () => {
        const withNature = buildCreateCategoryPayload({ ...base, taxNature: 'medicalExpense' });
        expect(withNature.ok && withNature.payload.taxNature).toBe('medicalExpense');

        const without = buildCreateCategoryPayload({ ...base, taxNature: '' });
        expect(without.ok && 'taxNature' in without.payload).toBe(false);
    });

    it('à la mise à jour, une nature vidée part en chaîne vide (efface côté API)', () => {
        const cleared = buildUpdateCategoryPayload({ ...base, taxNature: '' });
        expect(cleared.ok && cleared.payload.taxNature).toBe('');
        const kept = buildUpdateCategoryPayload({ ...base, taxNature: 'donation' });
        expect(kept.ok && kept.payload.taxNature).toBe('donation');
    });

    it('le formulaire est modifié quand la nature change', () => {
        expect(isCategoryFormDirty(category('medicalExpense'), { ...base, taxNature: 'medicalExpense' })).toBe(false);
        expect(isCategoryFormDirty(category('medicalExpense'), { ...base, taxNature: 'donation' })).toBe(true);
        expect(isCategoryFormDirty(category(null), { ...base, taxNature: '' })).toBe(false);
        expect(isCategoryFormDirty(category(null), { ...base })).toBe(false);
    });

    it('le plan de démarrage ne pose que des natures connues, jamais sur une racine', () => {
        const known = new Set<string>(TAX_NATURE_CODES);
        const withNature: string[] = [];
        for (const root of DEFAULT_CATEGORY_PLAN) {
            expect('taxNature' in root).toBe(false);
            for (const child of root.children ?? []) {
                if (child.taxNature) {
                    expect(known.has(child.taxNature)).toBe(true);
                    withNature.push(child.nameKey);
                }
            }
        }
        // Les 11 sous-catégories validées + « Remboursements santé » (inventaire R0).
        expect(withNature).toHaveLength(12);
        expect(withNature).toContain('troisiemePilier');
        expect(withNature).toContain('remboursementsSante');
        // Transports publics : volontairement sans nature (décision 2).
        expect(withNature).not.toContain('transportsPublics');
    });

    it('chaque nature du plan est compatible avec le type de sa catégorie', () => {
        for (const root of DEFAULT_CATEGORY_PLAN) {
            for (const child of root.children ?? []) {
                if (!child.taxNature) continue;
                const type = child.type ?? root.type;
                expect(taxNatureCodesForType(type)).toContain(child.taxNature);
            }
        }
    });

    it('les natures ont un libellé en français et en anglais', () => {
        for (const code of TAX_NATURE_CODES) {
            expect((fr.taxNatures as Record<string, string>)[code]).toBeTruthy();
            expect((en.taxNatures as Record<string, string>)[code]).toBeTruthy();
        }
        expect(fr.categoriesPage.plan.nodes.remboursementsSante).toBeTruthy();
        expect(en.categoriesPage.plan.nodes.remboursementsSante).toBeTruthy();
    });

    it('un revenu ne propose que le remboursement médical', () => {
        expect(taxNatureCodesForType('revenu')).toEqual(['medicalReimbursement']);
        expect(taxNatureCodesForType('depense')).not.toContain('medicalReimbursement');
        expect(taxNatureCodesForType('mixte')).toHaveLength(TAX_NATURE_CODES.length);
    });
});
