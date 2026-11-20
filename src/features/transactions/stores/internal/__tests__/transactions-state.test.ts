import { describe, expect, it } from 'vitest';
import { listCacheKey, normalizeListQuery, parseListCacheKey } from '@/features/transactions/stores/internal/transactions-state';

describe('clé de cache des listes de transactions', () => {
    it('distingue les listes par type et garde une recherche contenant « : »', () => {
        const query = normalizeListQuery({ type: 'revenu', search: 'loyer: mars', accountPublicId: 'acc-1' });
        const key = listCacheKey(query);

        expect(key).not.toBe(listCacheKey(normalizeListQuery({ search: 'loyer: mars', accountPublicId: 'acc-1' })));
        expect(parseListCacheKey(key)).toEqual(query);
    });

    it('sans type, la clé se relit sans filtre de type', () => {
        const query = normalizeListQuery({});
        expect(parseListCacheKey(listCacheKey(query))).toEqual(query);
        expect(query.type).toBeNull();
    });
});
