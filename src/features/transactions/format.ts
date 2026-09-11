import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';
import type { MovementSens, Transaction, TransactionFile, TransactionMovement, TransactionType } from '@/features/transactions/types';
import { TRANSACTION_FILES_MAX } from '@/features/transactions/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/** Aujourd’hui en calendrier UTC (`YYYY-MM-DD`) — bornes serveur. */
export function todayUtcYmd(now = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isOperationDateInFutureUtc(ymd: string, now = new Date()): boolean {
    if (!isValidYmd(ymd)) return false;
    return ymd.trim() > todayUtcYmd(now);
}

/**
 * Date calendaire sans conversion de fuseau (midi UTC pour l’affichage).
 */
export function formatOperationDate(value: string, locale?: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) {
        const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
        return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
    }
    return value;
}

export function movementForAccount(
    transaction: Pick<Transaction, 'movements'>,
    accountPublicId: string | null | undefined
): TransactionMovement | undefined {
    const id = accountPublicId?.trim();
    if (!id) return transaction.movements[0];
    return transaction.movements.find((m) => m.accountPublicId === id) ?? transaction.movements[0];
}

export function sourceAccountPublicId(transaction: Pick<Transaction, 'type' | 'movements'>): string | null {
    const debit = transaction.movements.find((m) => m.sens === 'debit');
    if (debit) return debit.accountPublicId;
    return transaction.movements[0]?.accountPublicId ?? null;
}

export function targetAccountPublicId(transaction: Pick<Transaction, 'type' | 'movements'>): string | null {
    if (transaction.type !== 'transfert') return null;
    const credit = transaction.movements.find((m) => m.sens === 'credit');
    return credit?.accountPublicId ?? transaction.movements[1]?.accountPublicId ?? null;
}

export function involvedAccountPublicIds(transaction: Pick<Transaction, 'movements'>): string[] {
    const ids: string[] = [];
    for (const movement of transaction.movements) {
        if (!ids.includes(movement.accountPublicId)) ids.push(movement.accountPublicId);
    }
    return ids;
}

/**
 * Montant à afficher : masqué → `—` (jamais `0` / `NaN`).
 */
export function resolveTransactionAmountDisplay(
    amount: number | null | undefined,
    currency: string,
    locale?: string
): { text: string; hidden: boolean } {
    if (amount == null) {
        return { text: '—', hidden: true };
    }
    return { text: formatAccountBalance(amount, currency as Currency, locale), hidden: false };
}

/** Signe d’affichage pour un relevé de compte : débit négatif, crédit positif. */
export function signedAmountForSens(amount: number | null, sens: MovementSens | undefined): number | null {
    if (amount == null || !sens) return amount ?? null;
    return sens === 'debit' ? -Math.abs(amount) : Math.abs(amount);
}

export const TRANSACTION_SORTS = ['dateDesc', 'dateAsc', 'labelAsc', 'labelDesc', 'amountDesc', 'amountAsc'] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];
export const TRANSACTION_SORT_DEFAULT: TransactionSort = 'dateDesc';

export function isTransactionSort(value: string | null | undefined): value is TransactionSort {
    return !!value && (TRANSACTION_SORTS as readonly string[]).includes(value);
}

export function parseTransactionSort(value: string | null | undefined): TransactionSort {
    return isTransactionSort(value) ? value : TRANSACTION_SORT_DEFAULT;
}

function compareAmounts(a: number | null, b: number | null, direction: 1 | -1): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * direction;
}

export function sortTransactions(items: readonly Transaction[], sort: TransactionSort = TRANSACTION_SORT_DEFAULT): Transaction[] {
    return [...items].sort((a, b) => {
        const byId = a.publicId.localeCompare(b.publicId);
        if (sort === 'labelAsc') return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }) || byId;
        if (sort === 'labelDesc') return b.label.localeCompare(a.label, undefined, { sensitivity: 'base' }) || byId;
        if (sort === 'amountDesc') return compareAmounts(a.amount, b.amount, -1) || b.operationDate.localeCompare(a.operationDate) || byId;
        if (sort === 'amountAsc') return compareAmounts(a.amount, b.amount, 1) || a.operationDate.localeCompare(b.operationDate) || byId;
        if (sort === 'dateAsc') {
            if (a.operationDate !== b.operationDate) return a.operationDate.localeCompare(b.operationDate);
            return (a.createdAt || '').localeCompare(b.createdAt || '') || byId;
        }
        if (a.operationDate !== b.operationDate) return b.operationDate.localeCompare(a.operationDate);
        return (b.createdAt || '').localeCompare(a.createdAt || '') || byId;
    });
}

