import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isSavingsGoalCurrency, isValidYmd } from '@/features/savings-goals/format';
import {
    SAVINGS_GOAL_NAME_MAX,
    type SavingsGoal,
    type SavingsGoalCurrency,
    type SavingsGoalStatus,
    type CreateSavingsGoalPayload,
    type UpdateSavingsGoalPayload
} from '@/features/savings-goals/types';

export type SavingsGoalPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'targetAmountInvalid'
    | 'targetAmountNotPositive'
    | 'openingAmountInvalid'
    | 'openingAmountNegative'
    | 'targetDateInvalid'
    | 'currencyInvalid'
    | 'currencyLocked'
    | 'accountInvalid';

export type SavingsGoalFormFields = {
    name: string;
    targetAmount: string;
    openingAmount: string;
    targetDate: string | null;
    accountPublicId: string;
    currency: SavingsGoalCurrency | '';
    abandon: boolean;
};

export type BuildSavingsGoalPayloadOk<T> = { ok: true; payload: T };
export type BuildSavingsGoalPayloadFail = { ok: false; code: SavingsGoalPayloadErrorCode; field?: string };
export type BuildSavingsGoalPayloadResult<T> = BuildSavingsGoalPayloadOk<T> | BuildSavingsGoalPayloadFail;

export type SavingsGoalPayloadContext = {
    /** Devise figée à la création — obligatoire en PUT. */
    lockedCurrency?: SavingsGoalCurrency | null;
    /** Comptes actifs possédés, autorisés au rattachement. */
    allowedAccountIds?: ReadonlySet<string>;
};

function fail(code: SavingsGoalPayloadErrorCode, field?: string): BuildSavingsGoalPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptySavingsGoalFormFields(
    defaults: { currency?: SavingsGoalCurrency | ''; openingAmount?: string } = {}
): SavingsGoalFormFields {
    return {
        name: '',
        targetAmount: '',
        openingAmount: defaults.openingAmount ?? '0',
        targetDate: null,
        accountPublicId: '',
        currency: defaults.currency ?? '',
        abandon: false
    };
}

export function savingsGoalToFormFields(goal: SavingsGoal): SavingsGoalFormFields {
    return {
        name: goal.name,
        targetAmount: String(goal.targetAmount),
        openingAmount: String(goal.openingAmount),
        targetDate: goal.targetDate,
        accountPublicId: goal.accountPublicId ?? '',
        currency: goal.currency,
        abandon: goal.status === 'abandonne'
    };
}

type CommonFields =
    | BuildSavingsGoalPayloadFail
    | {
          ok: true;
          name: string;
          targetAmount: number;
          openingAmount: number;
          targetDate: string | null;
          accountPublicId: string | null;
      };

function commonFields(fields: SavingsGoalFormFields, context: SavingsGoalPayloadContext = {}): CommonFields {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > SAVINGS_GOAL_NAME_MAX) return fail('nameTooLong', 'name');

    const targetAmount = parseAccountAmount(fields.targetAmount);
    if (targetAmount == null) return fail('targetAmountInvalid', 'targetAmount');
    if (targetAmount <= 0) return fail('targetAmountNotPositive', 'targetAmount');

    const openingRaw = fields.openingAmount.trim();
    let openingAmount = 0;
    if (openingRaw) {
        const parsed = parseAccountAmount(openingRaw);
        if (parsed == null) return fail('openingAmountInvalid', 'openingAmount');
        openingAmount = parsed;
    }
    if (openingAmount < 0) return fail('openingAmountNegative', 'openingAmount');

    const targetDate = emptyToNull(fields.targetDate);
    if (targetDate && !isValidYmd(targetDate)) return fail('targetDateInvalid', 'targetDate');

    const accountPublicId = emptyToNull(fields.accountPublicId);
    if (accountPublicId && context.allowedAccountIds && !context.allowedAccountIds.has(accountPublicId)) {
        return fail('accountInvalid', 'accountPublicId');
    }

    return {
        ok: true,
        name,
        targetAmount,
        openingAmount,
        targetDate,
        accountPublicId
    };
}

export function buildCreateSavingsGoalPayload(
    fields: SavingsGoalFormFields,
    context: SavingsGoalPayloadContext = {}
): BuildSavingsGoalPayloadResult<CreateSavingsGoalPayload> {
    const common = commonFields(fields, context);
    if (!common.ok) return common;

    const currencyRaw = emptyToNull(fields.currency);
    let currency: SavingsGoalCurrency | null = null;
    if (currencyRaw) {
        if (!isSavingsGoalCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
        currency = currencyRaw;
    }

    return {
        ok: true,
        payload: {
            name: common.name,
            targetAmount: common.targetAmount,
            openingAmount: common.openingAmount,
            targetDate: common.targetDate,
            accountPublicId: common.accountPublicId,
            currency
        }
    };
}

function updateStatus(abandon: boolean): SavingsGoalStatus | null {
    return abandon ? 'abandonne' : null;
}

export function buildUpdateSavingsGoalPayload(
    fields: SavingsGoalFormFields,
    context: SavingsGoalPayloadContext = {}
): BuildSavingsGoalPayloadResult<UpdateSavingsGoalPayload> {
    const common = commonFields(fields, context);
    if (!common.ok) return common;

    const locked = context.lockedCurrency;
    if (!locked || !isSavingsGoalCurrency(locked)) return fail('currencyLocked', 'currency');
    const currencyRaw = emptyToNull(fields.currency);
    if (currencyRaw && currencyRaw !== locked) return fail('currencyLocked', 'currency');

    return {
        ok: true,
        payload: {
            name: common.name,
            targetAmount: common.targetAmount,
            openingAmount: common.openingAmount,
            targetDate: common.targetDate,
            accountPublicId: common.accountPublicId,
            currency: locked,
            status: updateStatus(fields.abandon)
        }
    };
}

/** Détache le compte (`accountPublicId: null`) — le serveur retire les transactions liées. */
export function buildUnlinkAccountPayload(goal: SavingsGoal): UpdateSavingsGoalPayload {
    return {
        name: goal.name,
        targetAmount: goal.targetAmount,
        openingAmount: goal.openingAmount,
        targetDate: goal.targetDate,
        accountPublicId: null,
        currency: goal.currency,
        status: goal.status === 'abandonne' ? 'abandonne' : null
    };
}

export function isSavingsGoalFormDirty(goal: SavingsGoal, fields: SavingsGoalFormFields): boolean {
    if (fields.name.trim() !== goal.name.trim()) return true;
    const target = parseAccountAmount(fields.targetAmount);
    if (target !== goal.targetAmount) return true;
    const openingRaw = fields.openingAmount.trim();
    const opening = openingRaw ? parseAccountAmount(openingRaw) : 0;
    if (opening !== goal.openingAmount) return true;
    if (emptyToNull(fields.targetDate) !== emptyToNull(goal.targetDate)) return true;
    if (emptyToNull(fields.accountPublicId) !== emptyToNull(goal.accountPublicId)) return true;
    if (fields.abandon !== (goal.status === 'abandonne')) return true;
    return false;
}
