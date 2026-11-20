import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/utils/errors/app-error';
import { decryptField, encryptField, generateDekBytes, importVaultKeys, isCipher, type VaultKeys } from '@/features/vault/crypto';
import type { VaultMigrateItem, VaultMigrateWriteItem } from '@/features/vault/types';

const apiMock = vi.hoisted(() => ({
    migrateBatch: vi.fn(),
    migrateWrite: vi.fn(),
    complete: vi.fn()
}));

vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));

import { runVaultMigration } from '@/features/vault/migration';

function item(partial: Partial<VaultMigrateItem> & Pick<VaultMigrateItem, 'table' | 'field' | 'value'>): VaultMigrateItem {
    return { publicId: 'row-1', scope: 'core', action: 'encrypt', version: '1', ...partial };
}

describe('runVaultMigration', () => {
    let keys: VaultKeys;

    beforeEach(async () => {
        keys = await importVaultKeys(generateDekBytes());
        apiMock.migrateBatch.mockReset();
        apiMock.migrateWrite.mockReset();
        apiMock.complete.mockReset();
    });

    it('chiffre les éléments encrypt (empreinte pour account.iban), puis complete quand plus rien ne reste', async () => {
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    item({ table: 'account', field: 'iban', value: 'CH9300762011623852957' }),
                    item({ table: 'account', field: 'account_number', value: '12-345' }),
                    item({ table: 'vehicle_asset', field: 'immatriculation', publicId: 'as-1', value: 'VD 123' })
                ],
                remaining: 3
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 3, remaining: 0, state: 'migrating' });
        apiMock.complete.mockResolvedValue({ exists: true, state: 'active' });

        const progress: number[] = [];
        const outcome = await runVaultMigration(keys, 'migrating', (p) => progress.push(p.done));

        expect(outcome).toMatchObject({ applied: 3, skipped: 0, state: 'active', completed: true });
        const writes = apiMock.migrateWrite.mock.calls[0][0] as VaultMigrateWriteItem[];
        expect(writes).toHaveLength(3);
        expect(writes.every((w) => isCipher(w.value))).toBe(true);
        expect(writes[0].fingerprint).toMatch(/^h:[A-Za-z0-9_-]{43}$/);
        expect(writes[1].fingerprint).toBeNull();
        expect(writes[2].fingerprint).toBeNull();
        expect(writes[2].version).toBe('1');
        // Chiffré avec l’AAD attendu table:colonne:publicId.
        expect(await decryptField(keys.dek, 'vehicle_asset', 'immatriculation', 'as-1', writes[2].value as string)).toEqual({
            ok: true,
            value: 'VD 123'
        });
        expect(apiMock.complete).toHaveBeenCalledTimes(1);
        expect(progress.at(-1)).toBe(3);
    });

    it('déchiffre les éléments decrypt et renvoie le clair ; un illisible est ignoré sans complete', async () => {
        const good = await encryptField(keys.dek, 'asset', 'notes', 'as-9', 'secret');
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    item({ table: 'asset', field: 'notes', publicId: 'as-9', action: 'decrypt', value: good }),
                    item({ table: 'asset', field: 'notes', publicId: 'as-8', action: 'decrypt', value: 'enc:v1:AAAA' })
                ],
                remaining: 2
            })
            .mockResolvedValue({ items: [], remaining: 1 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 1, remaining: 1, state: 'migrating' });

        const outcome = await runVaultMigration(keys, 'migrating');

        expect(outcome).toMatchObject({ applied: 1, skipped: 1, completed: false });
        const writes = apiMock.migrateWrite.mock.calls[0][0] as VaultMigrateWriteItem[];
        expect(writes).toEqual([{ table: 'asset', publicId: 'as-9', field: 'notes', value: 'secret', version: '1' }]);
        expect(apiMock.complete).not.toHaveBeenCalled();
    });

    it('relit le lot après un 409 CONFLICT', async () => {
        apiMock.migrateBatch
            .mockResolvedValueOnce({ items: [item({ table: 'account', field: 'account_number', value: '1', version: '1' })], remaining: 1 })
            .mockResolvedValueOnce({ items: [item({ table: 'account', field: 'account_number', value: '1', version: '2' })], remaining: 1 })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite
            .mockRejectedValueOnce(new AppError('Conflit', 409, 'CONFLICT', { index: 0 }))
            .mockResolvedValueOnce({ applied: 1, remaining: 0, state: 'active' });

        const outcome = await runVaultMigration(keys, 'active');

        expect(apiMock.migrateWrite).toHaveBeenCalledTimes(2);
        expect((apiMock.migrateWrite.mock.calls[1][0] as VaultMigrateWriteItem[])[0].version).toBe('2');
        expect(outcome).toMatchObject({ applied: 1, state: 'active', completed: false });
        expect(apiMock.complete).not.toHaveBeenCalled();
    });

    it('ne complète pas un Coffre déjà actif et propage une erreur réseau', async () => {
        apiMock.migrateBatch.mockResolvedValue({ items: [], remaining: 0 });
        expect(await runVaultMigration(keys, 'active')).toMatchObject({ applied: 0, completed: false });
        expect(apiMock.complete).not.toHaveBeenCalled();

        apiMock.migrateBatch.mockRejectedValue(new AppError('Réseau', 0));
        await expect(runVaultMigration(keys, 'migrating')).rejects.toBeInstanceOf(AppError);
    });
});
