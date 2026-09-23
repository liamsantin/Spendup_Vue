import { describe, expect, it } from 'vitest';
import {
    PAYMENT_METHOD_SORT_DEFAULT,
    matchesPaymentMethodSearch,
    parsePaymentMethodSort,
    sortPaymentMethodsBy,
    type PaymentMethodLabels
} from '@/features/payment-methods/format';
import type { PaymentMethod } from '@/features/payment-methods/types';

function method(partial: Partial<PaymentMethod> & Pick<PaymentMethod, 'publicId' | 'label'>): PaymentMethod {
    return {
        accountPublicId: 'acc-a',
        type: 'carte',
        reference: null,
        lastFourDigits: null,
        expirationDate: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        ...partial
    };
}

const labels: PaymentMethodLabels = {
    accountName: (id) => (id === 'acc-a' ? 'Courant' : 'Épargne'),
    typeLabel: (type) => (type === 'carte' ? 'Carte' : 'TWINT')
};

const items = [
    method({ publicId: '1', label: 'Visa', accountPublicId: 'acc-b', expirationDate: '2027-01-31' }),
    method({ publicId: '2', label: 'Twint perso', type: 'twint', lastFourDigits: '4242' }),
    method({ publicId: '3', label: 'Ancienne carte', isActive: false, expirationDate: '2025-06-30' })
];

describe('payment methods sort & search', () => {
    it('trie par compte par défaut, actifs avant inactifs', () => {
        expect(sortPaymentMethodsBy(items, PAYMENT_METHOD_SORT_DEFAULT, labels).map((item) => item.publicId)).toEqual(['2', '3', '1']);
    });

    it('trie par libellé, type et expiration', () => {
        expect(sortPaymentMethodsBy(items, 'labelAsc', labels).map((item) => item.label)).toEqual(['Ancienne carte', 'Twint perso', 'Visa']);
        expect(sortPaymentMethodsBy(items, 'typeDesc', labels)[0].type).toBe('twint');
        expect(sortPaymentMethodsBy(items, 'expirationAsc', labels).map((item) => item.publicId)).toEqual(['3', '1', '2']);
    });

    it('retombe sur le tri par défaut pour une valeur inconnue', () => {
        expect(parsePaymentMethodSort('nope')).toBe(PAYMENT_METHOD_SORT_DEFAULT);
    });

    it('cherche dans le libellé, les 4 chiffres, le type et le compte', () => {
        expect(matchesPaymentMethodSearch(items[1], '4242', labels)).toBe(true);
        expect(matchesPaymentMethodSearch(items[0], 'epargne', labels)).toBe(true);
        expect(matchesPaymentMethodSearch(items[1], 'twint', labels)).toBe(true);
        expect(matchesPaymentMethodSearch(items[0], 'mastercard', labels)).toBe(false);
    });
});
