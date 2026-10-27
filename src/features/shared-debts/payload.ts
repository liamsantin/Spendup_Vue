import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isSharedDebtCurrency, isValidYmd } from '@/features/shared-debts/format';
import {
    SHARED_DEBT_LABEL_MAX,
    type CreateSharedDebtPayload,
    type SettleSharedDebtPayload,
    type SharedDebt,
    type SharedDebtCurrency,
    type UpdateSharedDebtPayload
} from '@/features/shared-debts/types';

export type SharedDebtPayloadErrorCode =
    | 'friendRequired'
    | 'labelRequired'
    | 'labelTooLong'
    | 'amountInvalid'
    | 'amountNotPositive'
    | 'dueDateInvalid'
    | 'currencyInvalid'
    | 'settleAmountInvalid'
    | 'settleAmountNotPositive'
    | 'settleAmountAboveRemaining'
    | 'settleDateInvalid'
    | 'settleDateFuture';

export type SharedDebtFormFields = {
    debtorUserPublicId: string;
    transactionPublicId: string;
    label: string;
    amount: string;
    currency: SharedDebtCurrency | '';
    dueDate: string | null;
};

export type SharedDebtSettleFields = {
    amount: string;
    date: string | null;
};

export type BuildSharedDebtPayloadOk<T> = { ok: true; payload: T };
export type BuildSharedDebtPayloadFail = { ok: false; code: SharedDebtPayloadErrorCode; field?: string };
export type BuildSharedDebtPayloadResult<T> = BuildSharedDebtPayloadOk<T> | BuildSharedDebtPayloadFail;

export type SharedDebtPayloadContext = {
    /** Devise imposée par la transaction liée (le champ devise est alors ignoré). */
    transactionCurrency?: SharedDebtCurrency | null;
};

export type SharedDebtSettleContext = {
    /** Plafond du montant remboursé. */
    remainingAmount: number;
    /** Date civile du jour (fuseau des settings). */
    today: string;
};

function fail(code: SharedDebtPayloadErrorCode, field?: string): BuildSharedDebtPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptySharedDebtFormFields(defaults: { currency?: SharedDebtCurrency | '' } = {}): SharedDebtFormFields {
    return {
        debtorUserPublicId: '',
        transactionPublicId: '',
        label: '',
        amount: '',
        currency: defaults.currency ?? '',
        dueDate: null
    };
}

export function sharedDebtToFormFields(debt: SharedDebt): SharedDebtFormFields {
    return {
        debtorUserPublicId: debt.counterpart.publicId,
        transactionPublicId: debt.transactionPublicId ?? '',
        label: debt.label,
        amount: String(debt.amount),
        currency: debt.currency,
        dueDate: debt.dueDate
    };
}

export function emptySharedDebtSettleFields(debt: Pick<SharedDebt, 'remainingAmount'>, today: string): SharedDebtSettleFields {
    return {
        amount: String(debt.remainingAmount),
        date: today
    };
}

type AmountAndDue = BuildSharedDebtPayloadFail | { ok: true; amount: number; dueDate: string | null };

function amountAndDueDate(fields: Pick<SharedDebtFormFields, 'amount' | 'dueDate'>): AmountAndDue {
    const amount = parseAccountAmount(fields.amount);
    if (amount == null) return fail('amountInvalid', 'amount');
    if (amount <= 0) return fail('amountNotPositive', 'amount');

    const dueDate = emptyToNull(fields.dueDate);
    if (dueDate && !isValidYmd(dueDate)) return fail('dueDateInvalid', 'dueDate');

    return { ok: true, amount, dueDate };
}

function checkLabel(label: string, required: boolean): BuildSharedDebtPayloadFail | null {
    if (!label) return required ? fail('labelRequired', 'label') : null;
    if (label.length > SHARED_DEBT_LABEL_MAX) return fail('labelTooLong', 'label');
    return null;
}

/** Ami obligatoire, montant > 0, libellé obligatoire sans transaction, devise = celle de la transaction si liée. */
export function buildCreateSharedDebtPayload(
    fields: SharedDebtFormFields,
    context: SharedDebtPayloadContext = {}
): BuildSharedDebtPayloadResult<CreateSharedDebtPayload> {
    const debtorUserPublicId = emptyToNull(fields.debtorUserPublicId);
    if (!debtorUserPublicId) return fail('friendRequired', 'debtorUserPublicId');

    const transactionPublicId = emptyToNull(fields.transactionPublicId);
    const label = fields.label.trim();
    const labelError = checkLabel(label, !transactionPublicId);
    if (labelError) return labelError;

    const common = amountAndDueDate(fields);
    if (!common.ok) return common;

    let currency: SharedDebtCurrency | null = null;
    if (transactionPublicId) {
        currency = isSharedDebtCurrency(context.transactionCurrency) ? context.transactionCurrency : null;
    } else {
        const currencyRaw = emptyToNull(fields.currency);
        if (currencyRaw) {
            if (!isSharedDebtCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
            currency = currencyRaw;
        }
    }

    return {
        ok: true,
        payload: {
            debtorUserPublicId,
            amount: common.amount,
            label: label || null,
            transactionPublicId,
            currency,
            dueDate: common.dueDate
        }
    };
}

/** PUT : libellé, montant, échéance seulement. */
export function buildUpdateSharedDebtPayload(fields: SharedDebtFormFields): BuildSharedDebtPayloadResult<UpdateSharedDebtPayload> {
    const label = fields.label.trim();
    const labelError = checkLabel(label, true);
    if (labelError) return labelError;

    const common = amountAndDueDate(fields);
    if (!common.ok) return common;

    return {
        ok: true,
        payload: {
            label,
            amount: common.amount,
            dueDate: common.dueDate
        }
    };
}

/** Montant optionnel ∈ ]0, restant] (vide = tout le restant), date optionnelle ≤ aujourd’hui. */
export function buildSettlePayload(
    fields: SharedDebtSettleFields,
    context: SharedDebtSettleContext
): BuildSharedDebtPayloadResult<SettleSharedDebtPayload> {
    const payload: SettleSharedDebtPayload = {};

    const amountRaw = fields.amount.trim();
    if (amountRaw) {
        const amount = parseAccountAmount(amountRaw);
        if (amount == null) return fail('settleAmountInvalid', 'amount');
        if (amount <= 0) return fail('settleAmountNotPositive', 'amount');
        if (amount > context.remainingAmount + 0.004) return fail('settleAmountAboveRemaining', 'amount');
        payload.amount = amount;
    }

    const date = emptyToNull(fields.date);
    if (date) {
        if (!isValidYmd(date)) return fail('settleDateInvalid', 'date');
        if (date > context.today) return fail('settleDateFuture', 'date');
        payload.date = date;
    }

    return { ok: true, payload };
}

export function isSharedDebtFormDirty(debt: SharedDebt, fields: SharedDebtFormFields): boolean {
    if (fields.label.trim() !== debt.label.trim()) return true;
    if (parseAccountAmount(fields.amount) !== debt.amount) return true;
    if (emptyToNull(fields.dueDate) !== emptyToNull(debt.dueDate)) return true;
    return false;
}
