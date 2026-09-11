import { parseAccountAmount } from '@/features/accounts/format';
import type { Account } from '@/features/accounts/types';
import { emptyToNull, isDateInFutureLocal, isValidYmd } from '@/features/recurring-payments/format';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import {
    RECURRING_EXPENSE_FREQUENCIES,
    RECURRING_EXPENSE_NAME_MAX,
    RECURRING_EXPENSE_TYPES,
    RECURRING_INCOME_FREQUENCIES,
    RECURRING_INCOME_NAME_MAX,
    RECURRING_INCOME_TYPES,
    RECURRING_NOTES_MAX,
    RECURRING_PAYMENT_DAY_MAX,
    RECURRING_PAYMENT_DAY_MIN,
    type ConfirmDueBody,
    type CreateRecurringExpensePayload,
    type CreateRecurringIncomePayload,
    type RecurringExpenseFrequency,
    type RecurringExpenseType,
    type RecurringIncomeFrequency,
    type RecurringIncomeType,
    type RecurringKind,
    type UpdateRecurringExpensePayload,
    type UpdateRecurringIncomePayload
} from '@/features/recurring-payments/types';

export type RecurringPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'typeInvalid'
    | 'frequencyInvalid'
    | 'amountInvalid'
    | 'amountNotPositive'
    | 'startDateRequired'
    | 'startDateInvalid'
    | 'endDateInvalid'
    | 'endDateBeforeStart'
    | 'accountRequired'
    | 'accountArchived'
    | 'forbidden'
    | 'paymentDayInvalid'
    | 'notesTooLong'
    | 'isActiveRequired'
    | 'paymentDateInvalid'
    | 'paymentDateFuture';

export type RecurringTemplateFormFields = {
    kind: RecurringKind;
    name: string;
    expenseType: RecurringExpenseType;
    incomeType: RecurringIncomeType;
    expenseFrequency: RecurringExpenseFrequency;
    incomeFrequency: RecurringIncomeFrequency;
    plannedAmount: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string;
    categoryPublicId: string;
    tierPublicId: string;
    notes: string;
    paymentDay: string;
};

export type ConfirmDueFormFields = {
    paymentDate: string;
    amount: string;
    paymentMethodPublicId: string;
    notes: string;
};

export type RecurringPayloadContext = {
    accounts: readonly Pick<Account, 'publicId' | 'isActive' | 'myRole'>[];
    now?: Date;
    requireWrite?: boolean;
};

export type BuildRecurringPayloadOk<T> = { ok: true; payload: T };
export type BuildRecurringPayloadFail = { ok: false; code: RecurringPayloadErrorCode; field?: string };
export type BuildRecurringPayloadResult<T> = BuildRecurringPayloadOk<T> | BuildRecurringPayloadFail;

function fail(code: RecurringPayloadErrorCode, field?: string): BuildRecurringPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptyRecurringForm(kind: RecurringKind, accountPublicId = ''): RecurringTemplateFormFields {
    return {
        kind,
        name: '',
        expenseType: 'loyer',
        incomeType: 'salaire',
        expenseFrequency: 'mensuel',
        incomeFrequency: 'mensuelle',
        plannedAmount: '',
        startDate: '',
        endDate: null,
        isActive: true,
        accountPublicId,
        paymentMethodPublicId: '',
        categoryPublicId: '',
        tierPublicId: '',
        notes: '',
        paymentDay: ''
    };
}

function parsePaymentDay(raw: string, frequency: RecurringIncomeFrequency): BuildRecurringPayloadResult<number | null> {
    if (frequency === 'hebdomadaire') return { ok: true, payload: null };
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, payload: null };
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < RECURRING_PAYMENT_DAY_MIN || n > RECURRING_PAYMENT_DAY_MAX) {
        return fail('paymentDayInvalid', 'paymentDay');
    }
    return { ok: true, payload: n };
}

