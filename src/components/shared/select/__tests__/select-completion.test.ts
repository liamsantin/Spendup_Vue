import { describe, expect, it } from 'vitest';
import { findExactSelectItem, findSelectCompletion, selectCreateMode } from '@/components/shared/select/select-completion';

const items = [
    { title: 'Tous les comptes', value: '' },
    { title: 'Courant', value: 'acc-1' },
    { title: 'Charge · Loyer', value: 'expense:re-1' },
    { title: '↳ Courses', value: 'cat-2' }
];

describe('findSelectCompletion', () => {
    it('complète un préfixe insensible à la casse', () => {
        expect(findSelectCompletion(items, 'cou')).toEqual({ title: 'Courant', value: 'acc-1', ghost: 'rant' });
    });

    it('complète le nom après « · »', () => {
        expect(findSelectCompletion(items, 'Loy')).toEqual({ title: 'Charge · Loyer', value: 'expense:re-1', ghost: 'er' });
    });

    it('ignore le préfixe ↳', () => {
        expect(findSelectCompletion(items, 'Cou')).toEqual({ title: 'Courant', value: 'acc-1', ghost: 'rant' });
        expect(findSelectCompletion(items, 'Cours')).toEqual({ title: '↳ Courses', value: 'cat-2', ghost: 'es' });
    });

    it('ne propose rien si le libellé est déjà complet', () => {
        expect(findSelectCompletion(items, 'Courant')).toBeNull();
    });
});

describe('findExactSelectItem', () => {
    it('retrouve un libellé exact ou un segment', () => {
        expect(findExactSelectItem(items, 'courant')?.value).toBe('acc-1');
        expect(findExactSelectItem(items, 'loyer')?.value).toBe('expense:re-1');
    });
});

describe('selectCreateMode', () => {
    it('masque le + si la création n’est pas activée', () => {
        expect(selectCreateMode({ enabled: false, query: '', selectedTitle: '', hasExactMatch: false })).toBeNull();
    });

    it('propose « Nouveau » à l’ouverture même si le champ reprend la valeur sélectionnée', () => {
        expect(
            selectCreateMode({ enabled: true, query: 'Alimentation', selectedTitle: 'Alimentation', hasExactMatch: true })
        ).toBe('blank');
        expect(selectCreateMode({ enabled: true, query: '', selectedTitle: '', hasExactMatch: false })).toBe('blank');
    });

    it('propose « Créer nom » seulement pour une recherche sans égal exact', () => {
        expect(
            selectCreateMode({ enabled: true, query: 'Courses', selectedTitle: 'Alimentation', hasExactMatch: false })
        ).toBe('named');
        expect(
            selectCreateMode({ enabled: true, query: 'Alimentation', selectedTitle: 'Aucun', hasExactMatch: true })
        ).toBe('blank');
    });
});
