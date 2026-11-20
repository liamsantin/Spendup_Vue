import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { toBase64Url } from '@/features/vault/base64url';
import { createVaultSetup, deriveKek, encryptField, generateSalt, isCipher, unwrapDekWithSecret, wrapDek } from '@/features/vault/crypto';
import { clearVaultKeys } from '@/features/vault/key-storage';
import { generateRecoveryCode } from '@/features/vault/recovery-code';
import type { VaultSetupRequest, VaultStatus } from '@/features/vault/types';

const apiMock = vi.hoisted(() => ({
    status: vi.fn(),
    migrateBatch: vi.fn(),
    migrateWrite: vi.fn(),
    complete: vi.fn(),
    setRecovery: vi.fn(),
    setPasswordWrap: vi.fn(),
    create: vi.fn(),
    disable: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn()
}));

const authMock = vi.hoisted(() => ({
    user: { userPublicId: 'U1', hasPassword: true } as { userPublicId: string; hasPassword: boolean } | null
}));

vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));

import { useVaultStore } from '@/features/vault/stores/vault-store';

function statusFrom(setup: VaultSetupRequest, overrides: Partial<VaultStatus> = {}): VaultStatus {
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
        plan: 'plus',
        allowedScope: 'extended',
        pendingCount: 0,
        activatedAt: null,
        ...overrides
    };
}

