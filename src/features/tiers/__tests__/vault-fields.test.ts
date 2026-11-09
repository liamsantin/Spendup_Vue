import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { createVaultSetup, isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import type { VaultStatus } from '@/features/vault/types';
import type { Tier, TierWritePayload } from '@/features/tiers/types';

const authMock = vi.hoisted(() => ({ user: { userPublicId: 'U1', hasPassword: true } }));
const apiMock = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));
vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));

import { decryptTierFields, encryptTierPayload, needsTierVaultWrite } from '@/features/tiers/vault-fields';

function payload(overrides: Partial<TierWritePayload> = {}): TierWritePayload {
    return {
        name: 'Dr Martin',
        nature: 'person',
        email: 'martin@exemple.ch',
        phone: '+41 21 000 00 00',
        website: 'https://martin.ch',
        notes: 'Rendez-vous le mardi',
        roles: ['medecin'],
        person: { firstName: 'Paul', lastName: 'Martin', birthDate: null },
        company: null,
        organization: null,
        bank: null,
        ...overrides
    };
}

function tier(source: TierWritePayload & { publicId: string }): Tier {
    const { publicId, name, nature, email, phone, website, notes, roles, person, company, organization } = source;
    return {
        publicId,
        name,
        nature,
        email,
        phone,
        website,
        notes,
        roles,
        person,
        company,
        organization,
        bank: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null
    };
}

async function status(scope: 'core' | 'extended'): Promise<VaultStatus> {
    const { setup } = await createVaultSetup('Secret123');
    return {
        exists: true,
        state: 'active',
        version: 1,
        kdf: setup.kdf,
        iterations: setup.iterations,
        memoryKiB: null,
        parallelism: null,
        salt: setup.salt,
        dekWrappedPassword: setup.dekWrappedPassword,
        recoverySalt: null,
        dekWrappedRecovery: null,
        hasRecovery: false,
        recoveryCreatedAt: null,
        locked: false,
        plan: scope === 'extended' ? 'plus' : 'free',
        allowedScope: scope,
        pendingCount: 0,
        activatedAt: null
    };
}

describe('champs étendus des tiers', () => {
    beforeEach(async () => {
        createTestPinia();
        apiMock.status.mockReset();
        const vault = useVaultStore();
        await vault.prepareRegistration('Secret123');
        await vault.commitRegistration();
    }, 20_000);

    it('offre plus : chiffre tier, tier_person et tier_company sur le publicId du tiers, puis relit', async () => {
        apiMock.status.mockResolvedValue(await status('extended'));
        const company = payload({
            nature: 'company',
            person: null,
            company: { legalName: 'Martin SA', vatNumber: 'CHE-123.456.789', companyRegistrationNumber: 'CH-550.1.123' }
        });
        expect(await needsTierVaultWrite(company)).toBe(true);

        const body = await encryptTierPayload('TIER-1', company);
        expect(isCipher(body.email)).toBe(true);
        expect(isCipher(body.phone)).toBe(true);
        expect(isCipher(body.website)).toBe(true);
        expect(isCipher(body.notes)).toBe(true);
        expect(isCipher(body.company?.vatNumber)).toBe(true);
        expect(isCipher(body.company?.companyRegistrationNumber)).toBe(true);
        expect(body.company?.legalName).toBe('Martin SA');
        expect(body.name).toBe('Dr Martin');

        const read = await decryptTierFields(tier({ ...body, publicId: 'TIER-1' }));
        expect(read.email).toBe('martin@exemple.ch');
        expect(read.company?.vatNumber).toBe('CHE-123.456.789');

        // Le publicId choisi par le client traverse le chiffrement inchangé (un seul POST).
        const withId = await encryptTierPayload('TIER-2', { ...payload(), publicId: 'TIER-2' });
        expect(withId.publicId).toBe('TIER-2');
        const person = await encryptTierPayload('TIER-2', payload());
        expect(isCipher(person.person?.firstName)).toBe(true);
        expect(isCipher(person.person?.lastName)).toBe(true);
        const readPerson = await decryptTierFields(tier({ ...person, publicId: 'TIER-2' }));
        expect(readPerson.person).toEqual({ firstName: 'Paul', lastName: 'Martin', birthDate: null });

        // Chiffré d’un autre tiers : illisible, laissé tel quel.
        const foreign = await decryptTierFields(tier({ ...person, publicId: 'TIER-9' }));
        expect(isCipher(foreign.email)).toBe(true);
    }, 20_000);

    it('offre free : rien n’est chiffré, pas de double appel à la création', async () => {
        apiMock.status.mockResolvedValue(await status('core'));
        const source = payload();
        expect(await needsTierVaultWrite(source)).toBe(false);
        expect(await encryptTierPayload('TIER-1', source)).toEqual(source);
    }, 20_000);
});
