import { parseAccountAmount } from '@/features/accounts/format';
import type { Account } from '@/features/accounts/types';
import { emptyToNull, isOperationDateInFutureUtc, isValidYmd } from '@/features/transactions/format';
import { canWriteTransactions, canWriteTransfer } from '@/features/transactions/rights';
import {
    TRANSACTION_LABEL_MAX,
    TRANSACTION_TYPES,
    type CreateTransactionPayload,
    type TransactionType,
    type UpdateTransactionPayload
} from '@/features/transactions/types';

export type TransactionPayloadErrorCode =
    | 'typeInvalid'
    | 'accountRequired'
    | 'labelRequired'
    | 'labelTooLong'
    | 'amountInvalid'
    | 'amountNotPositive'
    | 'operationDateRequired'
    | 'operationDateInvalid'
    | 'operationDateFuture'
    | 'valueDateInvalid'
    | 'valueDateBeforeOperation'
    | 'counterpartyRequired'
    | 'counterpartyNotAllowed'
    | 'counterpartySame'
    | 'accountArchived'
    | 'currencyMismatch'
    | 'forbidden';

export type TransactionFormFields = {
    type: TransactionType;
    accountPublicId: string;
    counterpartyAccountPublicId: string;
    label: string;
    amount: string;
    operationDate: string;
    valueDate: string | null;
    paymentMethodPublicId: string;
    categoryPublicId: string;
    tierPublicId: string;
};

export type TransactionPayloadContext = {
    accounts: readonly Pick<Account, 'publicId' | 'currency' | 'isActive' | 'myRole'>[];
    now?: Date;
};

export type BuildTransactionPayloadOk<T> = { ok: true; payload: T };
export type BuildTransactionPayloadFail = { ok: false; code: TransactionPayloadErrorCode; field?: string };
export type BuildTransactionPayloadResult<T> = BuildTransactionPayloadOk<T> | BuildTransactionPayloadFail;

function fail(code: TransactionPayloadErrorCode, field?: string): BuildTransactionPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function normalizeLabel(raw: string | null | undefined): string {
    return (raw ?? '').trim();
}

type CommonFields =
    | BuildTransactionPayloadFail
    | {
          ok: true;
          label: string;
          amount: number;
          operationDate: string;
          valueDate: string | null;
          paymentMethodPublicId: string | null;
          categoryPublicId: string | null;
          tierPublicId: string | null;
      };

function commonFields(fields: TransactionFormFields, now?: Date): CommonFields {
    const label = normalizeLabel(fields.label);
    if (!label) return fail('labelRequired', 'label');
    if (label.length > TRANSACTION_LABEL_MAX) return fail('labelTooLong', 'label');

    const amount = parseAccountAmount(fields.amount);
    if (amount == null) return fail('amountInvalid', 'amount');
    if (amount <= 0) return fail('amountNotPositive', 'amount');

    const operationDate = emptyToNull(fields.operationDate);
    if (!operationDate) return fail('operationDateRequired', 'operationDate');
    if (!isValidYmd(operationDate)) return fail('operationDateInvalid', 'operationDate');
    if (isOperationDateInFutureUtc(operationDate, now)) return fail('operationDateFuture', 'operationDate');

    const valueDate = emptyToNull(fields.valueDate);
    if (valueDate) {
        if (!isValidYmd(valueDate)) return fail('valueDateInvalid', 'valueDate');
        if (valueDate < operationDate) return fail('valueDateBeforeOperation', 'valueDate');
    }

    return {
        ok: true,
        label,
        amount,
        operationDate,
        valueDate,
        paymentMethodPublicId: emptyToNull(fields.paymentMethodPublicId),
        categoryPublicId: emptyToNull(fields.categoryPublicId),
        tierPublicId: emptyToNull(fields.tierPublicId)
    };
}

function resolveAccount(
    accounts: TransactionPayloadContext['accounts'],
    publicId: string
): Pick<Account, 'publicId' | 'currency' | 'isActive' | 'myRole'> | undefined {
    return accounts.find((a) => a.publicId === publicId);
}

