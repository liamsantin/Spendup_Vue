import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    LIABILITY_CURRENCIES,
    LIABILITY_STATUSES,
    LIABILITY_TYPES,
    type Liability,
    type LiabilityCurrency,
    type LiabilityStatus,
    type LiabilityType,
    type ListLiabilitiesQuery
} from '@/features/liabilities/types';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valeur de query `status` qui lève le filtre de statut (défaut UI = `active`). */
export const LIABILITY_STATUS_ALL = 'all';

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

export function isLiabilityType(value: unknown): value is LiabilityType {
    return typeof value === 'string' && LIABILITY_TYPES.includes(value as LiabilityType);
}

export function isLiabilityStatus(value: unknown): value is LiabilityStatus {
    return typeof value === 'string' && LIABILITY_STATUSES.includes(value as LiabilityStatus);
}

export function isLiabilityCurrency(value: unknown): value is LiabilityCurrency {
    return typeof value === 'string' && LIABILITY_CURRENCIES.includes(value as LiabilityCurrency);
}

export function formatLiabilityAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export function formatPercentRepaid(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(value)} %`;
}

/** Taux annuel : « 1.25 % ». */
export function formatInterestRate(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, {
        maximumFractionDigits: 3,
        minimumFractionDigits: 0
    }).format(value)} %`;
}

/** Barre UI bornée 0–100. */
export function liabilityBarWidth(liability: Pick<Liability, 'percentRepaid'>): number {
    return Math.min(100, Math.max(0, liability.percentRepaid));
}

/** Nom du passif et nom du prêteur. */
export function matchesLiabilitySearch(liability: Pick<Liability, 'name' | 'lenderTierName'>, needle: string): boolean {
    return matchesSearchTokens(`${liability.name} ${liability.lenderTierName ?? ''}`, needle);
}

export function queryMatchesLiability(query: ListLiabilitiesQuery, liability: Liability): boolean {
    if (query.type && liability.type !== query.type) return false;
    if (query.status && liability.status !== query.status) return false;
    return true;
}

export function normalizeListQuery(query: ListLiabilitiesQuery = {}): {
    type: LiabilityType | null;
    status: LiabilityStatus | null;
} {
    return {
        type: isLiabilityType(query.type) ? query.type : null,
        status: isLiabilityStatus(query.status) ? query.status : null
    };
}

/** Sécurise les nombres et les champs nullable d’une réponse API. */
export function normalizeLiability(liability: Liability): Liability {
    const initialAmount = Number(liability.initialAmount) || 0;
    const remainingAmount = Number(liability.remainingAmount) || 0;
    const repaid = liability.repaidAmount == null ? initialAmount - remainingAmount : Number(liability.repaidAmount) || 0;
    const percent =
        liability.percentRepaid == null ? (initialAmount > 0 ? (repaid / initialAmount) * 100 : 0) : Number(liability.percentRepaid) || 0;
    return {
        ...liability,
        lenderTierPublicId: liability.lenderTierPublicId ?? null,
        lenderTierName: liability.lenderTierName ?? null,
        assetPublicId: liability.assetPublicId ?? null,
        initialAmount,
        remainingAmount,
        repaidAmount: repaid,
        percentRepaid: percent,
        interestRate: liability.interestRate == null ? null : Number(liability.interestRate),
        startDate: liability.startDate ?? null,
        plannedEndDate: liability.plannedEndDate ?? null,
        updatedAt: liability.updatedAt ?? null
    };
}
