import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import type { Account } from '@/features/accounts/types';

const authMock = vi.hoisted(() => ({ user: { userPublicId: 'U1' } }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));
vi.mock('@/features/vault/api', () => ({ vaultApi: { status: vi.fn() } }));

import { buildPostCreateUpdatePayload, decryptAccountFields, encryptAccountPayload } from '@/features/accounts/vault-fields';
import { decryptAssetFields, encryptAssetPayload, stripSensitiveAssetFields } from '@/features/assets/vault-fields';
import type { Asset } from '@/features/assets/types';

function account(overrides: Partial<Account> = {}): Account {
    return {
        publicId: 'acc-1',
        name: 'Courant',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 0,
        iban: null,
        accountNumber: null,
        color: null,
        institutionTierPublicId: null,
        institutionName: null,
        bank: null,
        isPrimary: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        hiddenFields: [],
        ...overrides
    };
}

describe('champs du socle des comptes et des actifs', () => {
    beforeEach(async () => {
        createTestPinia();
        const vault = useVaultStore();
        await vault.prepareRegistration('Secret123');
        await vault.commitRegistration();
    }, 20_000);

    it('encryptAccountPayload chiffre iban + accountNumber avec l’empreinte, decryptAccountFields relit', async () => {
        const body = await encryptAccountPayload('acc-1', { iban: 'CH93 0076 2011 6238 5295 7', accountNumber: '12-345' });
        expect(isCipher(body.iban)).toBe(true);
        expect(isCipher(body.accountNumber)).toBe(true);
        expect(body.ibanFingerprint).toMatch(/^h:[A-Za-z0-9_-]{43}$/);

        const read = await decryptAccountFields(account({ iban: body.iban, accountNumber: body.accountNumber }));
        expect(read.iban).toBe('CH93 0076 2011 6238 5295 7');
        expect(read.accountNumber).toBe('12-345');
    });

    it('un chiffré d’une autre ligne reste tel quel (illisible) ; un compte partagé n’est pas déchiffré', async () => {
        const body = await encryptAccountPayload('acc-2', { iban: 'CH9300762011623852957', accountNumber: null });
        const unreadable = await decryptAccountFields(account({ iban: body.iban }));
        expect(unreadable.iban).toBe(body.iban);

        const own = await encryptAccountPayload('acc-1', { iban: 'CH9300762011623852957', accountNumber: null });
        const shared = await decryptAccountFields(account({ iban: own.iban, isOwned: false, myRole: 'viewer' }));
        expect(shared.iban).toBe(own.iban);
    });

    it('vide / null / déjà chiffré : inchangés, sans empreinte', async () => {
        const body = await encryptAccountPayload('acc-1', { iban: '', accountNumber: null });
        expect(body).toEqual({ iban: '', accountNumber: null });
        const cipher = await encryptAccountPayload('acc-1', { iban: 'enc:v1:AAAA', accountNumber: null });
        expect(cipher.iban).toBe('enc:v1:AAAA');
        expect(cipher.ibanFingerprint).toBeUndefined();
    });

    it('buildPostCreateUpdatePayload reconstruit l’état complet à partir du compte créé', () => {
        const created = account({
            publicId: 'acc-9',
            color: '#112233',
            bank: { tierPublicId: 'tier-1', name: 'UBS', bankPublicId: 'bank-00230', bankName: 'UBS', bic: null, iid: null }
        });
        const body = buildPostCreateUpdatePayload(created, {
            name: 'Courant',
            type: 'courant',
            initialBalance: 10,
            iban: 'CH93',
            accountNumber: '1',
            bankPublicId: 'bank-00230'
        });
        expect(body).toEqual({
            name: 'Courant',
            type: 'courant',
            currency: 'CHF',
            initialBalance: 0,
            iban: 'CH93',
            accountNumber: '1',
            color: '#112233',
            isPrimary: true,
            institutionTierPublicId: 'tier-1'
        });
    });

    it('plaque de véhicule : chiffrée sur le publicId de l’actif, relue, retirée du POST', async () => {
        const vehicle = {
            brand: 'VW',
            model: 'Golf',
            vehicleType: 'voiture' as const,
            fuel: null,
            firstRegistrationYear: null,
            plate: 'VD 12345',
            currentMileage: null
        };
        const payload = { name: 'Golf', type: 'vehicule' as Asset['type'], estimatedValue: 1, vehicle };
        const stripped = stripSensitiveAssetFields(payload);
        expect(stripped.vehicle?.plate).toBeNull();

        const body = await encryptAssetPayload('as-1', payload);
        expect(isCipher(body.vehicle?.plate)).toBe(true);

        const asset = { publicId: 'as-1', vehicle: { ...vehicle, plate: body.vehicle!.plate } } as unknown as Asset;
        expect((await decryptAssetFields(asset)).vehicle?.plate).toBe('VD 12345');
        const other = { publicId: 'as-2', vehicle: { ...vehicle, plate: body.vehicle!.plate } } as unknown as Asset;
        expect((await decryptAssetFields(other)).vehicle?.plate).toBe(body.vehicle!.plate);
    });
});
