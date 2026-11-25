import { describe, expect, it } from 'vitest';
import { countByLayer, filterByLayers, newSourceKeys } from '@/features/calendar/layers';
import type { CalendarOccurrence } from '@/features/calendar/types';

const occ = (id: string, sourceKey: string | null) => ({ id, sourceKey }) as CalendarOccurrence;
const items = [occ('a', null), occ('b', 'recurringExpense'), occ('c', 'recurringExpense'), occ('d', 'savingsGoal')];

describe('layers', () => {
    it('masque les couches choisies', () => {
        expect(filterByLayers(items, new Set(['recurringExpense'])).map((o) => o.id)).toEqual(['a', 'd']);
        expect(filterByLayers(items, new Set())).toHaveLength(4);
    });
    it('compte par couche, 0 pour les vides', () => {
        const counts = countByLayer(items);
        expect(counts.get('events')).toBe(1);
        expect(counts.get('recurringExpense')).toBe(2);
        expect(counts.get('liability')).toBe(0);
    });
});

describe('newSourceKeys', () => {
    const sources = [
        { key: 'recurringExpense', isEnabled: true },
        { key: 'taxInstallment', isEnabled: false },
        { key: 'transactions', isEnabled: false }
    ];

    it('ne propose rien à la première visite', () => {
        expect(newSourceKeys(null, sources)).toEqual([]);
    });

    it('propose les sources inconnues et désactivées', () => {
        expect(newSourceKeys(['recurringExpense'], sources)).toEqual(['taxInstallment', 'transactions']);
        expect(newSourceKeys(['recurringExpense', 'taxInstallment'], sources)).toEqual(['transactions']);
    });

    it('ignore une source nouvelle déjà activée', () => {
        expect(newSourceKeys([], [{ key: 'transactions', isEnabled: true }])).toEqual([]);
    });
});
