import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isLiabilityCurrency, isLiabilityType, isValidYmd } from '@/features/liabilities/format';
import {
    LIABILITY_NAME_MAX,
    type CreateLiabilityPayload,
    type Liability,
    type LiabilityCurrency,
    type LiabilityType,
    type SetRemainingAmountPayload,
    type UpdateLiabilityPayload
} from '@/features/liabilities/types';

export type LiabilityPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'typeInvalid'
    | 'initialAmountInvalid'
    | 'initialAmountNotPositive'
    | 'remainingAmountInvalid'
    | 'remainingAmountOutOfRange'
    | 'interestRateInvalid'
    | 'interestRateOutOfRange'
    | 'startDateInvalid'
    | 'plannedEndDateInvalid'
    | 'plannedEndDateBeforeStart'
    | 'currencyInvalid'
    | 'currencyLocked';

export type LiabilityFormFields = {
    name: string;
    type: LiabilityType | '';
    initialAmount: string;
    /** Vide à la création = égal au montant initial. */
    remainingAmount: string;
    currency: LiabilityCurrency | '';
    interestRate: string;
    startDate: string | null;
    plannedEndDate: string | null;
    lenderTierPublicId: string;
    assetPublicId: string;
    /** Édition : interrupteur « Annulé ». */
    cancel: boolean;
};

export type LiabilityRemainingAmountFields = {
    remainingAmount: string;
};

export type BuildLiabilityPayloadOk<T> = { ok: true; payload: T };
export type BuildLiabilityPayloadFail = { ok: false; code: LiabilityPayloadErrorCode; field?: string };
export type BuildLiabilityPayloadResult<T> = BuildLiabilityPayloadOk<T> | BuildLiabilityPayloadFail;

export type LiabilityPayloadContext = {
    /** Devise figée à la création — obligatoire en PUT. */
    lockedCurrency?: LiabilityCurrency | null;
};

function fail(code: LiabilityPayloadErrorCode, field?: string): BuildLiabilityPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

const RATE_RE = /^\d+([.,]\d+)?$/;

/** Taux annuel en pourcent : trois décimales max (1.125 %), `null` si illisible. */
export function parseInterestRate(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed || !RATE_RE.test(trimmed)) return null;
    const n = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return Number(n.toFixed(3));
}

export function emptyLiabilityFormFields(
    defaults: { currency?: LiabilityCurrency | ''; startDate?: string | null } = {}
): LiabilityFormFields {
    return {
        name: '',
        type: '',
        initialAmount: '',
        remainingAmount: '',
        currency: defaults.currency ?? '',
        interestRate: '',
        startDate: defaults.startDate ?? null,
        plannedEndDate: null,
        lenderTierPublicId: '',
        assetPublicId: '',
        cancel: false
    };
}

export function liabilityToFormFields(liability: Liability): LiabilityFormFields {
    return {
        name: liability.name,
        type: liability.type,
        initialAmount: String(liability.initialAmount),
        remainingAmount: String(liability.remainingAmount),
        currency: liability.currency,
        interestRate: liability.interestRate == null ? '' : String(liability.interestRate),
        startDate: liability.startDate,
        plannedEndDate: liability.plannedEndDate,
        lenderTierPublicId: liability.lenderTierPublicId ?? '',
        assetPublicId: liability.assetPublicId ?? '',
        cancel: liability.status === 'annule'
    };
}

type CommonFields =
    | BuildLiabilityPayloadFail
    | {
          ok: true;
          name: string;
          type: LiabilityType;
          initialAmount: number;
          remainingAmount: number | null;
          interestRate: number | null;
          startDate: string | null;
          plannedEndDate: string | null;
          lenderTierPublicId: string | null;
          assetPublicId: string | null;
      };

function parseRemaining(raw: string, initialAmount: number): { ok: true; value: number | null } | BuildLiabilityPayloadFail {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    const parsed = parseAccountAmount(trimmed);
    if (parsed == null) return fail('remainingAmountInvalid', 'remainingAmount');
    if (parsed < 0 || parsed > initialAmount) return fail('remainingAmountOutOfRange', 'remainingAmount');
    return { ok: true, value: parsed };
}

