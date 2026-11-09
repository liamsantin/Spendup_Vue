import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { createVaultSetup, isCipher, unwrapDekWithSecret } from '@/features/vault/crypto';
import { clearVaultKeys } from '@/features/vault/key-storage';
import type { VaultStatus } from '@/features/vault/types';

const apiMock = vi.hoisted(() => ({
    status: vi.fn(),
    migrateBatch: vi.fn(),
    migrateWrite: vi.fn(),
    complete: vi.fn(),
    setRecovery: vi.fn(),
    setPasswordWrap: vi.fn()
}));

const authMock = vi.hoisted(() => ({ user: { userPublicId: 'U1' } as { userPublicId: string } | null }));

vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));

import { useVaultStore } from '@/features/vault/stores/vault-store';

async function statusFor(password: string, overrides: Partial<VaultStatus> = {}): Promise<VaultStatus> {
    const { setup } = await createVaultSetup(password);
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
        plan: 'free',
        allowedScope: 'core',
        pendingCount: 0,
        activatedAt: null,
        ...overrides
    };
}

describe('useVaultStore', () => {
    beforeEach(async () => {
        await clearVaultKeys();
        createTestPinia();
        Object.values(apiMock).forEach((fn) => fn.mockReset());
        authMock.user = { userPublicId: 'U1' };
    });

    it('verrouillé par défaut : encrypt / decrypt passent en clair, fingerprint null', async () => {
        apiMock.status.mockResolvedValue(await statusFor('Secret123', { exists: false }));
        const vault = useVaultStore();
        expect(vault.locked).toBe(true);
        expect(await vault.encrypt('account', 'iban', 'a1', 'CH93')).toBe('CH93');
        expect(await vault.decrypt('account', 'iban', 'a1', 'CH93')).toEqual({ ok: true, value: 'CH93' });
        expect(await vault.decrypt('account', 'iban', 'a1', 'enc:v1:AAAA')).toEqual({ ok: false, reason: 'unreadable' });
        expect(await vault.fingerprint('CH93')).toBeNull();
        expect(await vault.unlockWithPassword('Secret123')).toBe('absent');
        expect(vault.exists).toBe(false);
    }, 20_000);

    it('unlockWithPassword déballe la DEK, puis encrypt / decrypt / fingerprint fonctionnent ; lock efface tout', async () => {
        apiMock.status.mockResolvedValue(await statusFor('Secret123', { hasRecovery: true, allowedScope: 'extended' }));
        const vault = useVaultStore();

        expect(await vault.unlockWithPassword('Secret123')).toBe('unlocked');
        expect(vault.locked).toBe(false);
        expect(vault.exists).toBe(true);
        expect(vault.hasRecovery).toBe(true);
        expect(vault.allowedScope).toBe('extended');
        expect(vault.state).toBe('active');

        const cipher = await vault.encrypt('account', 'iban', 'a1', 'CH93 0076 2011 6238 5295 7');
        expect(isCipher(cipher)).toBe(true);
        expect(await vault.decrypt('account', 'iban', 'a1', cipher)).toEqual({ ok: true, value: 'CH93 0076 2011 6238 5295 7' });
        expect(await vault.decrypt('account', 'iban', 'a2', cipher)).toEqual({ ok: false, reason: 'unreadable' });
        expect(await vault.fingerprint('CH93 0076 2011 6238 5295 7')).toMatch(/^h:[A-Za-z0-9_-]{43}$/);
        expect(await vault.encrypt('account', 'iban', 'a1', null)).toBeNull();
        expect(await vault.encrypt('account', 'iban', 'a1', cipher)).toBe(cipher);

        // Déjà ouvert : pas de nouvelle dérivation.
        apiMock.status.mockClear();
        expect(await vault.unlockWithPassword('Secret123')).toBe('already');
        expect(apiMock.status).not.toHaveBeenCalled();

        vault.lock();
        expect(vault.locked).toBe(true);
        expect(vault.status).toBeNull();
        expect(await vault.decrypt('account', 'iban', 'a1', cipher)).toEqual({ ok: false, reason: 'unreadable' });
    }, 30_000);

    it('mauvais mot de passe → failed, Coffre toujours verrouillé', async () => {
        apiMock.status.mockResolvedValue(await statusFor('Secret123'));
        const vault = useVaultStore();
        expect(await vault.unlockWithPassword('Autre1234')).toBe('failed');
        expect(vault.locked).toBe(true);
    }, 20_000);

    it('inscription : prepareRegistration puis commitRegistration gardent les clés sans redériver', async () => {
        const vault = useVaultStore();
        const setup = await vault.prepareRegistration('Secret123');
        expect(setup).toMatchObject({ kdf: 'pbkdf2', iterations: 600_000 });
        expect(vault.locked).toBe(true);
        await vault.commitRegistration();
        expect(vault.locked).toBe(false);
        const cipher = await vault.encrypt('vehicle_asset', 'immatriculation', 'as1', 'VD 1');
        expect(await vault.decrypt('vehicle_asset', 'immatriculation', 'as1', cipher)).toEqual({ ok: true, value: 'VD 1' });
    }, 20_000);

    it('runMigration chiffre le reste puis complete et recharge l’état', async () => {
        apiMock.status
            .mockResolvedValueOnce(await statusFor('Secret123', { state: 'migrating', pendingCount: 1 }))
            .mockResolvedValue(await statusFor('Secret123', { state: 'active', pendingCount: 0 }));
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    {
                        table: 'account',
                        publicId: 'a1',
                        field: 'iban',
                        scope: 'core',
                        action: 'encrypt',
                        value: 'CH9300762011623852957',
                        version: 7
                    }
                ],
                remaining: 1
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 1, remaining: 0, state: 'migrating' });
        apiMock.complete.mockResolvedValue({ exists: true, state: 'active' });

        const vault = useVaultStore();
        await vault.unlockWithPassword('Secret123');
        expect(vault.state).toBe('migrating');
        await vault.runMigration();

        expect(apiMock.migrateWrite).toHaveBeenCalledTimes(1);
        expect(apiMock.complete).toHaveBeenCalledTimes(1);
        expect(vault.migration.running).toBe(false);
        expect(vault.migration.done).toBe(1);
        expect(vault.state).toBe('active');
        expect(vault.pendingCount).toBe(0);
    }, 30_000);

    it('rewrapForPassword ré-emballe avec le nouveau mot de passe et le sel actuel', async () => {
        const status = await statusFor('Secret123');
        apiMock.status.mockResolvedValue(status);
        const vault = useVaultStore();
        const wrap = await vault.rewrapForPassword('Secret123', 'Nouveau456');
        expect(wrap?.dekWrappedPassword).toMatch(/^[A-Za-z0-9_-]{80}$/);
        await expect(unwrapDekWithSecret('Nouveau456', status, wrap!.dekWrappedPassword)).resolves.toHaveLength(32);
        await expect(vault.rewrapForPassword('Faux12345', 'Nouveau456')).rejects.toMatchObject({ code: 'wrong_password' });
    }, 30_000);

    it('createRecoveryCode envoie recoverySalt + DEK emballée par le code, avec le mot de passe en preuve', async () => {
        const status = await statusFor('Secret123');
        apiMock.status.mockResolvedValue(status);
        apiMock.setRecovery.mockResolvedValue({ ...status, hasRecovery: true, recoveryCreatedAt: '2026-11-09T10:00:00Z' });
        const vault = useVaultStore();

        const code = await vault.createRecoveryCode('Secret123', { otp: '123456' });

        expect(code).toMatch(/^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/);
        const [body, proof] = apiMock.setRecovery.mock.calls[0] as [
            { recoverySalt: string; dekWrappedRecovery: string },
            { password: string; otp: string }
        ];
        expect(body.recoverySalt).toMatch(/^[A-Za-z0-9_-]{22}$/);
        expect(proof).toEqual({ password: 'Secret123', otp: '123456' });
        // Le code (sans tirets) déballe la DEK avec le sel de récupération.
        await expect(
            unwrapDekWithSecret(
                code.replace(/-/g, ''),
                { kdf: 'pbkdf2', iterations: 600_000, salt: body.recoverySalt },
                body.dekWrappedRecovery
            )
        ).resolves.toHaveLength(32);
        expect(vault.hasRecovery).toBe(true);
    }, 40_000);
});