describe('useVaultStore — phrase Google, secours, remise à zéro, désactivation', () => {
    beforeEach(async () => {
        await clearVaultKeys();
        createTestPinia();
        Object.values(apiMock).forEach((fn) => fn.mockReset());
        authMock.user = { userPublicId: 'U1', hasPassword: true };
    });

    it('createWithSecret : POST /api/vault avec une DEK neuve emballée par la phrase, clés gardées sur l’appareil', async () => {
        authMock.user = { userPublicId: 'U1', hasPassword: false };
        apiMock.create.mockImplementation(async (setup: VaultSetupRequest) => statusFrom(setup, { state: 'migrating', pendingCount: 2 }));
        apiMock.status.mockImplementation(async () => statusFrom(apiMock.create.mock.calls[0][0] as VaultSetupRequest));
        apiMock.migrateBatch.mockResolvedValue({ items: [], remaining: 0 });
        const vault = useVaultStore();

        await vault.createWithSecret('ma phrase de coffre très longue');

        expect(apiMock.create).toHaveBeenCalledTimes(1);
        const [setup, stepUp] = apiMock.create.mock.calls[0] as [VaultSetupRequest, unknown];
        expect(setup.kdf).toBe('pbkdf2');
        expect(stepUp).toBeUndefined();
        expect(vault.active).toBe(true);
        expect(vault.exists).toBe(true);
        // La phrase déballe bien la DEK envoyée, et les clés en mémoire chiffrent / déchiffrent.
        await expect(unwrapDekWithSecret('ma phrase de coffre très longue', setup, setup.dekWrappedPassword)).resolves.toHaveLength(32);
        const cipher = await vault.encrypt('tier', 'email', 'T1', 'a@b.ch');
        expect(isCipher(cipher)).toBe(true);
        expect(await vault.decrypt('tier', 'email', 'T1', cipher)).toEqual({ ok: true, value: 'a@b.ch' });
    }, 20_000);

    it('unlockWithPassword renvoie lost quand l’emballage par mot de passe a disparu ; restoreWithRecoveryCode le recrée', async () => {
        const { setup, keys } = await createVaultSetup('Secret123');
        const dekBytes = await unwrapDekWithSecret('Secret123', setup, setup.dekWrappedPassword);
        const code = generateRecoveryCode();
        const recoverySalt = generateSalt();
        const dekWrappedRecovery = await wrapDek(dekBytes, await deriveKek(code, recoverySalt));
        const lostStatus = statusFrom(setup, {
            dekWrappedPassword: null,
            recoverySalt: toBase64Url(recoverySalt),
            dekWrappedRecovery,
            hasRecovery: true
        });
        apiMock.status.mockResolvedValue(lostStatus);
        const vault = useVaultStore();

        expect(await vault.unlockWithPassword('Nouveau456')).toBe('lost');
        expect(vault.passwordWrapLost).toBe(true);
        expect(vault.locked).toBe(true);

        apiMock.setPasswordWrap.mockImplementation(async (body: { dekWrappedPassword: string }) =>
            statusFrom(setup, { ...lostStatus, dekWrappedPassword: body.dekWrappedPassword })
        );
        apiMock.migrateBatch.mockResolvedValue({ items: [], remaining: 0 });
        await vault.restoreWithRecoveryCode(code, 'Nouveau456', { password: 'Nouveau456' });

        const [body, stepUp] = apiMock.setPasswordWrap.mock.calls[0] as [{ dekWrappedPassword: string }, unknown];
        expect(stepUp).toEqual({ password: 'Nouveau456' });
        // Même DEK, ré-emballée avec le nouveau mot de passe et le sel d’origine.
        await expect(unwrapDekWithSecret('Nouveau456', setup, body.dekWrappedPassword)).resolves.toEqual(
            await unwrapDekWithSecret('Secret123', setup, setup.dekWrappedPassword)
        );
        expect(vault.active).toBe(true);
        expect(vault.passwordWrapLost).toBe(false);
        const before = await encryptField(keys.dek, 'account', 'iban', 'A1', 'CH93');
        expect(await vault.decrypt('account', 'iban', 'A1', before)).toEqual({ ok: true, value: 'CH93' });

        // Un mauvais code : erreur typée, rien d’envoyé.
        apiMock.setPasswordWrap.mockClear();
        await expect(vault.restoreWithRecoveryCode(generateRecoveryCode(), 'x')).rejects.toMatchObject({ code: 'wrong_password' });
        expect(apiMock.setPasswordWrap).not.toHaveBeenCalled();
    }, 30_000);

    it('resetVault : POST /api/vault/reset avec un Coffre neuf, les anciennes clés sont oubliées', async () => {
        const { setup } = await createVaultSetup('Secret123');
        apiMock.status.mockResolvedValue(statusFrom(setup, { dekWrappedPassword: null, locked: true }));
        apiMock.reset.mockImplementation(async (fresh: VaultSetupRequest) => statusFrom(fresh, { state: 'active' }));
        apiMock.migrateBatch.mockResolvedValue({ items: [], remaining: 0 });
        const vault = useVaultStore();
        expect(await vault.unlockWithPassword('Secret123')).toBe('lost');

        await vault.resetVault('Secret123', { password: 'Secret123' });

        const [fresh] = apiMock.reset.mock.calls[0] as [VaultSetupRequest];
        expect(fresh.dekWrappedPassword).not.toBe(setup.dekWrappedPassword);
        expect(vault.active).toBe(true);
        expect(vault.lost).toBe(false);
        expect(vault.passwordWrapLost).toBe(false);
    }, 20_000);

    it('disableVault : disable, lots decrypt jusqu’à zéro, puis DELETE ; l’erreur du DELETE remonte telle quelle', async () => {
        const { setup, keys } = await createVaultSetup('Secret123');
        const iban = await encryptField(keys.dek, 'account', 'iban', 'A1', 'CH9300762011623852957');
        const notes = await encryptField(keys.dek, 'tier', 'notes', 'T1', 'Confidentiel');
        // Connexion, début de désactivation (encore active), fin des lots, puis Coffre supprimé.
        apiMock.status
            .mockResolvedValueOnce(statusFrom(setup, { pendingCount: 0 }))
            .mockResolvedValueOnce(statusFrom(setup, { pendingCount: 0 }))
            .mockResolvedValueOnce(statusFrom(setup, { state: 'disabling', pendingCount: 0 }))
            .mockResolvedValue(statusFrom(setup, { exists: false, state: null }));
        apiMock.disable.mockResolvedValue(statusFrom(setup, { state: 'disabling', pendingCount: 2 }));
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    { table: 'account', publicId: 'A1', field: 'iban', scope: 'core', action: 'decrypt', value: iban, version: '1' },
                    { table: 'tier', publicId: 'T1', field: 'notes', scope: 'extended', action: 'decrypt', value: notes, version: '1' }
                ],
                remaining: 2
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 2, remaining: 0, state: 'disabling' });
        apiMock.remove.mockResolvedValue(undefined);
        const vault = useVaultStore();
        expect(await vault.unlockWithPassword('Secret123')).toBe('unlocked');

        await vault.disableVault({ password: 'Secret123' });

        expect(apiMock.disable).toHaveBeenCalledWith({ password: 'Secret123' });
        const writes = apiMock.migrateWrite.mock.calls[0][0] as { value: string | null }[];
        expect(writes.map((w) => w.value)).toEqual(['CH9300762011623852957', 'Confidentiel']);
        expect(apiMock.remove).toHaveBeenCalledWith({ password: 'Secret123' });
        expect(apiMock.complete).not.toHaveBeenCalled();
        expect(vault.locked).toBe(true);
        expect(vault.exists).toBe(false);
        expect(vault.disabling.step).toBe('done');
    }, 30_000);

    it('disableVault : une valeur illisible bloque avant le DELETE avec un message explicite', async () => {
        const { setup } = await createVaultSetup('Secret123');
        apiMock.status
            .mockResolvedValueOnce(statusFrom(setup))
            .mockResolvedValueOnce(statusFrom(setup, { state: 'disabling', pendingCount: 1 }))
            .mockResolvedValue(statusFrom(setup, { state: 'disabling', pendingCount: 1 }));
        apiMock.disable.mockResolvedValue(statusFrom(setup, { state: 'disabling', pendingCount: 1 }));
        apiMock.migrateBatch.mockResolvedValue({
            items: [
                {
                    table: 'account',
                    publicId: 'A1',
                    field: 'iban',
                    scope: 'core',
                    action: 'decrypt',
                    value: 'enc:v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                    version: '1'
                }
            ],
            remaining: 1
        });
        const vault = useVaultStore();
        expect(await vault.unlockWithPassword('Secret123')).toBe('unlocked');

        await expect(vault.disableVault({ password: 'Secret123' })).rejects.toMatchObject({ code: 'VAULT_PENDING' });
        expect(apiMock.remove).not.toHaveBeenCalled();
        expect(vault.disabling.step).toBe('idle');
        expect(vault.active).toBe(true);
    }, 20_000);
});
