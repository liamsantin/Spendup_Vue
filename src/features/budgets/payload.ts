import { parseAccountAmount } from '@/features/accounts/format';
import { emptyToNull, isBudgetCurrency, isBudgetPeriode, isDuplicateBudgetScope, isValidYmd } from '@/features/budgets/format';
import {
    BUDGET_NAME_MAX,
    type Budget,
    type BudgetCurrency,
    type BudgetPeriode,
    type CreateBudgetPayload,
    type UpdateBudgetPayload
} from '@/features/budgets/types';

export type BudgetPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'amountInvalid'
    | 'amountNotPositive'
    | 'periodeInvalid'
    | 'startDateRequired'
    | 'startDateInvalid'
    | 'endDateInvalid'
    | 'endDateBeforeStart'
    | 'currencyInvalid'
    | 'currencyLocked'
    | 'scopeDuplicate'
    | 'categoryTypeInvalid';

export type BudgetFormFields = {
    name: string;
    limitAmount: string;
    periode: BudgetPeriode;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    categoryPublicId: string;
    currency: BudgetCurrency | '';
};

export type BuildBudgetPayloadOk<T> = { ok: true; payload: T };
export type BuildBudgetPayloadFail = { ok: false; code: BudgetPayloadErrorCode; field?: string };
export type BuildBudgetPayloadResult<T> = BuildBudgetPayloadOk<T> | BuildBudgetPayloadFail;

export type BudgetPayloadContext = {
    knownBudgets?: readonly Pick<Budget, 'publicId' | 'periode' | 'startDate' | 'categoryPublicId'>[];
    excludePublicId?: string | null;
    /** Devise figée à la création — obligatoire en PUT. */
    lockedCurrency?: BudgetCurrency | null;
    /** Types des catégories connues (`depense` / `mixte` autorisés). */
    categoryTypes?: ReadonlyMap<string, string>;
};

function fail(code: BudgetPayloadErrorCode, field?: string): BuildBudgetPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptyBudgetFormFields(
    defaults: { periode?: BudgetPeriode; currency?: BudgetCurrency | ''; startDate?: string } = {}
): BudgetFormFields {
    return {
        name: '',
        limitAmount: '',
        periode: defaults.periode ?? 'mensuel',
        startDate: defaults.startDate ?? '',
        endDate: null,
        isActive: true,
        categoryPublicId: '',
        currency: defaults.currency ?? ''
    };
}

export function budgetToFormFields(budget: Budget): BudgetFormFields {
    return {
        name: budget.name,
        limitAmount: String(budget.limitAmount),
        periode: budget.periode,
        startDate: budget.startDate,
        endDate: budget.endDate,
        isActive: budget.isActive,
        categoryPublicId: budget.categoryPublicId ?? '',
        currency: budget.currency
    };
}

function commonFields(
    fields: BudgetFormFields,
    context: BudgetPayloadContext = {}
):
    | BuildBudgetPayloadFail
    | {
          ok: true;
          name: string;
          limitAmount: number;
          periode: BudgetPeriode;
          startDate: string;
          endDate: string | null;
          isActive: boolean;
          categoryPublicId: string | null;
      } {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > BUDGET_NAME_MAX) return fail('nameTooLong', 'name');

    if (!isBudgetPeriode(fields.periode)) return fail('periodeInvalid', 'periode');

    const limitAmount = parseAccountAmount(fields.limitAmount);
    if (limitAmount == null) return fail('amountInvalid', 'limitAmount');
    if (limitAmount <= 0) return fail('amountNotPositive', 'limitAmount');

    const startDate = fields.startDate.trim();
    if (!startDate) return fail('startDateRequired', 'startDate');
    if (!isValidYmd(startDate)) return fail('startDateInvalid', 'startDate');

    const endDate = emptyToNull(fields.endDate);
    if (endDate) {
        if (!isValidYmd(endDate)) return fail('endDateInvalid', 'endDate');
        if (endDate < startDate) return fail('endDateBeforeStart', 'endDate');
    }

    const categoryPublicId = emptyToNull(fields.categoryPublicId);
    if (categoryPublicId && context.categoryTypes) {
        const type = context.categoryTypes.get(categoryPublicId);
        if (type && type !== 'depense' && type !== 'mixte') {
            return fail('categoryTypeInvalid', 'categoryPublicId');
        }
    }

    if (isDuplicateBudgetScope(fields.periode, startDate, categoryPublicId, context.knownBudgets ?? [], context.excludePublicId)) {
        return fail('scopeDuplicate', 'periode');
    }

    return {
        ok: true,
        name,
        limitAmount,
        periode: fields.periode,
        startDate,
        endDate,
        isActive: fields.isActive !== false,
        categoryPublicId
    };
}

export function buildCreateBudgetPayload(
    fields: BudgetFormFields,
    context: BudgetPayloadContext = {}
): BuildBudgetPayloadResult<CreateBudgetPayload> {
    const common = commonFields(fields, context);
    if (!common.ok) return common;

    const currencyRaw = emptyToNull(fields.currency);
    let currency: BudgetCurrency | null = null;
    if (currencyRaw) {
        if (!isBudgetCurrency(currencyRaw)) return fail('currencyInvalid', 'currency');
        currency = currencyRaw;
    }

    return {
        ok: true,
        payload: {
            name: common.name,
            limitAmount: common.limitAmount,
            periode: common.periode,
            startDate: common.startDate,
            endDate: common.endDate,
            isActive: common.isActive,
            categoryPublicId: common.categoryPublicId,
            currency
        }
    };
}

export function buildUpdateBudgetPayload(
    fields: BudgetFormFields,
    context: BudgetPayloadContext = {}
): BuildBudgetPayloadResult<UpdateBudgetPayload> {
    const common = commonFields(fields, context);
    if (!common.ok) return common;

    const locked = context.lockedCurrency;
    if (!locked || !isBudgetCurrency(locked)) return fail('currencyLocked', 'currency');
    const currencyRaw = emptyToNull(fields.currency);
    if (currencyRaw && currencyRaw !== locked) return fail('currencyLocked', 'currency');

    return {
        ok: true,
        payload: {
            name: common.name,
            limitAmount: common.limitAmount,
            periode: common.periode,
            startDate: common.startDate,
            endDate: common.endDate,
            isActive: common.isActive,
            categoryPublicId: common.categoryPublicId,
            currency: locked
        }
    };
}

export function isBudgetFormDirty(budget: Budget, fields: BudgetFormFields): boolean {
    if (fields.name.trim() !== budget.name.trim()) return true;
    const amount = parseAccountAmount(fields.limitAmount);
    if (amount !== budget.limitAmount) return true;
    if (fields.periode !== budget.periode) return true;
    if (fields.startDate.trim() !== budget.startDate) return true;
    if (emptyToNull(fields.endDate) !== emptyToNull(budget.endDate)) return true;
    if (fields.isActive !== budget.isActive) return true;
    if (emptyToNull(fields.categoryPublicId) !== emptyToNull(budget.categoryPublicId)) return true;
    return false;
}
