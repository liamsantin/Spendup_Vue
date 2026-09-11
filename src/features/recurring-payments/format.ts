import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    RECURRING_EXPENSE_OPEN_DUE_STATUSES,
    RECURRING_INCOME_OPEN_DUE_STATUSES,
    type RecurringDue,
    type RecurringExpense,
    type RecurringIncome,
    type RecurringKind
} from '@/features/recurring-payments/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

/** Aujourd’hui dans le fuseau local (`YYYY-MM-DD`). */
export function todayLocalYmd(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isDateInFutureLocal(ymd: string, now = new Date()): boolean {
    if (!isValidYmd(ymd)) return false;
    return ymd.trim() > todayLocalYmd(now);
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function formatPlannedAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export function isExpenseTemplate(item: RecurringExpense | RecurringIncome): item is RecurringExpense {
    return 'expenseType' in item;
}

export function displayDueStatus(due: Pick<RecurringDue, 'status' | 'scheduledAt'>, kind: RecurringKind, now = new Date()): string {
    const status = due.status?.trim() || '';
    const closed =
        kind === 'expense'
            ? status === 'payee' || status === 'canceled'
            : status === 'encaisse' || status === 'annule' || status === 'partiel';
    if (closed) return status;
    if (isValidYmd(due.scheduledAt) && due.scheduledAt.trim() < todayLocalYmd(now)) {
        return kind === 'expense' ? 'enRetard' : 'retard';
    }
    return status;
}

export function isDueOpen(
    due: Pick<RecurringDue, 'status' | 'scheduledAt' | 'transactionPublicId'>,
    kind: RecurringKind,
    now = new Date()
): boolean {
    if (due.transactionPublicId) return false;
    const status = displayDueStatus(due, kind, now);
    if (kind === 'expense') {
        return (RECURRING_EXPENSE_OPEN_DUE_STATUSES as readonly string[]).includes(status);
    }
    return (RECURRING_INCOME_OPEN_DUE_STATUSES as readonly string[]).includes(status);
}

export function isDueSettled(due: Pick<RecurringDue, 'status' | 'transactionPublicId'>, kind: RecurringKind): boolean {
    if (due.transactionPublicId) return true;
    return kind === 'expense' ? due.status === 'payee' : due.status === 'encaisse';
}

export function sortTemplates<T extends { nextDueDate: string | null; name: string }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => {
        const aDue = a.nextDueDate ?? '9999-12-31';
        const bDue = b.nextDueDate ?? '9999-12-31';
        if (aDue !== bDue) return aDue.localeCompare(bDue);
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export function sortDues(items: readonly RecurringDue[]): RecurringDue[] {
    return [...items].sort((a, b) => {
        if (a.scheduledAt !== b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
        return a.publicId.localeCompare(b.publicId);
    });
}

export function addMonthsYmd(ymd: string, months: number): string {
    if (!isValidYmd(ymd)) return ymd;
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1 + months, d);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
