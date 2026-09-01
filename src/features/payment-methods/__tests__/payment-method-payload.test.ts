import { describe, expect, it } from 'vitest';
import {
    buildCreatePaymentMethodPayload,
    buildUpdatePaymentMethodPayload,
    isDuplicateLabel,
    parseLastFourDigits
} from '@/features/payment-methods/payload';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { PaymentMethodFormFields as FormFields } from '@/features/payment-methods/payload';

function fields(partial: Partial<FormFields> = {}): FormFields {
    return {
        accountPublicId: 'acc-1',
        type: 'carte',
        label: 'Visa perso',
        reference: '',
        lastFourDigits: '4242',
        expirationDate: '2029-12-01',
        isActive: true,
        ...partial
    };
}

function method(partial: Partial<PaymentMethod> = {}): PaymentMethod {
    return {
        publicId: 'pm-1',
        accountPublicId: 'acc-1',
        type: 'carte',
        label: 'Visa perso',
        reference: null,
        lastFourDigits: '4242',
        expirationDate: '2029-12-01',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('payment-method payload', () => {
    it('trim le libellé et accepte last4 à 4 chiffres', () => {
        const result = buildCreatePaymentMethodPayload(fields({ label: '  Visa perso  ' }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.label).toBe('Visa perso');
            expect(result.payload.lastFourDigits).toBe('4242');
            expect(result.payload.isActive).toBe(true);
        }
    });

    it('refuse last4 incomplet', () => {
        expect(parseLastFourDigits('12')).toEqual({ ok: false });
        const result = buildCreatePaymentMethodPayload(fields({ lastFourDigits: '12' }));
        expect(result).toMatchObject({ ok: false, code: 'lastFourInvalid' });
    });

    it('détecte un libellé dupliqué insensible à la casse', () => {
        expect(isDuplicateLabel('VISA PERSO', [method()], 'acc-1')).toBe(true);
        expect(isDuplicateLabel('VISA PERSO', [method()], 'acc-1', 'pm-1')).toBe(false);
        const result = buildCreatePaymentMethodPayload(fields({ label: 'visa perso' }), [method()]);
        expect(result).toMatchObject({ ok: false, code: 'labelDuplicate' });
    });

    it('PUT exige isActive et envoie les null pour vider', () => {
        const result = buildUpdatePaymentMethodPayload(
            fields({ reference: '  ', lastFourDigits: '', expirationDate: null, isActive: false })
        );
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({
                type: 'carte',
                label: 'Visa perso',
                reference: null,
                lastFourDigits: null,
                expirationDate: null,
                isActive: false
            });
        }
    });

    it('refuse une expiration passée si le moyen est actif (UTC)', () => {
        const now = new Date('2026-09-01T00:00:00.000Z');
        const result = buildCreatePaymentMethodPayload(fields({ expirationDate: '2026-08-31', isActive: true }), [], now);
        expect(result).toMatchObject({ ok: false, code: 'expirationPast' });
        const inactive = buildCreatePaymentMethodPayload(fields({ expirationDate: '2026-08-31', isActive: false }), [], now);
        expect(inactive.ok).toBe(true);
    });
});
