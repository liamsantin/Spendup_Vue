import { describe, expect, it } from 'vitest';
import { TAX_BASE, taxDetailPath, taxPublicIdFromPath, taxSuggestionPath, taxSuggestionTargets } from '../paths';

describe('tax paths', () => {
    it('construit le détail et le relit, y compris sous /demo', () => {
        const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        expect(taxDetailPath(id)).toBe(`${TAX_BASE}/${id}`);
        expect(taxPublicIdFromPath(taxDetailPath(id))).toBe(id);
        expect(taxPublicIdFromPath(`/demo/planning/impots/${id}`)).toBe(id);
        expect(taxPublicIdFromPath(TAX_BASE)).toBeNull();
    });

    it('renvoie une proposition vers la page d’où elle vient, et nulle part pour un relevé importé', () => {
        expect(taxSuggestionPath({ code: 'income.allowances', source: 'recurringIncome' })).toBe('/app/finances/recurrences/revenus');
        expect(taxSuggestionPath({ code: 'liability.debts', source: 'liability' })).toBe('/app/patrimoine/dettes');
        expect(taxSuggestionPath({ code: 'asset.property', source: 'asset' })).toBe('/app/patrimoine/immobilier');
        expect(taxSuggestionPath({ code: 'asset.crypto', source: 'asset' })).toBe('/app/patrimoine/actifs');
        expect(taxSuggestionPath({ code: 'asset.cashAndSecurities', source: 'statement' })).toBeNull();
        expect(taxSuggestionPath({ code: 'income.employed' })).toBeNull();
    });

    it('ouvre la fiche de ce qui compose la proposition, un choix par élément quand il y en a plusieurs', () => {
        expect(
            taxSuggestionTargets({ code: 'income.employed', source: 'recurringIncome', sources: [{ publicId: 'RIN1', name: 'Salaire' }] })
        ).toEqual([{ name: 'Salaire', path: '/app/finances/recurrences/revenus/RIN1' }]);
        const debts = taxSuggestionTargets({
            code: 'liability.debts',
            source: 'liability',
            sources: [
                { publicId: 'L1', name: 'Hypothèque' },
                { publicId: 'L2', name: 'Leasing' }
            ]
        });
        expect(debts.map((target) => target.name)).toEqual(['Hypothèque', 'Leasing']);
        expect(debts[0].path).toContain('/patrimoine/dettes/L1');
        expect(
            taxSuggestionTargets({ code: 'asset.property', source: 'asset', sources: [{ publicId: 'A1', name: 'Appartement' }] })[0].path
        ).toContain('/patrimoine/immobilier/A1');
        expect(
            taxSuggestionTargets({ code: 'asset.crypto', source: 'asset', sources: [{ publicId: 'A2', name: 'Bitcoin' }] })[0].path
        ).toContain('/patrimoine/actifs/A2');
    });

    it('ouvre la page des comptes avec le compte mis en avant pour un solde au 31.12', () => {
        expect(taxSuggestionPath({ code: 'asset.cashAndSecurities', source: 'account' })).toBe('/app/finances/comptes');
        const accounts = taxSuggestionTargets({
            code: 'asset.cashAndSecurities',
            source: 'account',
            sources: [
                { publicId: 'ACC1', name: 'Compte courant' },
                { publicId: 'ACC 2', name: 'Épargne' }
            ]
        });
        expect(accounts).toEqual([
            { name: 'Compte courant', path: '/app/finances/comptes?account=ACC1' },
            { name: 'Épargne', path: '/app/finances/comptes?account=ACC%202' }
        ]);
    });

    it('retombe sur la page de liste sans détail, et ne propose rien pour un relevé importé', () => {
        expect(taxSuggestionTargets({ code: 'liability.debts', source: 'liability' })).toEqual([
            { name: '', path: '/app/patrimoine/dettes' }
        ]);
        expect(taxSuggestionTargets({ code: 'asset.cashAndSecurities', source: 'statement', sources: [] })).toEqual([]);
    });
});
