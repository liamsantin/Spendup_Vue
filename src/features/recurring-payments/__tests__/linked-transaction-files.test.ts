import { describe, expect, it, vi } from 'vitest';
import {
    groupTransactionsWithFiles,
    listAllLinkedTransactions,
    uniqueAttachmentCount
} from '@/features/recurring-payments/linked-transaction-files';
import type { Transaction, TransactionList } from '@/features/transactions/types';

function tx(partial: Partial<Transaction> = {}): Transaction {
    return {
        publicId: 'tx-1',
        type: 'depense',
        status: 'validee',
        source: 'recurrence',
        recurringExpensePublicId: 're-1',
        recurringIncomePublicId: null,
        duePublicId: 'due-1',
        duePlannedAmount: 10,
        label: 'Loyer',
        amount: 10,
        currency: 'CHF',
        operationDate: '2026-09-07',
        valueDate: null,
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: null,
        createdByUserPublicId: 'u-1',
        createdByDisplayName: 'Liam',
        createdByPhotoUrl: null,
        createdAt: '2026-09-07T11:00:00Z',
        updatedAt: null,
        movements: [{ accountPublicId: 'a1', amount: 10, sens: 'debit' }],
        files: [],
        ...partial
    };
}

describe('linked transaction files', () => {
    it('regroupe seulement les transactions avec PDF, plus récentes d’abord', () => {
        const groups = groupTransactionsWithFiles([
            tx({
                publicId: 'old',
                operationDate: '2026-01-01',
                files: [{ publicId: 'f-old', nameOriginal: 'a.pdf', sizeBytes: 1, mimeType: 'application/pdf' }]
            }),
            tx({ publicId: 'empty', operationDate: '2026-08-01', files: [] }),
            tx({
                publicId: 'new',
                operationDate: '2026-09-01',
                files: [{ publicId: 'f-new', nameOriginal: 'b.pdf', sizeBytes: 2, mimeType: 'application/pdf' }]
            })
        ]);
        expect(groups.map((group) => group.transaction.publicId)).toEqual(['new', 'old']);
    });

    it('compte les justificatifs uniques (récurrence + transactions)', () => {
        expect(
            uniqueAttachmentCount(
                [{ publicId: 'f1' }, { publicId: 'f2' }],
                [{ publicId: 'f2' }, { publicId: 'f3' }]
            )
        ).toBe(3);
    });

    it('drain les pages liées sans hydrater si files est déjà un tableau', async () => {
        const list = vi.fn(async ({ page }: { page?: number }): Promise<TransactionList> => {
            if (page === 1) {
                return {
                    items: [tx({ publicId: 'a', files: [] })],
                    page: 1,
                    pageSize: 200,
                    totalCount: 2
                };
            }
            return {
                items: [
                    tx({
                        publicId: 'b',
                        files: [{ publicId: 'f1', nameOriginal: 'x.pdf', sizeBytes: 4, mimeType: 'application/pdf' }]
                    })
                ],
                page: 2,
                pageSize: 200,
                totalCount: 2
            };
        });
        const get = vi.fn();
        const items = await listAllLinkedTransactions({
            kind: 'expense',
            publicId: 're-1',
            list,
            get
        });
        expect(list).toHaveBeenCalledTimes(2);
        expect(list.mock.calls[0][0]).toMatchObject({ recurringExpensePublicId: 're-1', page: 1 });
        expect(get).not.toHaveBeenCalled();
        expect(items.map((item) => item.publicId)).toEqual(['a', 'b']);
    });

    it('hydrate via get si files est absent de la liste', async () => {
        const list = vi.fn(async (): Promise<TransactionList> => ({
            items: [{ ...tx({ publicId: 'a' }), files: undefined as unknown as Transaction['files'] }],
            page: 1,
            pageSize: 200,
            totalCount: 1
        }));
        const get = vi.fn(async () =>
            tx({
                publicId: 'a',
                files: [{ publicId: 'f1', nameOriginal: 'x.pdf', sizeBytes: 4, mimeType: 'application/pdf' }]
            })
        );
        const items = await listAllLinkedTransactions({
            kind: 'income',
            publicId: 'ri-1',
            list,
            get
        });
        expect(list.mock.calls[0][0]).toMatchObject({ recurringIncomePublicId: 'ri-1' });
        expect(get).toHaveBeenCalledWith('a');
        expect(items[0]?.files).toHaveLength(1);
    });
});