function commonFields(fields: LiabilityFormFields): CommonFields {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > LIABILITY_NAME_MAX) return fail('nameTooLong', 'name');

    if (!isLiabilityType(fields.type)) return fail('typeInvalid', 'type');

    const initialAmount = parseAccountAmount(fields.initialAmount);
    if (initialAmount == null) return fail('initialAmountInvalid', 'initialAmount');
    if (initialAmount <= 0) return fail('initialAmountNotPositive', 'initialAmount');

    const remaining = parseRemaining(fields.remainingAmount, initialAmount);
    if (!remaining.ok) return remaining;

    const rateRaw = fields.interestRate.trim();
    let interestRate: number | null = null;
    if (rateRaw) {
        const parsed = parseInterestRate(rateRaw);
        if (parsed == null) return fail('interestRateInvalid', 'interestRate');
        if (parsed < 0 || parsed > 100) return fail('interestRateOutOfRange', 'interestRate');
        interestRate = parsed;
    }

    const startDate = emptyToNull(fields.startDate);
    if (startDate && !isValidYmd(startDate)) return fail('startDateInvalid', 'startDate');
    const plannedEndDate = emptyToNull(fields.plannedEndDate);
    if (plannedEndDate && !isValidYmd(plannedEndDate)) return fail('plannedEndDateInvalid', 'plannedEndDate');
    if (startDate && plannedEndDate && plannedEndDate < startDate) return fail('plannedEndDateBeforeStart', 'plannedEndDate');

    return {
        ok: true,
        name,
        type: fields.type,
        initialAmount,
        remainingAmount: remaining.value,
        interestRate,
        startDate,
        plannedEndDate,
        lenderTierPublicId: emptyToNull(fields.lenderTierPublicId),
        assetPublicId: emptyToNull(fields.assetPublicId)
    };
}

export function buildCreateLiabilityPayload(fields: LiabilityFormFields): BuildLiabilityPayloadResult<CreateLiabilityPayload> {
    const common = commonFields(fields);
    if (!common.ok) return common;

    const currencyRaw = emptyToNull(fields.currency);
    let currency: LiabilityCurrency | null = null;
    if (currencyRaw) {
        if (!isLiabilityCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
        currency = currencyRaw;
    }

    return {
        ok: true,
        payload: {
            name: common.name,
            type: common.type,
            initialAmount: common.initialAmount,
            remainingAmount: common.remainingAmount,
            currency,
            interestRate: common.interestRate,
            startDate: common.startDate,
            plannedEndDate: common.plannedEndDate,
            lenderTierPublicId: common.lenderTierPublicId,
            assetPublicId: common.assetPublicId
        }
    };
}

/** PUT : restant obligatoire (vide = montant initial), devise figée, `cancel` → `status: 'annule'`. */
export function buildUpdateLiabilityPayload(
    fields: LiabilityFormFields,
    context: LiabilityPayloadContext = {}
): BuildLiabilityPayloadResult<UpdateLiabilityPayload> {
    const common = commonFields(fields);
    if (!common.ok) return common;

    const locked = context.lockedCurrency;
    if (!locked || !isLiabilityCurrency(locked)) return fail('currencyLocked', 'currency');
    const currencyRaw = emptyToNull(fields.currency);
    if (currencyRaw && currencyRaw !== locked) return fail('currencyLocked', 'currency');

    return {
        ok: true,
        payload: {
            name: common.name,
            type: common.type,
            initialAmount: common.initialAmount,
            remainingAmount: common.remainingAmount ?? common.initialAmount,
            currency: locked,
            interestRate: common.interestRate,
            startDate: common.startDate,
            plannedEndDate: common.plannedEndDate,
            lenderTierPublicId: common.lenderTierPublicId,
            assetPublicId: common.assetPublicId,
            status: fields.cancel ? 'annule' : null
        }
    };
}

/** Geste rapide `POST /remaining-amount` : `0 ≤ restant ≤ initial`. */
export function buildSetRemainingAmountPayload(
    fields: LiabilityRemainingAmountFields,
    context: { initialAmount: number }
): BuildLiabilityPayloadResult<SetRemainingAmountPayload> {
    const trimmed = fields.remainingAmount.trim();
    if (!trimmed) return fail('remainingAmountInvalid', 'remainingAmount');
    const parsed = parseAccountAmount(trimmed);
    if (parsed == null) return fail('remainingAmountInvalid', 'remainingAmount');
    if (parsed < 0 || parsed > context.initialAmount) return fail('remainingAmountOutOfRange', 'remainingAmount');
    return { ok: true, payload: { remainingAmount: parsed } };
}

export function isLiabilityFormDirty(liability: Liability, fields: LiabilityFormFields): boolean {
    if (fields.name.trim() !== liability.name.trim()) return true;
    if (fields.type !== liability.type) return true;
    if (parseAccountAmount(fields.initialAmount) !== liability.initialAmount) return true;
    const remainingRaw = fields.remainingAmount.trim();
    const remaining = remainingRaw ? parseAccountAmount(remainingRaw) : liability.initialAmount;
    if (remaining !== liability.remainingAmount) return true;
    const rateRaw = fields.interestRate.trim();
    const rate = rateRaw ? parseInterestRate(rateRaw) : null;
    if (rate !== liability.interestRate) return true;
    if (emptyToNull(fields.startDate) !== emptyToNull(liability.startDate)) return true;
    if (emptyToNull(fields.plannedEndDate) !== emptyToNull(liability.plannedEndDate)) return true;
    if (emptyToNull(fields.lenderTierPublicId) !== emptyToNull(liability.lenderTierPublicId)) return true;
    if (emptyToNull(fields.assetPublicId) !== emptyToNull(liability.assetPublicId)) return true;
    if (fields.cancel !== (liability.status === 'annule')) return true;
    return false;
}