function commonTemplateFields(
    fields: RecurringTemplateFormFields,
    ctx: RecurringPayloadContext
): BuildRecurringPayloadResult<{
    name: string;
    plannedAmount: number;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
}> {
    const nameMax = fields.kind === 'expense' ? RECURRING_EXPENSE_NAME_MAX : RECURRING_INCOME_NAME_MAX;
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > nameMax) return fail('nameTooLong', 'name');

    const plannedAmount = parseAccountAmount(fields.plannedAmount);
    if (plannedAmount == null) return fail('amountInvalid', 'plannedAmount');
    if (plannedAmount <= 0) return fail('amountNotPositive', 'plannedAmount');

    const startDate = fields.startDate.trim();
    if (!startDate) return fail('startDateRequired', 'startDate');
    if (!isValidYmd(startDate)) return fail('startDateInvalid', 'startDate');

    const endDate = emptyToNull(fields.endDate);
    if (endDate && !isValidYmd(endDate)) return fail('endDateInvalid', 'endDate');
    if (endDate && endDate < startDate) return fail('endDateBeforeStart', 'endDate');

    if (typeof fields.isActive !== 'boolean') return fail('isActiveRequired', 'isActive');

    const accountPublicId = fields.accountPublicId.trim();
    if (!accountPublicId) return fail('accountRequired', 'accountPublicId');
    const account = ctx.accounts.find((item) => item.publicId === accountPublicId);
    if (!account) return fail('accountRequired', 'accountPublicId');
    if (ctx.requireWrite !== false && !canWriteRecurringOnAccount(account)) {
        return account.isActive ? fail('forbidden', 'accountPublicId') : fail('accountArchived', 'accountPublicId');
    }

    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > RECURRING_NOTES_MAX) return fail('notesTooLong', 'notes');

    return {
        ok: true,
        payload: {
            name,
            plannedAmount,
            startDate,
            endDate,
            isActive: fields.isActive,
            accountPublicId,
            paymentMethodPublicId: emptyToNull(fields.paymentMethodPublicId),
            categoryPublicId: emptyToNull(fields.categoryPublicId),
            tierPublicId: emptyToNull(fields.tierPublicId),
            notes
        }
    };
}

export function buildCreateExpensePayload(
    fields: RecurringTemplateFormFields,
    ctx: RecurringPayloadContext
): BuildRecurringPayloadResult<CreateRecurringExpensePayload> {
    if (fields.kind !== 'expense') return fail('typeInvalid', 'expenseType');
    if (!RECURRING_EXPENSE_TYPES.includes(fields.expenseType)) return fail('typeInvalid', 'expenseType');
    if (!RECURRING_EXPENSE_FREQUENCIES.includes(fields.expenseFrequency)) return fail('frequencyInvalid', 'expenseFrequency');
    const common = commonTemplateFields(fields, ctx);
    if (!common.ok) return common;
    return {
        ok: true,
        payload: {
            ...common.payload,
            expenseType: fields.expenseType,
            frequency: fields.expenseFrequency
        }
    };
}

export function buildUpdateExpensePayload(
    fields: RecurringTemplateFormFields,
    ctx: RecurringPayloadContext
): BuildRecurringPayloadResult<UpdateRecurringExpensePayload> {
    return buildCreateExpensePayload(fields, ctx);
}

export function buildCreateIncomePayload(
    fields: RecurringTemplateFormFields,
    ctx: RecurringPayloadContext
): BuildRecurringPayloadResult<CreateRecurringIncomePayload> {
    if (fields.kind !== 'income') return fail('typeInvalid', 'incomeType');
    if (!RECURRING_INCOME_TYPES.includes(fields.incomeType)) return fail('typeInvalid', 'incomeType');
    if (!RECURRING_INCOME_FREQUENCIES.includes(fields.incomeFrequency)) return fail('frequencyInvalid', 'incomeFrequency');
    const common = commonTemplateFields(fields, ctx);
    if (!common.ok) return common;
    const paymentDay = parsePaymentDay(fields.paymentDay, fields.incomeFrequency);
    if (!paymentDay.ok) return paymentDay;
    return {
        ok: true,
        payload: {
            ...common.payload,
            incomeType: fields.incomeType,
            frequency: fields.incomeFrequency,
            paymentDay: paymentDay.payload
        }
    };
}

