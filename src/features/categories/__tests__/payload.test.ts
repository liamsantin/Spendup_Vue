import { describe, expect, it } from 'vitest';
import {
    buildCreateCategoryPayload,
    buildUpdateCategoryPayload,
    isCategoryFormDirty,
    isDuplicateName,
    type CategoryFormFields
} from '@/features/categories/payload';
import type { Category } from '@/features/categories/types';

function fields(partial: Partial<CategoryFormFields> = {}): CategoryFormFields {
    return {
        name: 'Logement',
        type: 'depense',
        color: '#2A9D8F',
        icone: 'home',
        parentPublicId: '',
        ...partial
    };
}

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

const tree: Category[] = [
    category({
        children: [category({ publicId: 'cat-2', name: 'Loyer', parentPublicId: 'cat-1' })]
    }),
    category({ publicId: 'cat-3', name: 'Salaire', type: 'revenu', color: null, icone: null })
];

describe('category payload', () => {
    it('trim le nom et normalise la couleur en minuscules à la création', () => {
        const result = buildCreateCategoryPayload(fields({ name: '  Logement  ', color: '#2A9D8F' }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.name).toBe('Logement');
            expect(result.payload.color).toBe('#2a9d8f');
            expect(result.payload.icone).toBe('home');
            expect(result.payload.parentPublicId).toBeUndefined();
        }
    });

    it('PUT envoie null pour vider couleur, icône et parent', () => {
        const result = buildUpdateCategoryPayload(fields({ name: 'Loyer', color: '', icone: '', parentPublicId: '' }), tree, 'cat-2');
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({
                name: 'Loyer',
                type: 'depense',
                color: null,
                icone: null,
                parentPublicId: null
            });
        }
    });

    it('refuse un nom vide, trop long ou dupliqué (casse ignorée, même type et parent)', () => {
        expect(buildCreateCategoryPayload(fields({ name: '   ' }))).toMatchObject({ ok: false, code: 'nameRequired' });
        expect(buildCreateCategoryPayload(fields({ name: 'x'.repeat(151) }))).toMatchObject({ ok: false, code: 'nameTooLong' });
        expect(isDuplicateName('logement', 'depense', null, tree)).toBe(true);
        expect(isDuplicateName('logement', 'revenu', null, tree)).toBe(false);
        expect(buildCreateCategoryPayload(fields({ name: 'LOGEMENT' }), tree)).toMatchObject({
            ok: false,
            code: 'nameDuplicate'
        });
    });

    it('refuse une couleur invalide et un parent non racine', () => {
        expect(buildCreateCategoryPayload(fields({ color: 'blue' }))).toMatchObject({ ok: false, code: 'colorInvalid' });
        expect(buildCreateCategoryPayload(fields({ parentPublicId: 'cat-2' }), tree)).toMatchObject({
            ok: false,
            code: 'parentNotRoot'
        });
        expect(buildCreateCategoryPayload(fields({ type: 'revenu', parentPublicId: 'cat-1' }), tree)).toMatchObject({
            ok: false,
            code: 'parentTypeIncompatible'
        });
    });

    it('détecte le dirty d’édition en ignorant la casse de la couleur', () => {
        const current = category();
        expect(isCategoryFormDirty(current, fields({ color: '#2A9D8F' }))).toBe(false);
        expect(isCategoryFormDirty(current, fields({ name: 'Maison' }))).toBe(true);
    });
});
