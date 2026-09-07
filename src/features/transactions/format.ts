import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import type { MovementSens, Transaction, TransactionMovement } from '@/features/transactions/types';

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

export function sortTransactions(items: readonly Transaction[]): Transaction[] {
    return [...items].sort((a, b) => {
        if (a.operationDate !== b.operationDate) return b.operationDate.localeCompare(a.operationDate);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
}
