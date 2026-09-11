import { describe, expect, it } from 'vitest';
import { findExactSelectItem, findSelectCompletion } from '@/components/shared/select/select-completion';

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
