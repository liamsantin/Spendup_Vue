import { describe, expect, it } from 'vitest';
import {
    clearPendingRead,
    dismissReadReport,
    forgetPendingRead,
    isImportedReturn,
    markImportedReturn,
    stashPendingRead,
    takePendingRead
} from '@/features/tax/pending-read';
import type { TaxSuggestion } from '@/features/tax/types';

const item = (code: string, competence: TaxSuggestion['competence'] = 'both'): TaxSuggestion => ({
    code,
    label: code,
    person: '1',
    competence,
    amount: 100,
    currency: 'CHF',
    originLabel: 'PDF'
});

const read = (items: TaxSuggestion[]) => ({ profileLabel: 'JuraTax 2025', items, totals: [], unmapped: [] });

describe('pending-read', () => {
    it('garde les montants lus après plusieurs ouvertures (rechargement)', () => {
        stashPendingRead('t1', read([item('income.employed'), item('deduction.donations')]), 'ok');
        expect(takePendingRead('t1').notice).toBe('ok');
        const again = takePendingRead('t1');
        expect(again.notice).toBeNull();
        expect(again.items).toHaveLength(2);
        expect(again.report?.profileLabel).toBe('JuraTax 2025');
    });

    it('ferme le panneau sans perdre les propositions', () => {
        stashPendingRead('t4', read([item('income.employed')]), '');
        dismissReadReport('t4');
        const after = takePendingRead('t4');
        expect(after.report).toBeNull();
        expect(after.items).toHaveLength(1);
    });

    it('oublie un montant accepté puis tout à la suppression', () => {
        stashPendingRead('t2', read([item('income.employed'), item('deduction.donations')]), '');
        forgetPendingRead('t2', 'income.employed', 'both');
        expect(takePendingRead('t2').items.map((i) => i.code)).toEqual(['deduction.donations']);
        clearPendingRead('t2');
        expect(takePendingRead('t2').items).toEqual([]);
    });
});

describe('déclaration importée', () => {
    it('est marquée puis oubliée à la suppression', () => {
        expect(isImportedReturn('t3')).toBe(false);
        markImportedReturn('t3');
        expect(isImportedReturn('t3')).toBe(true);
        clearPendingRead('t3');
        expect(isImportedReturn('t3')).toBe(false);
    });
});
