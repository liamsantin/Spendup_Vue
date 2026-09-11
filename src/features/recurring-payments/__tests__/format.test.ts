import { describe, expect, it } from 'vitest';
import { displayDueStatus, isDueOpen, todayLocalYmd } from '@/features/recurring-payments/format';

describe('recurring format', () => {
    it('marque en retard une due prévue dont la date est passée', () => {
        expect(displayDueStatus({ status: 'prevue', scheduledAt: '2020-01-01', transactionPublicId: null }, 'expense', new Date('2026-09-11'))).toBe(
            'enRetard'
        );
        expect(displayDueStatus({ status: 'prevu', scheduledAt: '2020-01-01', transactionPublicId: null }, 'income', new Date('2026-09-11'))).toBe(
            'retard'
        );
    });

    it('laisse payée / encaissée inchangée si la transaction existe encore', () => {
        expect(
            displayDueStatus({ status: 'payee', scheduledAt: '2020-01-01', transactionPublicId: 'tx-1' }, 'expense')
        ).toBe('payee');
        expect(
            displayDueStatus({ status: 'encaisse', scheduledAt: '2020-01-01', transactionPublicId: 'tx-1' }, 'income')
        ).toBe('encaisse');
    });

    it('rouvre une due payée dont la transaction a disparu', () => {
        expect(displayDueStatus({ status: 'payee', scheduledAt: todayLocalYmd(), transactionPublicId: null }, 'expense')).toBe('prevue');
        expect(isDueOpen({ status: 'payee', scheduledAt: todayLocalYmd(), transactionPublicId: null }, 'expense')).toBe(true);
        expect(isDueOpen({ status: 'payee', scheduledAt: todayLocalYmd(), transactionPublicId: 'tx-1' }, 'expense')).toBe(false);
    });

    it('détecte une due confirmable', () => {
        expect(isDueOpen({ status: 'prevue', scheduledAt: todayLocalYmd(), transactionPublicId: null }, 'expense')).toBe(true);
        expect(isDueOpen({ status: 'payee', scheduledAt: todayLocalYmd(), transactionPublicId: 'tx-1' }, 'expense')).toBe(false);
    });
});
