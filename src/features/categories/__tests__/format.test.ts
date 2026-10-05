import { describe, expect, it } from 'vitest';
import {
    compatibleParentCandidates,
    findCategoryInTree,
    flattenCategories,
    normalizeColor,
    removeCategoryFromTree,
    sortCategoryTree,
    upsertCategoryInTree
} from '@/features/categories/format';
import type { Category } from '@/features/categories/types';

function category(partial: Partial<Category> = {}): Category {
    return {
        publicId: 'cat-1',
        name: 'Logement',
        type: 'depense',
        color: '#2a9d8f',
        icone: 'home',
        parentPublicId: null,
        createdAt: '2026-09-07T14:32:10+02:00',
        updatedAt: null,
        children: [],
        ...partial
    };
}

describe('categories format', () => {
    it('normalise une couleur hex et refuse le reste', () => {
        expect(normalizeColor('#2A9D8F')).toBe('#2a9d8f');
        expect(normalizeColor('#abc')).toBe('#abc');
        expect(normalizeColor('  ')).toBeNull();
        expect(normalizeColor('#zzzzzz')).toBeNull();
    });

    it('trie alphabétiquement aux deux niveaux', () => {
        const tree = sortCategoryTree([
            category({
                publicId: 'b',
                name: 'Voyage',
                children: [
                    category({ publicId: 'b1', name: 'Train', parentPublicId: 'b' }),
                    category({ publicId: 'b2', name: 'Avion', parentPublicId: 'b' })
                ]
            }),
            category({ publicId: 'a', name: 'Alimentation' })
        ]);
        expect(tree.map((item) => item.name)).toEqual(['Alimentation', 'Voyage']);
        expect(tree[1]?.children.map((item) => item.name)).toEqual(['Avion', 'Train']);
    });

    it('aplatit racines + enfants et retrouve par publicId', () => {
        const tree = [
            category({
                children: [category({ publicId: 'cat-2', name: 'Loyer', parentPublicId: 'cat-1' })]
            })
        ];
        expect(flattenCategories(tree).map((item) => item.publicId)).toEqual(['cat-1', 'cat-2']);
        expect(findCategoryInTree(tree, 'cat-2')?.name).toBe('Loyer');
    });

    it('filtre les parents compatibles et upsert / retire dans l’arbre', () => {
        const tree = [
            category({ publicId: 'mix', name: 'Divers', type: 'mixte' }),
            category({ publicId: 'rev', name: 'Revenus', type: 'revenu' }),
            category({ publicId: 'dep', name: 'Maison', type: 'depense' })
        ];
        expect(compatibleParentCandidates(tree, 'depense').map((item) => item.publicId)).toEqual(['mix', 'dep']);

        const withChild = upsertCategoryInTree(tree, category({ publicId: 'child', name: 'Loyer', parentPublicId: 'dep' }));
        expect(findCategoryInTree(withChild, 'dep')?.children.map((item) => item.publicId)).toEqual(['child']);

        const detached = upsertCategoryInTree(withChild, category({ publicId: 'child', name: 'Loyer', parentPublicId: null }));
        expect(findCategoryInTree(detached, 'child')?.parentPublicId).toBeNull();
        expect(removeCategoryFromTree(detached, 'child').some((item) => item.publicId === 'child')).toBe(false);
    });
});
