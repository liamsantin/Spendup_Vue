import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isLoanDirection, isPersonalLoanCurrency, isValidYmd } from '@/features/personal-loans/format';
import {
    PERSONAL_LOAN_LABEL_MAX,
    PERSONAL_LOAN_NOTES_MAX,
    type CreatePersonalLoanPayload,
    type LoanDirection,
    type PersonalLoan,
    type PersonalLoanCurrency,
    type UpdatePersonalLoanPayload
} from '@/features/personal-loans/types';

export type PersonalLoanPayloadErrorCode =
    | 'directionInvalid'
    | 'directionLocked'
    | 'counterpartRequired'
    | 'counterpartLocked'
    | 'labelTooLong'
    | 'initialAmountInvalid'
    | 'initialAmountNotPositive'
    | 'remainingAmountInvalid'
    | 'remainingAmountOutOfRange'
    | 'startDateRequired'
    | 'startDateInvalid'
    | 'plannedEndDateInvalid'
    | 'plannedEndDateBeforeStart'
    | 'notesTooLong'
    | 'currencyInvalid'
    | 'currencyLocked';

export type PersonalLoanFormFields = {
    direction: LoanDirection | '';
    counterpartTierPublicId: string;
    label: string;
    initialAmount: string;
    /** Vide à la création = égal au montant initial. */
    remainingAmount: string;
    currency: PersonalLoanCurrency | '';
    startDate: string | null;
    plannedEndDate: string | null;
    notes: string;
    /** Édition : interrupteur « Annulé ». */
    cancel: boolean;
};

export type BuildPersonalLoanPayloadOk<T> = { ok: true; payload: T };
export type BuildPersonalLoanPayloadFail = { ok: false; code: PersonalLoanPayloadErrorCode; field?: string };
export type BuildPersonalLoanPayloadResult<T> = BuildPersonalLoanPayloadOk<T> | BuildPersonalLoanPayloadFail;

export type PersonalLoanPayloadContext = {
    /** Prêt stocké : devise figée, direction / contrepartie verrouillées hors `active`. */
    current?: Pick<PersonalLoan, 'status' | 'direction' | 'counterpartTierPublicId' | 'currency'> | null;
};

function fail(code: PersonalLoanPayloadErrorCode, field?: string): BuildPersonalLoanPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptyPersonalLoanFormFields(
    defaults: { direction?: LoanDirection | ''; currency?: PersonalLoanCurrency | ''; startDate?: string | null } = {}
): PersonalLoanFormFields {
    return {
        direction: defaults.direction ?? 'pret',
        counterpartTierPublicId: '',
        label: '',
        initialAmount: '',
        remainingAmount: '',
        currency: defaults.currency ?? '',
        startDate: defaults.startDate ?? null,
        plannedEndDate: null,
        notes: '',
        cancel: false
    };
}

export function personalLoanToFormFields(loan: PersonalLoan): PersonalLoanFormFields {
    return {
        direction: loan.direction,
        counterpartTierPublicId: loan.counterpartTierPublicId ?? '',
        label: loan.label ?? '',
        initialAmount: String(loan.initialAmount),
        remainingAmount: String(loan.remainingAmount),
        currency: loan.currency,
        startDate: loan.startDate,
        plannedEndDate: loan.plannedEndDate,
        notes: loan.notes ?? '',
        cancel: loan.status === 'annule'
    };
}

type CommonFields =
    | BuildPersonalLoanPayloadFail
    | {
          ok: true;
          direction: LoanDirection;
          counterpartTierPublicId: string;
          label: string | null;
          initialAmount: number;
          remainingAmount: number | null;
          startDate: string;
          plannedEndDate: string | null;
          notes: string | null;
      };