export function buildCreateTransactionPayload(
    fields: TransactionFormFields,
    context: TransactionPayloadContext = { accounts: [] }
): BuildTransactionPayloadResult<CreateTransactionPayload> {
    if (!TRANSACTION_TYPES.includes(fields.type)) {
        return fail('typeInvalid', 'type');
    }

    const accountPublicId = fields.accountPublicId.trim();
    if (!accountPublicId) return fail('accountRequired', 'accountPublicId');

    const common = commonFields(fields, context.now);
    if (!common.ok) return common;

    const source = resolveAccount(context.accounts, accountPublicId);
    if (source && !canWriteTransactions(source)) {
        return fail(source.isActive ? 'forbidden' : 'accountArchived', 'accountPublicId');
    }

    const counterpartyId = emptyToNull(fields.counterpartyAccountPublicId);

    if (fields.type === 'transfert') {
        if (!counterpartyId) return fail('counterpartyRequired', 'counterpartyAccountPublicId');
        if (counterpartyId === accountPublicId) return fail('counterpartySame', 'counterpartyAccountPublicId');
        const target = resolveAccount(context.accounts, counterpartyId);
        if (source && target) {
            if (!canWriteTransfer(source, target)) {
                return fail(!source.isActive || !target.isActive ? 'accountArchived' : 'forbidden', 'counterpartyAccountPublicId');
            }
            if (source.currency !== target.currency) {
                return fail('currencyMismatch', 'counterpartyAccountPublicId');
            }
        }
    } else if (counterpartyId) {
        return fail('counterpartyNotAllowed', 'counterpartyAccountPublicId');
    }

    const payload: CreateTransactionPayload = {
        type: fields.type,
        accountPublicId,
        label: common.label,
        amount: common.amount,
        operationDate: common.operationDate
    };
    if (fields.type === 'transfert') {
        payload.counterpartyAccountPublicId = counterpartyId;
    }
    if (common.valueDate) payload.valueDate = common.valueDate;
    if (common.paymentMethodPublicId) payload.paymentMethodPublicId = common.paymentMethodPublicId;
    if (common.categoryPublicId) payload.categoryPublicId = common.categoryPublicId;
    if (common.tierPublicId) payload.tierPublicId = common.tierPublicId;

    return { ok: true, payload };
}

export function buildUpdateTransactionPayload(
    fields: TransactionFormFields,
    context: TransactionPayloadContext = { accounts: [] }
): BuildTransactionPayloadResult<UpdateTransactionPayload> {
    const common = commonFields(fields, context.now);
    if (!common.ok) return common;

    const accountPublicId = fields.accountPublicId.trim();
    const source = accountPublicId ? resolveAccount(context.accounts, accountPublicId) : undefined;
    if (source && !canWriteTransactions(source)) {
        return fail(source.isActive ? 'forbidden' : 'accountArchived', 'accountPublicId');
    }
    if (fields.type === 'transfert') {
        const counterpartyId = emptyToNull(fields.counterpartyAccountPublicId);
        const target = counterpartyId ? resolveAccount(context.accounts, counterpartyId) : undefined;
        if (source && target && !canWriteTransfer(source, target)) {
            return fail(!source.isActive || !target.isActive ? 'accountArchived' : 'forbidden');
        }
    }

    const payload: UpdateTransactionPayload = {
        label: common.label,
        amount: common.amount,
        operationDate: common.operationDate,
        valueDate: common.valueDate,
        paymentMethodPublicId: common.paymentMethodPublicId,
        categoryPublicId: common.categoryPublicId,
        tierPublicId: common.tierPublicId
    };
    return { ok: true, payload };
}

export function isTransactionFormDirty(
    transaction: Pick<TransactionFormDirtySource, keyof TransactionFormDirtySource>,
    fields: TransactionFormFields
): boolean {
    if (normalizeLabel(fields.label) !== normalizeLabel(transaction.label)) return true;
    const formAmount = parseAccountAmount(fields.amount);
    if (formAmount == null || transaction.amount == null || formAmount !== Number(transaction.amount.toFixed(2))) return true;
    if (emptyToNull(fields.operationDate) !== emptyToNull(transaction.operationDate)) return true;
    if (emptyToNull(fields.valueDate) !== emptyToNull(transaction.valueDate)) return true;
    if (emptyToNull(fields.paymentMethodPublicId) !== emptyToNull(transaction.paymentMethodPublicId)) return true;
    if (emptyToNull(fields.categoryPublicId) !== emptyToNull(transaction.categoryPublicId)) return true;
    if (emptyToNull(fields.tierPublicId) !== emptyToNull(transaction.tierPublicId ?? null)) return true;
    return false;
}

type TransactionFormDirtySource = {
    label: string;
    amount: number | null;
    operationDate: string;
    valueDate: string | null;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId?: string | null;
};
