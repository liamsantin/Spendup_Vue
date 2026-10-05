import { describe, expect, it } from 'vitest';
import {
    bankChoiceRegistryId,
    dedupeRegistryBanks,
    isResolvableIban,
    isValidBic,
    isValidIid,
    preferredBankChoice,
    sameBankChoice
} from '@/features/banks/format';
import type { Bank } from '@/features/banks/types';
import type { Tier } from '@/features/tiers/types';

const ubs: Bank = {
    publicId: 'bank-00230',
    name: 'UBS Switzerland AG',
    bic: 'UBSWCHZH80A',
    iid: '00230',
    town: 'Zürich',
    countryCode: 'CH',
    isActive: true
};
const postFinance: Bank = { ...ubs, publicId: 'bank-09000', name: 'PostFinance AG', bic: 'POFICHBEXXX', iid: '09000', town: 'Bern' };

function bankTier(publicId: string, name: string, bankPublicId: string | null): Tier {
    return {
        publicId,
        name,
        nature: 'company',
        email: null,
        phone: null,
        website: null,
        notes: null,
        roles: ['banque'],
        person: null,
        company: null,
        organization: null,
        bank: { bankPublicId, bankName: bankPublicId ? 'UBS Switzerland AG' : null, bic: null, iid: null, countryCode: null },
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: null
    };
}

describe('banks format', () => {
    it('valide BIC (8 / 11) et IID (1 à 5 chiffres)', () => {
        expect(isValidBic('UBSWCHZH80A')).toBe(true);
        expect(isValidBic('revolt21')).toBe(true);
        expect(isValidBic('UBSWCHZH8')).toBe(false);
        expect(isValidIid('230')).toBe(true);
        expect(isValidIid('123456')).toBe(false);
        expect(isValidIid('12a')).toBe(false);
    });

    it('ne résout que les IBAN CH / LI complets', () => {
        expect(isResolvableIban('CH93 0076 2011 6238 5295 7')).toBe(true);
        expect(isResolvableIban('LI21 0881 0000 2324 013A A')).toBe(true);
        expect(isResolvableIban('CH93 0076 2011')).toBe(false);
        expect(isResolvableIban('DE89 3704 0044 0532 0130 00')).toBe(false);
    });

    it('préfère mon tier banque au référentiel, et le dédoublonne', () => {
        const mine = [bankTier('tier-ubs', 'Mon UBS', 'bank-00230')];
        expect(preferredBankChoice(ubs, mine)).toMatchObject({ kind: 'tier', tierPublicId: 'tier-ubs', name: 'Mon UBS' });
        expect(preferredBankChoice(postFinance, mine)).toEqual({ kind: 'registry', bankPublicId: 'bank-09000', name: 'PostFinance AG' });
        expect(dedupeRegistryBanks([ubs, postFinance], mine).map((bank) => bank.publicId)).toEqual(['bank-09000']);
    });

    it('compare les choix et expose l’établissement', () => {
        const tierChoice = preferredBankChoice(ubs, [bankTier('tier-ubs', 'Mon UBS', 'bank-00230')]);
        expect(bankChoiceRegistryId(tierChoice)).toBe('bank-00230');
        expect(bankChoiceRegistryId(preferredBankChoice(ubs, [bankTier('tier-x', 'Revolut', null)]))).toBe('bank-00230');
        expect(sameBankChoice(null, null)).toBe(true);
        expect(sameBankChoice(tierChoice, { ...tierChoice })).toBe(true);
        expect(sameBankChoice(tierChoice, null)).toBe(false);
    });
});