export function buildUpdateIncomePayload(
    fields: RecurringTemplateFormFields,
    ctx: RecurringPayloadContext
): BuildRecurringPayloadResult<UpdateRecurringIncomePayload> {
    return buildCreateIncomePayload(fields, ctx);
}

export function buildConfirmDuePayload(fields: ConfirmDueFormFields, now = new Date()): BuildRecurringPayloadResult<ConfirmDueBody> {
    const paymentDate = emptyToNull(fields.paymentDate);
    if (paymentDate) {
        if (!isValidYmd(paymentDate)) return fail('paymentDateInvalid', 'paymentDate');
        if (isDateInFutureLocal(paymentDate, now)) return fail('paymentDateFuture', 'paymentDate');
    }
    const amountRaw = fields.amount.trim();
    let amount: number | null = null;
    if (amountRaw) {
        const parsed = parseAccountAmount(amountRaw);
        if (parsed == null) return fail('amountInvalid', 'amount');
        if (parsed <= 0) return fail('amountNotPositive', 'amount');
        amount = parsed;
    }
    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > RECURRING_NOTES_MAX) return fail('notesTooLong', 'notes');
    return {
        ok: true,
        payload: {
            paymentDate,
            amount,
            paymentMethodPublicId: emptyToNull(fields.paymentMethodPublicId),
            notes
        }
    };
}

export function isExpenseFormDirty(
    current: {
        name: string;
        expenseType: string;
        frequency: string;
        plannedAmount: number;
        startDate: string;
        endDate: string | null;
        isActive: boolean;
        accountPublicId: string;
        paymentMethodPublicId: string | null;
        categoryPublicId: string | null;
        tierPublicId: string | null;
        notes: string | null;
    },
    fields: RecurringTemplateFormFields
): boolean {
    const amount = parseAccountAmount(fields.plannedAmount);
    return (
        fields.name.trim() !== current.name ||
        fields.expenseType !== current.expenseType ||
        fields.expenseFrequency !== current.frequency ||
        amount !== current.plannedAmount ||
        fields.startDate !== current.startDate ||
        emptyToNull(fields.endDate) !== current.endDate ||
        fields.isActive !== current.isActive ||
        fields.accountPublicId !== current.accountPublicId ||
        emptyToNull(fields.paymentMethodPublicId) !== current.paymentMethodPublicId ||
        emptyToNull(fields.categoryPublicId) !== current.categoryPublicId ||
        emptyToNull(fields.tierPublicId) !== current.tierPublicId ||
        emptyToNull(fields.notes) !== current.notes
    );
}

export function isIncomeFormDirty(
    current: {
        name: string;
        incomeType: string;
        frequency: string;
        plannedAmount: number;
        startDate: string;
        endDate: string | null;
        isActive: boolean;
        accountPublicId: string;
        paymentMethodPublicId: string | null;
        categoryPublicId: string | null;
        tierPublicId: string | null;
        notes: string | null;
        paymentDay: number | null;
    },
    fields: RecurringTemplateFormFields
): boolean {
    const amount = parseAccountAmount(fields.plannedAmount);
    const day = fields.paymentDay.trim();
    const currentDay = current.paymentDay == null ? '' : String(current.paymentDay);
    return (
        fields.name.trim() !== current.name ||
        fields.incomeType !== current.incomeType ||
        fields.incomeFrequency !== current.frequency ||
        amount !== current.plannedAmount ||
        fields.startDate !== current.startDate ||
        emptyToNull(fields.endDate) !== current.endDate ||
        fields.isActive !== current.isActive ||
        fields.accountPublicId !== current.accountPublicId ||
        emptyToNull(fields.paymentMethodPublicId) !== current.paymentMethodPublicId ||
        emptyToNull(fields.categoryPublicId) !== current.categoryPublicId ||
        emptyToNull(fields.tierPublicId) !== current.tierPublicId ||
        emptyToNull(fields.notes) !== current.notes ||
        day !== currentDay
    );
}
