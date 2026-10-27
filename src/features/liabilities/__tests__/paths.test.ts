import { describe, expect, it } from 'vitest';
import {
    DEBTS_PATHS,
    debtsPathForTab,
    debtsTabFromPath,
    liabilityDetailPath,
    liabilityPublicIdFromPath,
    personalLoanDetailPath,
    personalLoanPublicIdFromPath,
    sharedDebtDetailPath,
    sharedDebtPublicIdFromPath
} from '@/features/liabilities/paths';

describe('liabilities paths', () => {
    it('associe un chemin à chaque onglet', () => {
        expect(DEBTS_PATHS.liabilities).toBe('/app/patrimoine/dettes');
        expect(debtsPathForTab('liabilities')).toBe('/app/patrimoine/dettes');
        expect(debtsPathForTab('loans')).toBe('/app/patrimoine/dettes/prets');
        expect(debtsPathForTab('shared')).toBe('/app/patrimoine/dettes/amis');
    });

    it('déduit l’onglet du chemin', () => {
        expect(debtsTabFromPath('/app/patrimoine/dettes')).toBe('liabilities');
        expect(debtsTabFromPath('/app/patrimoine/dettes/guid-1')).toBe('liabilities');
        expect(debtsTabFromPath('/app/patrimoine/dettes/prets')).toBe('loans');
        expect(debtsTabFromPath('/app/patrimoine/dettes/prets/guid-2')).toBe('loans');
        expect(debtsTabFromPath('/app/patrimoine/dettes/amis')).toBe('shared');
        expect(debtsTabFromPath('/app/patrimoine/dettes/amis/guid-3')).toBe('shared');
        expect(debtsTabFromPath('/app/patrimoine/dettes/pretsX')).toBe('liabilities');
    });

    it('relit le publicId d’un passif sans confondre prets / amis', () => {
        expect(liabilityDetailPath('guid-1')).toBe('/app/patrimoine/dettes/guid-1');
        expect(liabilityDetailPath('  ')).toBe('/app/patrimoine/dettes');
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes')).toBeNull();
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/guid-1')).toBe('guid-1');
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/guid-1?x=1')).toBe('guid-1');
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/prets')).toBeNull();
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/prets/guid-2')).toBeNull();
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/amis')).toBeNull();
        expect(liabilityPublicIdFromPath('/app/patrimoine/dettes/amis/guid-3')).toBeNull();
    });

    it('construit et relit le détail d’un prêt et d’une dette entre amis', () => {
        expect(personalLoanDetailPath('guid-2')).toBe('/app/patrimoine/dettes/prets/guid-2');
        expect(personalLoanPublicIdFromPath('/app/patrimoine/dettes/prets')).toBeNull();
        expect(personalLoanPublicIdFromPath('/app/patrimoine/dettes/prets/guid-2')).toBe('guid-2');
        expect(sharedDebtDetailPath('guid-3')).toBe('/app/patrimoine/dettes/amis/guid-3');
        expect(sharedDebtPublicIdFromPath('/app/patrimoine/dettes/amis/guid-3')).toBe('guid-3');
        expect(sharedDebtPublicIdFromPath('/app/patrimoine/dettes/prets/guid-2')).toBeNull();
    });
});