export type TransactionSearchHints = {
    typeLabel?: string;
    accountNames?: readonly string[];
    categoryName?: string | null;
    tierHaystack?: string | null;
    paymentMethodLabel?: string | null;
    amountText?: string | null;
};

export function matchesTransactionSearch(item: Transaction, needle: string, hints: TransactionSearchHints = {}): boolean {
    const amount = item.amount;
    const parts: Array<string | null | undefined> = [
        item.label,
        item.type,
        hints.typeLabel,
        item.currency,
        item.operationDate,
        item.valueDate,
        item.createdByDisplayName,
        amount == null ? null : String(amount),
        amount == null ? null : String(amount).replace('.', ','),
        hints.amountText,
        ...(hints.accountNames ?? []),
        hints.categoryName,
        hints.tierHaystack,
        hints.paymentMethodLabel,
        ...(item.files ?? []).map((file) => file.nameOriginal)
    ];
    return matchesSearchTokens(parts.filter((part): part is string => !!part && String(part).trim().length > 0).join(' '), needle);
}

export function normalizeTransactionFiles(value: unknown): TransactionFile[] {
    if (!Array.isArray(value)) return [];
    const files: TransactionFile[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Partial<TransactionFile>;
        const publicId = typeof item.publicId === 'string' ? item.publicId.trim() : '';
        if (!publicId) continue;
        files.push({
            publicId,
            nameOriginal: typeof item.nameOriginal === 'string' && item.nameOriginal.trim() ? item.nameOriginal : publicId,
            sizeBytes: typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes) ? item.sizeBytes : 0,
            mimeType: typeof item.mimeType === 'string' && item.mimeType.trim() ? item.mimeType : 'application/pdf'
        });
    }
    return files;
}

const AMOUNT_EPS = 0.005;

export type RecurrenceAmountTone = 'favorable' | 'unfavorable';

export type RecurrenceAmountVariance = {
    planned: number;
    actual: number;
    delta: number;
    tone: RecurrenceAmountTone;
};

/** Écart montant réel vs prévu d’une récurrence (magnitudes positives). */
export function recurrenceAmountVariance(
    actual: number | null | undefined,
    planned: number | null | undefined,
    kind: TransactionType | 'expense' | 'income'
): RecurrenceAmountVariance | null {
    if (actual == null || planned == null || !Number.isFinite(actual) || !Number.isFinite(planned)) return null;
    const delta = actual - planned;
    if (Math.abs(delta) < AMOUNT_EPS) return null;
    const isExpense = kind === 'depense' || kind === 'expense';
    const tone: RecurrenceAmountTone = delta > 0 === isExpense ? 'unfavorable' : 'favorable';
    return { planned, actual, delta, tone };
}

export function formatSignedAmountDelta(delta: number, currency: string, locale?: string): string {
    const formatted = formatAccountBalance(Math.abs(delta), currency as Currency, locale);
    return delta > 0 ? `+${formatted}` : `−${formatted}`;
}

function readDuePlannedAmount(transaction: Transaction): number | null {
    const extra = transaction as Transaction & { plannedAmount?: number | null };
    const raw = extra.duePlannedAmount ?? (transaction.source === 'recurrence' ? extra.plannedAmount : null);
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return null;
    return raw;
}

export function normalizeTransaction(transaction: Transaction, previous?: Transaction | null): Transaction {
    const source = transaction.source === 'recurrence' ? 'recurrence' : 'manuelle';
    return {
        ...transaction,
        source,
        recurringExpensePublicId: transaction.recurringExpensePublicId ?? null,
        recurringIncomePublicId: transaction.recurringIncomePublicId ?? null,
        duePublicId: transaction.duePublicId ?? null,
        duePlannedAmount: source === 'recurrence' ? (readDuePlannedAmount(transaction) ?? previous?.duePlannedAmount ?? null) : null,
        files: normalizeTransactionFiles(transaction.files)
    };
}

export function sanitizeFilePublicIds(ids: readonly string[] | null | undefined): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of ids ?? []) {
        const id = raw.trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= TRANSACTION_FILES_MAX) break;
    }
    return out;
}
