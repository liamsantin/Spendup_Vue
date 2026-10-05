import { describe, expect, it } from 'vitest';
import {
    isDuplicateTagName,
    matchesTagSearch,
    normalizeColor,
    normalizeName,
    sanitizeTagPublicIds,
    sameTagPublicIds,
    sortTags,
    withoutTagPublicId
} from '@/features/tags/format';
import type { Tag } from '@/features/tags/types';

function tag(partial: Partial<Tag> = {}): Tag {
    return {
        publicId: 't-1',
        name: 'Urgent',
        color: '#ef4444',
        transactionCount: 0,
        recurringExpenseCount: 0,
        createdAt: '2026-09-23T19:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('tags format', () => {
    it('normalise nom et couleur hex minuscule', () => {
        expect(normalizeName('  Urgent  ')).toBe('Urgent');
        expect(normalizeColor('#EF4444')).toBe('#ef4444');
        expect(normalizeColor('#abc')).toBe('#abc');
        expect(normalizeColor('red')).toBeNull();
        expect(normalizeColor('#ffff')).toBeNull();
        expect(normalizeColor('')).toBeNull();
    });

    it('détecte un doublon de nom (casse ignorée)', () => {
        const items = [tag(), tag({ publicId: 't-2', name: 'Famille' })];
        expect(isDuplicateTagName('urgent', items)).toBe(true);
        expect(isDuplicateTagName('Urgent', items, 't-1')).toBe(false);
        expect(isDuplicateTagName('Vacances', items)).toBe(false);
    });

    it('plafonne, déduplique et retire un tagPublicId', () => {
        expect(sanitizeTagPublicIds([' a ', 'a', '', 'b'])).toEqual(['a', 'b']);
        expect(sanitizeTagPublicIds(Array.from({ length: 12 }, (_, i) => `t-${i}`))).toHaveLength(10);
        expect(withoutTagPublicId(['t-1', 't-2'], 't-1')).toEqual(['t-2']);
        expect(sameTagPublicIds(['t-2', 't-1'], ['t-1', 't-2'])).toBe(true);
        expect(sameTagPublicIds(['t-1'], [])).toBe(false);
    });

    it('trie par nom puis id, filtre la recherche', () => {
        const items = [tag({ publicId: 't-b', name: 'Vacances' }), tag({ publicId: 't-a', name: 'Abonnement' })];
        expect(sortTags(items).map((item) => item.publicId)).toEqual(['t-a', 't-b']);
        expect(matchesTagSearch(tag(), 'urg')).toBe(true);
        expect(matchesTagSearch(tag(), 'xyz')).toBe(false);
    });
});
