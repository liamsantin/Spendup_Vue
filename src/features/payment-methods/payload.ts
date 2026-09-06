import { emptyToNull, isExpirationStrictlyBeforeTodayUtc, isValidYmd } from '@/features/payment-methods/format';
import {
    PAYMENT_METHOD_LABEL_MAX,
    PAYMENT_METHOD_REFERENCE_MAX,
    PAYMENT_METHOD_TYPES,
    type CreatePaymentMethodPayload,
    type PaymentMethod,
    type PaymentMethodType,
    type UpdatePaymentMethodPayload
} from '@/features/payment-methods/types';

export type PaymentMethodPayloadErrorCode =
    | 'accountRequired'
    | 'typeInvalid'
    | 'labelRequired'
    | 'labelTooLong'
    | 'labelDuplicate'
    | 'referenceTooLong'
    | 'lastFourInvalid'
    | 'expirationInvalid'
    | 'expirationPast'
    | 'isActiveRequired';

export type PaymentMethodFormFields = {
    accountPublicId: string;
    type: PaymentMethodType;
    label: string;
    reference: string;
    lastFourDigits: string;
    expirationDate: string | null;
    isActive: boolean;
};

export type BuildPaymentMethodPayloadOk<T> = { ok: true; payload: T };
export type BuildPaymentMethodPayloadFail = { ok: false; code: PaymentMethodPayloadErrorCode; field?: string };
export type BuildPaymentMethodPayloadResult<T> = BuildPaymentMethodPayloadOk<T> | BuildPaymentMethodPayloadFail;

const LAST4_RE = /^\d{4}$/;

export function normalizeLabel(raw: string | null | undefined): string {
    return (raw ?? '').trim();
}

export function parseLastFourDigits(raw: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return { ok: true, value: null };
    if (!LAST4_RE.test(trimmed)) return { ok: false };
    return { ok: true, value: trimmed };
}

export function isDuplicateLabel(
    label: string,
    items: readonly Pick<PaymentMethod, 'label' | 'publicId' | 'accountPublicId'>[],
    accountPublicId: string,
    excludePublicId?: string | null
): boolean {
    const needle = label.trim().toLowerCase();
    if (!needle) return false;
    return items.some((item) => {
        if (item.accountPublicId !== accountPublicId) return false;
        if (excludePublicId && item.publicId === excludePublicId) return false;
        return item.label.trim().toLowerCase() === needle;
    });
}

function fail(code: PaymentMethodPayloadErrorCode, field?: string): BuildPaymentMethodPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

function commonFields(
    fields: PaymentMethodFormFields,
    items: readonly Pick<PaymentMethod, 'label' | 'publicId' | 'accountPublicId'>[],
    options: { excludePublicId?: string | null; requireActiveNotExpired: boolean; now?: Date }
):
    | BuildPaymentMethodPayloadFail
    | {
          ok: true;
          type: PaymentMethodType;
          label: string;
          reference: string | null;
          lastFourDigits: string | null;
          expirationDate: string | null;
          isActive: boolean;
      } {
    if (!PAYMENT_METHOD_TYPES.includes(fields.type)) {
        return fail('typeInvalid', 'type');
    }
    const label = normalizeLabel(fields.label);
    if (!label) return fail('labelRequired', 'label');
    if (label.length > PAYMENT_METHOD_LABEL_MAX) return fail('labelTooLong', 'label');
    if (isDuplicateLabel(label, items, fields.accountPublicId, options.excludePublicId)) {
        return fail('labelDuplicate', 'label');
    }

    const reference = emptyToNull(fields.reference);
    if (reference && reference.length > PAYMENT_METHOD_REFERENCE_MAX) {
        return fail('referenceTooLong', 'reference');
    }

    const last4 = parseLastFourDigits(fields.lastFourDigits);
    if (!last4.ok) return fail('lastFourInvalid', 'lastFourDigits');

    const expirationDate = emptyToNull(fields.expirationDate);
    if (expirationDate && !isValidYmd(expirationDate)) {
        return fail('expirationInvalid', 'expirationDate');
    }
    if (options.requireActiveNotExpired && fields.isActive && isExpirationStrictlyBeforeTodayUtc(expirationDate, options.now)) {
        return fail('expirationPast', 'expirationDate');
    }

    return {
        ok: true,
        type: fields.type,
        label,
        reference,
        lastFourDigits: last4.value,
        expirationDate,
        isActive: fields.isActive
    };
}

export function buildCreatePaymentMethodPayload(
    fields: PaymentMethodFormFields,
    items: readonly Pick<PaymentMethod, 'label' | 'publicId' | 'accountPublicId'>[] = [],
    now?: Date
): BuildPaymentMethodPayloadResult<CreatePaymentMethodPayload> {
    const accountPublicId = fields.accountPublicId.trim();
    if (!accountPublicId) return fail('accountRequired', 'accountPublicId');

    const common = commonFields(fields, items, { requireActiveNotExpired: fields.isActive !== false, now });
    if (!common.ok) return common;

    const payload: CreatePaymentMethodPayload = {
        accountPublicId,
        type: common.type,
        label: common.label,
        reference: common.reference,
        lastFourDigits: common.lastFourDigits,
        expirationDate: common.expirationDate,
        isActive: common.isActive
    };
    return { ok: true, payload };
}

export function buildUpdatePaymentMethodPayload(
    fields: PaymentMethodFormFields,
    items: readonly Pick<PaymentMethod, 'label' | 'publicId' | 'accountPublicId'>[] = [],
    excludePublicId?: string | null,
    now?: Date
): BuildPaymentMethodPayloadResult<UpdatePaymentMethodPayload> {
    if (typeof fields.isActive !== 'boolean') {
        return fail('isActiveRequired', 'isActive');
    }
    const common = commonFields(fields, items, {
        excludePublicId,
        requireActiveNotExpired: fields.isActive,
        now
    });
    if (!common.ok) return common;

    const payload: UpdatePaymentMethodPayload = {
        type: common.type,
        label: common.label,
        reference: common.reference,
        lastFourDigits: common.lastFourDigits,
        expirationDate: common.expirationDate,
        isActive: common.isActive
    };
    return { ok: true, payload };
}

/**
 * True si le formulaire d’édition diffère des valeurs actuelles du moyen de paiement.
 * (`accountPublicId` n’est pas éditable à la mise à jour.)
 */
export function isPaymentMethodFormDirty(
    method: Pick<PaymentMethod, 'type' | 'label' | 'reference' | 'lastFourDigits' | 'expirationDate' | 'isActive'>,
    fields: PaymentMethodFormFields
): boolean {
    if (fields.type !== method.type) return true;
    if (normalizeLabel(fields.label) !== normalizeLabel(method.label)) return true;
    if (emptyToNull(fields.reference) !== emptyToNull(method.reference)) return true;

    const formLast4 = parseLastFourDigits(fields.lastFourDigits);
    const currentLast4 = emptyToNull(method.lastFourDigits);
    if (!formLast4.ok || formLast4.value !== currentLast4) return true;

    if (emptyToNull(fields.expirationDate) !== emptyToNull(method.expirationDate)) return true;
    if (fields.isActive !== method.isActive) return true;
    return false;
}
