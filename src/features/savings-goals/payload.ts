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
    | 'currentAmountInvalid'
    | 'currentAmountNegative'
    | 'targetDateInvalid'
    | 'currencyInvalid'
    | 'currencyLocked'
    | 'accountInvalid';

export type SavingsGoalFormFields = {
    name: string;
    targetAmount: string;
    currentAmount: string;
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
    defaults: { currency?: SavingsGoalCurrency | ''; currentAmount?: string } = {}
): SavingsGoalFormFields {
    return {
        name: '',
        targetAmount: '',
        currentAmount: defaults.currentAmount ?? '0',
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
        currentAmount: String(goal.currentAmount),
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
          currentAmount: number;
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

    const currentRaw = fields.currentAmount.trim();
    let currentAmount = 0;
    if (currentRaw) {
        const parsed = parseAccountAmount(currentRaw);
        if (parsed == null) return fail('currentAmountInvalid', 'currentAmount');
        currentAmount = parsed;
    }
    if (currentAmount < 0) return fail('currentAmountNegative', 'currentAmount');

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
        currentAmount,
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
            currentAmount: common.currentAmount,
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
            currentAmount: common.currentAmount,
            targetDate: common.targetDate,
            accountPublicId: common.accountPublicId,
            currency: locked,
            status: updateStatus(fields.abandon)
        }
    };
}

/** PUT complet pour un versement : seul `currentAmount` change, `status` laissé à `null`. */
export function buildDepositUpdatePayload(
    goal: SavingsGoal,
    currentAmount: number
): BuildSavingsGoalPayloadResult<UpdateSavingsGoalPayload> {
    if (currentAmount < 0 || !Number.isFinite(currentAmount)) {
        return fail('currentAmountNegative', 'currentAmount');
    }
    return {
        ok: true,
        payload: {
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: Number(currentAmount.toFixed(2)),
            targetDate: goal.targetDate,
            accountPublicId: goal.accountPublicId,
            currency: goal.currency,
            status: null
        }
    };
}

/** Détache le compte (`accountPublicId: null`) sans toucher au reste. */
export function buildUnlinkAccountPayload(goal: SavingsGoal): UpdateSavingsGoalPayload {
    return {
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
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
    const currentRaw = fields.currentAmount.trim();
    const current = currentRaw ? parseAccountAmount(currentRaw) : 0;
    if (current !== goal.currentAmount) return true;
    if (emptyToNull(fields.targetDate) !== emptyToNull(goal.targetDate)) return true;
    if (emptyToNull(fields.accountPublicId) !== emptyToNull(goal.accountPublicId)) return true;
    if (fields.abandon !== (goal.status === 'abandonne')) return true;
    return false;
}
