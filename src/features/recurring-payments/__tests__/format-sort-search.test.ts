import { describe, expect, it } from 'vitest';
import {
    TEMPLATE_SORT_DEFAULT,
    matchesRecurringSearch,
    parseTemplateSort,
    sortTemplatesBy,
    sortUpcomingDueRows
} from '@/features/recurring-payments/format';

const templates = [
    { name: 'Loyer', nextDueDate: '2026-10-01', plannedAmount: 1500 },
    { name: 'Assurance', nextDueDate: null, plannedAmount: 80 },
    { name: 'Électricité', nextDueDate: '2026-09-25', plannedAmount: 120 }
];

describe('recurring sort & search', () => {
    it('trie les modèles par prochaine échéance par défaut, sans date en dernier', () => {
        expect(sortTemplatesBy(templates, TEMPLATE_SORT_DEFAULT).map((item) => item.name)).toEqual(['Électricité', 'Loyer', 'Assurance']);
    });

    it('trie les modèles par nom et par montant dans les deux sens', () => {
        expect(sortTemplatesBy(templates, 'nameAsc').map((item) => item.name)).toEqual(['Assurance', 'Électricité', 'Loyer']);
        expect(sortTemplatesBy(templates, 'nameDesc').map((item) => item.name)).toEqual(['Loyer', 'Électricité', 'Assurance']);
        expect(sortTemplatesBy(templates, 'amountDesc').map((item) => item.plannedAmount)).toEqual([1500, 120, 80]);
        expect(sortTemplatesBy(templates, 'amountAsc').map((item) => item.plannedAmount)).toEqual([80, 120, 1500]);
    });

    it('retombe sur le tri par défaut pour une valeur inconnue', () => {
        expect(parseTemplateSort('nope')).toBe(TEMPLATE_SORT_DEFAULT);
        expect(parseTemplateSort('amountAsc')).toBe('amountAsc');
    });

    it('trie les échéances par nom décroissant', () => {
        const rows = [
            { templateName: 'Assurance', due: { scheduledAt: '2026-10-01', plannedAmount: 1, publicId: 'a' } },
            { templateName: 'Loyer', due: { scheduledAt: '2026-10-01', plannedAmount: 1, publicId: 'b' } }
        ];
        expect(sortUpcomingDueRows(rows, 'nameDesc').map((row) => row.templateName)).toEqual(['Loyer', 'Assurance']);
    });

    it('cherche sans tenir compte de la casse ni des accents', () => {
        expect(matchesRecurringSearch('electri', 'Électricité')).toBe(true);
        expect(matchesRecurringSearch('UBS', 'Loyer', 'Compte UBS')).toBe(true);
        expect(matchesRecurringSearch('netflix', 'Loyer', null)).toBe(false);
        expect(matchesRecurringSearch('  ', 'Loyer')).toBe(true);
    });
});
