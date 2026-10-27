import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    SHARED_DEBT_CURRENCIES,
    SHARED_DEBT_DEFAULT_ROLE,
    SHARED_DEBT_ROLES,
    SHARED_DEBT_STATUSES,
    type ListSharedDebtsQuery,
    type SharedDebt,
    type SharedDebtCounterpart,
    type SharedDebtCurrency,
    type SharedDebtRole,
    type SharedDebtStatus
} from '@/features/shared-debts/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export function isSharedDebtRole(value: unknown): value is SharedDebtRole {
    return typeof value === 'string' && SHARED_DEBT_ROLES.includes(value as SharedDebtRole);
}

export function isSharedDebtStatus(value: unknown): value is SharedDebtStatus {
    return typeof value === 'string' && SHARED_DEBT_STATUSES.includes(value as SharedDebtStatus);
}

export function isSharedDebtCurrency(value: unknown): value is SharedDebtCurrency {
    return typeof value === 'string' && SHARED_DEBT_CURRENCIES.includes(value as SharedDebtCurrency);
}

/** Dette encore en cours : ni remboursée, ni annulée. */
export function isOpenSharedDebt(debt: Pick<SharedDebt, 'status'>): boolean {
    return debt.status === 'aRembourser' || debt.status === 'partiellementRemboursee';
}

/** Créancier, dette ouverte, rien encore remboursé — seule fenêtre où le PUT est accepté. */
export function canEditSharedDebt(debt: Pick<SharedDebt, 'role' | 'status' | 'repaidAmount'>): boolean {
    return debt.role === 'creditor' && isOpenSharedDebt(debt) && debt.repaidAmount === 0;
}

export function canSettleSharedDebt(debt: Pick<SharedDebt, 'role' | 'status' | 'remainingAmount'>): boolean {
    return debt.role === 'creditor' && isOpenSharedDebt(debt) && debt.remainingAmount > 0;
}

export function canCancelSharedDebt(debt: Pick<SharedDebt, 'role' | 'status'>): boolean {
    return debt.role === 'creditor' && isOpenSharedDebt(debt);
}

export function canDeleteSharedDebt(debt: Pick<SharedDebt, 'role'>): boolean {
    return debt.role === 'creditor';
}

/** Échéance passée (date civile `today` au fuseau des settings) sur une dette encore ouverte. */
export function isSharedDebtOverdue(debt: Pick<SharedDebt, 'status' | 'dueDate'>, today: string): boolean {
    if (!isOpenSharedDebt(debt) || !debt.dueDate) return false;
    return debt.dueDate < today;
}

/** Nom affiché de la contrepartie : surnom personnel → username → prénom nom → publicId. */
export function counterpartLabel(debt: Pick<SharedDebt, 'counterpart'>, nicknameMap?: ReadonlyMap<string, string> | null): string {
    const user: SharedDebtCounterpart = debt.counterpart;
    const nickname = nicknameMap?.get(user.publicId)?.trim();
    if (nickname) return nickname;
    return user.username || [user.firstName, user.name].filter(Boolean).join(' ').trim() || user.publicId;
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

export function formatSharedDebtAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

/**
 * Montant signé selon le point de vue : « +X » bleu côté créancier (on me doit),
 * « −X » noir côté débiteur (je dois). Vrai signe moins U+2212.
 */
export function formatSignedSharedDebtAmount(amount: number, role: SharedDebtRole, currency: string, locale?: string): string {
    const base = formatSharedDebtAmount(Math.abs(amount), currency, locale);
    if (amount === 0) return base;
    return role === 'creditor' ? `+${base}` : `−${base}`;
}

export function matchesSharedDebtSearch(
    debt: Pick<SharedDebt, 'label' | 'counterpart'>,
    needle: string,
    nicknameMap?: ReadonlyMap<string, string>
): boolean {
    const haystack = [
        debt.label,
        counterpartLabel(debt, nicknameMap),
        debt.counterpart.username ?? '',
        debt.counterpart.firstName ?? '',
        debt.counterpart.name ?? ''
    ]
        .filter(Boolean)
        .join(' ');
    return matchesSearchTokens(haystack, needle);
}

export function queryMatchesSharedDebt(query: ListSharedDebtsQuery, debt: SharedDebt): boolean {
    if (query.role && debt.role !== query.role) return false;
    if (query.status && debt.status !== query.status) return false;
    return true;
}

export function normalizeListQuery(query: ListSharedDebtsQuery = {}): { role: SharedDebtRole; status: SharedDebtStatus | null } {
    return {
        role: isSharedDebtRole(query.role) ? query.role : SHARED_DEBT_DEFAULT_ROLE,
        status: isSharedDebtStatus(query.status) ? query.status : null
    };
}

/** Sécurise les montants numériques et les nullables d’une dette renvoyée par l’API. */
export function normalizeSharedDebt(debt: SharedDebt): SharedDebt {
    const amount = Number(debt.amount) || 0;
    const repaidAmount = Number(debt.repaidAmount) || 0;
    const remaining = debt.remainingAmount == null ? amount - repaidAmount : Number(debt.remainingAmount) || 0;
    return {
        ...debt,
        amount,
        repaidAmount,
        remainingAmount: remaining,
        dueDate: debt.dueDate ?? null,
        settledAt: debt.settledAt ?? null,
        transactionPublicId: debt.transactionPublicId ?? null,
        updatedAt: debt.updatedAt ?? null,
        counterpart: {
            publicId: debt.counterpart?.publicId ?? '',
            username: debt.counterpart?.username ?? null,
            firstName: debt.counterpart?.firstName ?? null,
            name: debt.counterpart?.name ?? null,
            profilePicture: debt.counterpart?.profilePicture ?? null
        }
    };
}