function commonFields(fields: PersonalLoanFormFields): CommonFields {
    if (!isLoanDirection(fields.direction)) return fail('directionInvalid', 'direction');

    const counterpart = emptyToNull(fields.counterpartTierPublicId);
    if (!counterpart) return fail('counterpartRequired', 'counterpartTierPublicId');

    const label = emptyToNull(fields.label);
    if (label && label.length > PERSONAL_LOAN_LABEL_MAX) return fail('labelTooLong', 'label');

    const initialAmount = parseAccountAmount(fields.initialAmount);
    if (initialAmount == null) return fail('initialAmountInvalid', 'initialAmount');
    if (initialAmount <= 0) return fail('initialAmountNotPositive', 'initialAmount');

    const remainingRaw = fields.remainingAmount.trim();
    let remainingAmount: number | null = null;
    if (remainingRaw) {
        const parsed = parseAccountAmount(remainingRaw);
        if (parsed == null) return fail('remainingAmountInvalid', 'remainingAmount');
        if (parsed < 0 || parsed > initialAmount) return fail('remainingAmountOutOfRange', 'remainingAmount');
        remainingAmount = parsed;
    }

    const startDate = emptyToNull(fields.startDate);
    if (!startDate) return fail('startDateRequired', 'startDate');
    if (!isValidYmd(startDate)) return fail('startDateInvalid', 'startDate');
    const plannedEndDate = emptyToNull(fields.plannedEndDate);
    if (plannedEndDate && !isValidYmd(plannedEndDate)) return fail('plannedEndDateInvalid', 'plannedEndDate');
    if (plannedEndDate && plannedEndDate < startDate) return fail('plannedEndDateBeforeStart', 'plannedEndDate');

    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > PERSONAL_LOAN_NOTES_MAX) return fail('notesTooLong', 'notes');

    return {
        ok: true,
        direction: fields.direction,
        counterpartTierPublicId: counterpart,
        label,
        initialAmount,
        remainingAmount,
        startDate,
        plannedEndDate,
        notes
    };
}

export function buildCreatePersonalLoanPayload(fields: PersonalLoanFormFields): BuildPersonalLoanPayloadResult<CreatePersonalLoanPayload> {
    const common = commonFields(fields);
    if (!common.ok) return common;

    const currencyRaw = emptyToNull(fields.currency);
    let currency: PersonalLoanCurrency | null = null;
    if (currencyRaw) {
        if (!isPersonalLoanCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
        currency = currencyRaw;
    }

    return {
        ok: true,
        payload: {
            direction: common.direction,
            counterpartTierPublicId: common.counterpartTierPublicId,
            initialAmount: common.initialAmount,
            startDate: common.startDate,
            label: common.label,
            remainingAmount: common.remainingAmount,
            plannedEndDate: common.plannedEndDate,
            currency,
            notes: common.notes
        }
    };
}

/**
 * PUT : restant obligatoire (vide = montant initial), devise figée, `cancel` → `status: 'annule'`.
 * Direction et contrepartie ne changent que sur un prêt stocké `active`.
 */
export function buildUpdatePersonalLoanPayload(
    fields: PersonalLoanFormFields,
    context: PersonalLoanPayloadContext = {}
): BuildPersonalLoanPayloadResult<UpdatePersonalLoanPayload> {
    const common = commonFields(fields);
    if (!common.ok) return common;

    const current = context.current;
    const locked = current?.currency;
    if (!locked || !isPersonalLoanCurrency(locked)) return fail('currencyLocked', 'currency');
    const currencyRaw = emptyToNull(fields.currency);
    if (currencyRaw && currencyRaw !== locked) return fail('currencyLocked', 'currency');

    if (current.status !== 'active') {
        if (common.direction !== current.direction) return fail('directionLocked', 'direction');
        if (common.counterpartTierPublicId !== (current.counterpartTierPublicId ?? null)) {
            return fail('counterpartLocked', 'counterpartTierPublicId');
        }
    }

    return {
        ok: true,
        payload: {
            direction: common.direction,
            counterpartTierPublicId: common.counterpartTierPublicId,
            label: common.label,
            initialAmount: common.initialAmount,
            remainingAmount: common.remainingAmount ?? common.initialAmount,
            startDate: common.startDate,
            plannedEndDate: common.plannedEndDate,
            currency: locked,
            status: fields.cancel ? 'annule' : null,
            notes: common.notes
        }
    };
}

export function isPersonalLoanFormDirty(loan: PersonalLoan, fields: PersonalLoanFormFields): boolean {
    if (fields.direction !== loan.direction) return true;
    if (emptyToNull(fields.counterpartTierPublicId) !== emptyToNull(loan.counterpartTierPublicId)) return true;
    if (emptyToNull(fields.label) !== emptyToNull(loan.label)) return true;
    if (parseAccountAmount(fields.initialAmount) !== loan.initialAmount) return true;
    const remainingRaw = fields.remainingAmount.trim();
    const remaining = remainingRaw ? parseAccountAmount(remainingRaw) : loan.initialAmount;
    if (remaining !== loan.remainingAmount) return true;
    if (emptyToNull(fields.startDate) !== emptyToNull(loan.startDate)) return true;
    if (emptyToNull(fields.plannedEndDate) !== emptyToNull(loan.plannedEndDate)) return true;
    if (emptyToNull(fields.notes) !== emptyToNull(loan.notes)) return true;
    if (fields.cancel !== (loan.status === 'annule')) return true;
    return false;
}
