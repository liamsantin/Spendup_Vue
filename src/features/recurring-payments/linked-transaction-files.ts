import { normalizeTransaction, sortTransactions } from '@/features/transactions/format';
import {
    TRANSACTION_PAGE_SIZE_MAX,
    type ListTransactionsQuery,
    type Transaction,
    type TransactionFile,
    type TransactionList
} from '@/features/transactions/types';
import type { RecurringKind } from '@/features/recurring-payments/types';

export type LinkedTxFileGroup = {
    transaction: Transaction;
    files: TransactionFile[];
};

const PAGE_GUARD = 40;

export function groupTransactionsWithFiles(transactions: Transaction[]): LinkedTxFileGroup[] {
    return sortTransactions(transactions)
        .map((transaction) => {
            const files = transaction.files ?? [];
            return { transaction, files };
        })
        .filter((group) => group.files.length > 0);
}

export function uniqueAttachmentCount(...lists: Array<Array<{ publicId: string }> | undefined>): number {
    const ids = new Set<string>();
    for (const list of lists) {
        for (const file of list ?? []) {
            const id = file.publicId?.trim();
            if (id) ids.add(id);
        }
    }
    return ids.size;
}

export async function listAllLinkedTransactions(options: {
    kind: RecurringKind;
    publicId: string;
    list: (query: ListTransactionsQuery) => Promise<TransactionList>;
    get: (publicId: string) => Promise<Transaction>;
}): Promise<Transaction[]> {
    const publicId = options.publicId.trim();
    if (!publicId) return [];

    const items: Transaction[] = [];
    let page = 1;
    const pageSize = TRANSACTION_PAGE_SIZE_MAX;
    const filter: ListTransactionsQuery =
        options.kind === 'expense' ? { recurringExpensePublicId: publicId } : { recurringIncomePublicId: publicId };

    while (page <= PAGE_GUARD) {
        const response = await options.list({ ...filter, page, pageSize });
        const batch = await Promise.all(response.items.map((item) => hydrateLinkedTransaction(item, options.get)));
        items.push(...batch);
        if (!response.items.length) break;
        const total = Number(response.totalCount);
        if (Number.isFinite(total) && items.length >= total) break;
        page += 1;
    }

    return items;
}

async function hydrateLinkedTransaction(item: Transaction, get: (publicId: string) => Promise<Transaction>): Promise<Transaction> {
    if (Array.isArray(item.files)) return normalizeTransaction(item);
    const full = await get(item.publicId);
    return normalizeTransaction(full);
}
