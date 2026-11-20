import { describe, expect, it } from 'vitest';
import { isImportedTransaction } from '@/features/transactions/delete-warning';

describe('avertissement de suppression d’une opération importée', () => {
    it('ne vise que les opérations venant d’un import', () => {
        expect(isImportedTransaction({ source: 'import' })).toBe(true);
        expect(isImportedTransaction({ source: 'manuelle' })).toBe(false);
        expect(isImportedTransaction({ source: 'recurrence' })).toBe(false);
        expect(isImportedTransaction(null)).toBe(false);
        expect(isImportedTransaction(undefined)).toBe(false);
    });
});
