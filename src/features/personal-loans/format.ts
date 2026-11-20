import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    LOAN_DIRECTIONS,
    LOAN_STATUSES,
    PERSONAL_LOAN_CURRENCIES,
    type ListPersonalLoansQuery,
    type LoanDirection,
    type LoanStatus,
    type PersonalLoan,
    type PersonalLoanCurrency
} from '@/features/personal-loans/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valeur de query `status` qui lève le filtre de statut (défaut UI = `active`). */
export const LOAN_STATUS_ALL = 'all';

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function isLoanDirection(value: unknown): value is LoanDirection {
    return typeof value === 'string' && LOAN_DIRECTIONS.includes(value as LoanDirection);
}

export function isLoanStatus(value: unknown): value is LoanStatus {
    return typeof value === 'string' && LOAN_STATUSES.includes(value as LoanStatus);
}

export function isPersonalLoanCurrency(value: unknown): value is PersonalLoanCurrency {
    return typeof value === 'string' && PERSONAL_LOAN_CURRENCIES.includes(value as PersonalLoanCurrency);
}

export function formatPersonalLoanAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export function formatPercentRepaid(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(value)} %`;
}

/** Barre UI bornée 0–100. */
export function personalLoanBarWidth(loan: Pick<PersonalLoan, 'percentRepaid'>): number {
    return Math.min(100, Math.max(0, loan.percentRepaid));
}

/** Libellé, contrepartie et notes. */
export function matchesPersonalLoanSearch(loan: Pick<PersonalLoan, 'label' | 'counterpartName' | 'notes'>, needle: string): boolean {
    return matchesSearchTokens(`${loan.label ?? ''} ${loan.counterpartName ?? ''} ${loan.notes ?? ''}`, needle);
}

export function queryMatchesPersonalLoan(query: ListPersonalLoansQuery, loan: PersonalLoan): boolean {
    if (query.status && loan.status !== query.status) return false;
    if (query.direction && loan.direction !== query.direction) return false;
    return true;
}

export function normalizeListQuery(query: ListPersonalLoansQuery = {}): {
    status: LoanStatus | null;
    direction: LoanDirection | null;
} {
    return {
        status: isLoanStatus(query.status) ? query.status : null,
        direction: isLoanDirection(query.direction) ? query.direction : null
    };
}

/** Sécurise les nombres et les champs nullable d’une réponse API. */
export function normalizePersonalLoan(loan: PersonalLoan): PersonalLoan {
    const initialAmount = Number(loan.initialAmount) || 0;
    const remainingAmount = Number(loan.remainingAmount) || 0;
    const repaid = loan.repaidAmount == null ? initialAmount - remainingAmount : Number(loan.repaidAmount) || 0;
    const percent = loan.percentRepaid == null ? (initialAmount > 0 ? (repaid / initialAmount) * 100 : 0) : Number(loan.percentRepaid) || 0;
    return {
        ...loan,
        counterpartTierPublicId: loan.counterpartTierPublicId ?? null,
        counterpartName: loan.counterpartName ?? null,
        label: loan.label ?? null,
        initialAmount,
        remainingAmount,
        repaidAmount: repaid,
        percentRepaid: percent,
        startDate: loan.startDate ?? null,
        plannedEndDate: loan.plannedEndDate ?? null,
        isOverdue: !!loan.isOverdue,
        notes: loan.notes ?? null,
        updatedAt: loan.updatedAt ?? null
    };
}
