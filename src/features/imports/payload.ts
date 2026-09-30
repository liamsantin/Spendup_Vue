import { parseAccountAmount, todayYmd } from '@/features/accounts/format';
import type { CategoryType } from '@/features/categories/types';
import { isValidYmd } from '@/features/transactions/format';
import { IMPORT_LINE_LABEL_MAX, type ImportLine, type UpdateImportLinePayload } from '@/features/imports/types';

/** Formulaire de correction d’une ligne. `amount` est **signé** (négatif = dépense). `''` = aucun. */
export type ImportLineFormFields = {
    operationDate: string;
    valueDate: string | null;
    label: string;
    amount: string;
    categoryPublicId: string;
    tierPublicId: string;
    paymentMethodPublicId: string;
    /** `recurringPublicId|scheduledAt`, `''` = aucune échéance. */
    recurringDueKey: string;
    /** Valeur du fichier non reconnue : ne pas créer le tier / moyen au commit (`PATCH … null`). */
    dropUnmatchedTier: boolean;
    dropUnmatchedPaymentMethod: boolean;
};

export function recurringDueKey(due: { recurringPublicId: string; scheduledAt: string } | null | undefined): string {
    return due ? `${due.recurringPublicId}|${due.scheduledAt}` : '';
}

function parseRecurringDueKey(key: string): { recurringPublicId: string; scheduledAt: string } | null {
    const [recurringPublicId, scheduledAt] = key.split('|');
    return recurringPublicId && scheduledAt ? { recurringPublicId, scheduledAt } : null;
}

export type ImportLinePayloadErrorCode =
    | 'operationDateRequired'
    | 'operationDateInvalid'
    | 'operationDateFuture'
    | 'valueDateBeforeOperation'
    | 'labelRequired'
    | 'labelTooLong'
    | 'amountRequired'
    | 'amountInvalid'
    | 'amountZero'
    | 'categoryTypeMismatch'
    | 'noChanges';

export type BuildImportLinePayloadResult =
    | { ok: true; payload: UpdateImportLinePayload }
    | { ok: false; code: ImportLinePayloadErrorCode; field?: keyof ImportLineFormFields };

export type ImportLinePayloadContext = {
    /** Type de la catégorie choisie (`null` si inconnue localement : le serveur tranche). */
    categoryType?: (publicId: string) => CategoryType | null;
    now?: Date;
};

function fail(code: ImportLinePayloadErrorCode, field?: keyof ImportLineFormFields): BuildImportLinePayloadResult {
    return field ? { ok: false, code, field } : { ok: false, code };
}

function formatAmountInput(value: number | null): string {
    if (value == null) return '';
    return value.toFixed(2);
}

export function importLineToFormFields(line: ImportLine): ImportLineFormFields {
    return {
        operationDate: line.operationDate ?? '',
        valueDate: line.valueDate ?? null,
        label: line.label ?? '',
        amount: formatAmountInput(line.amount),
        categoryPublicId: line.categoryPublicId ?? '',
        tierPublicId: line.tierPublicId ?? '',
        paymentMethodPublicId: line.paymentMethodPublicId ?? '',
        recurringDueKey: recurringDueKey(line.recurringDue),
        dropUnmatchedTier: false,
        dropUnmatchedPaymentMethod: false
    };
}

/** Aucun tier choisi mais une valeur du fichier : il sera créé au commit (sauf si on la retire). */
export function willCreateTier(line: Pick<ImportLine, 'tierPublicId' | 'unmatchedTierName'>): boolean {
    return !line.tierPublicId && !!line.unmatchedTierName?.trim();
}

export function willCreatePaymentMethod(line: Pick<ImportLine, 'paymentMethodPublicId' | 'unmatchedPaymentMethodName'>): boolean {
    return !line.paymentMethodPublicId && !!line.unmatchedPaymentMethodName?.trim();
}

/** Retrait explicite de la valeur à créer : aucun choix + case cochée. */
function dropsTier(line: ImportLine, fields: ImportLineFormFields): boolean {
    return fields.dropUnmatchedTier && !fields.tierPublicId.trim() && willCreateTier(line);
}

function dropsPaymentMethod(line: ImportLine, fields: ImportLineFormFields): boolean {
    return fields.dropUnmatchedPaymentMethod && !fields.paymentMethodPublicId.trim() && willCreatePaymentMethod(line);
}

/** Saisie d’un montant signé : chiffres, un séparateur décimal et un signe en tête. */
export function sanitizeSignedAmountInput(value: string): string {
    const trimmed = value.replace(/[^\d.,+-]/g, '');
    const sign = /^[+-]/.test(trimmed) ? trimmed[0] : '';
    return sign + trimmed.replace(/[+-]/g, '');
}

