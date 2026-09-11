import { describe, expect, it } from 'vitest';
import { displayDueStatus, groupDuesForDetail, isDueOpen, sortUpcomingDueRows, todayLocalYmd } from '@/features/recurring-payments/format';

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

    it('trie les échéances à venir par date, nom ou montant', () => {
        const rows = [
            { templateName: 'Loyer', due: { scheduledAt: '2026-10-01', plannedAmount: 1500, publicId: 'a' } },
            { templateName: 'Salaire', due: { scheduledAt: '2026-09-25', plannedAmount: 5000, publicId: 'b' } }
        ];
        expect(sortUpcomingDueRows(rows, 'dateAsc').map((row) => row.templateName)).toEqual(['Salaire', 'Loyer']);
        expect(sortUpcomingDueRows(rows, 'dateDesc').map((row) => row.templateName)).toEqual(['Loyer', 'Salaire']);
        expect(sortUpcomingDueRows(rows, 'amountDesc')[0]?.templateName).toBe('Salaire');
        expect(sortUpcomingDueRows(rows, 'nameAsc')[0]?.templateName).toBe('Loyer');
    });

    it('sépare les dues liées à une transaction des échéances à venir', () => {
        const grouped = groupDuesForDetail([
            { publicId: 'd1', scheduledAt: '2026-09-01', plannedAmount: 10, actualAmount: 10, status: 'payee', transactionPublicId: 'tx-1', notes: null },
            { publicId: 'd2', scheduledAt: '2026-10-01', plannedAmount: 10, actualAmount: null, status: 'prevue', transactionPublicId: null, notes: null },
            { publicId: 'd0', scheduledAt: '2026-08-01', plannedAmount: 10, actualAmount: 10, status: 'payee', transactionPublicId: 'tx-0', notes: null }
        ]);
        expect(grouped.existing.map((due) => due.publicId)).toEqual(['d1', 'd0']);
        expect(grouped.upcoming.map((due) => due.publicId)).toEqual(['d2']);
    });
});