/** Dépense ↔ `depense` / `mixte`, revenu ↔ `revenu` / `mixte`. */
export function isCategoryCompatibleWithAmount(type: CategoryType | null, amount: number | null): boolean {
    if (!type || amount == null || amount === 0) return true;
    if (type === 'mixte') return true;
    return amount < 0 ? type === 'depense' : type === 'revenu';
}

/**
 * PATCH ligne : n’envoie que les champs modifiés (champ absent = inchangé côté API).
 * Seuls les champs modifiés sont validés : une ligne peut rester en erreur sur un autre champ.
 */
export function buildImportLinePayload(
    line: ImportLine,
    fields: ImportLineFormFields,
    context: ImportLinePayloadContext = {}
): BuildImportLinePayloadResult {
    const initial = importLineToFormFields(line);
    const payload: UpdateImportLinePayload = {};

    const operationDate = fields.operationDate.trim();
    if (operationDate !== initial.operationDate) {
        if (!operationDate) return fail('operationDateRequired', 'operationDate');
        if (!isValidYmd(operationDate)) return fail('operationDateInvalid', 'operationDate');
        if (operationDate > todayYmd(context.now)) return fail('operationDateFuture', 'operationDate');
        payload.operationDate = operationDate;
    }

    const valueDate = fields.valueDate?.trim() || null;
    const valueDateChanged = valueDate !== initial.valueDate;
    if ((valueDateChanged || 'operationDate' in payload) && valueDate && operationDate && valueDate < operationDate) {
        return fail('valueDateBeforeOperation', 'valueDate');
    }
    if (valueDateChanged) payload.valueDate = valueDate;

    const label = fields.label.trim();
    if (label !== initial.label.trim()) {
        if (!label) return fail('labelRequired', 'label');
        if (label.length > IMPORT_LINE_LABEL_MAX) return fail('labelTooLong', 'label');
        payload.label = label;
    }

    let amount = line.amount;
    const amountRaw = fields.amount.trim();
    if (amountRaw !== initial.amount) {
        if (!amountRaw) return fail('amountRequired', 'amount');
        const parsed = parseAccountAmount(amountRaw);
        if (parsed == null) return fail('amountInvalid', 'amount');
        if (parsed === 0) return fail('amountZero', 'amount');
        if (parsed !== line.amount) {
            payload.amount = parsed;
            amount = parsed;
        }
    }

    const categoryPublicId = fields.categoryPublicId.trim() || null;
    const categoryChanged = categoryPublicId !== (line.categoryPublicId ?? null);
    if (categoryPublicId && (categoryChanged || 'amount' in payload)) {
        const type = context.categoryType?.(categoryPublicId) ?? null;
        if (!isCategoryCompatibleWithAmount(type, amount)) return fail('categoryTypeMismatch', 'categoryPublicId');
    }
    if (categoryChanged) payload.categoryPublicId = categoryPublicId;

    const tierPublicId = fields.tierPublicId.trim() || null;
    if (tierPublicId !== (line.tierPublicId ?? null) || dropsTier(line, fields)) payload.tierPublicId = tierPublicId;

    const paymentMethodPublicId = fields.paymentMethodPublicId.trim() || null;
    if (paymentMethodPublicId !== (line.paymentMethodPublicId ?? null) || dropsPaymentMethod(line, fields)) {
        payload.paymentMethodPublicId = paymentMethodPublicId;
    }

    if (fields.recurringDueKey !== initial.recurringDueKey) payload.recurringDue = parseRecurringDueKey(fields.recurringDueKey);

    if (!Object.keys(payload).length) return fail('noChanges');
    return { ok: true, payload };
}

export function isImportLineFormDirty(line: ImportLine, fields: ImportLineFormFields): boolean {
    const initial = importLineToFormFields(line);
    return (
        fields.operationDate.trim() !== initial.operationDate ||
        (fields.valueDate?.trim() || null) !== initial.valueDate ||
        fields.label.trim() !== initial.label.trim() ||
        fields.amount.trim() !== initial.amount ||
        fields.categoryPublicId !== initial.categoryPublicId ||
        fields.tierPublicId !== initial.tierPublicId ||
        fields.paymentMethodPublicId !== initial.paymentMethodPublicId ||
        fields.recurringDueKey !== initial.recurringDueKey ||
        dropsTier(line, fields) ||
        dropsPaymentMethod(line, fields)
    );
}
