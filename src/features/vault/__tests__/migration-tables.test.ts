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

function item(partial: Partial<VaultMigrateItem> & Pick<VaultMigrateItem, 'table' | 'field' | 'publicId' | 'value'>): VaultMigrateItem {
    return { scope: 'extended', action: 'encrypt', version: '7', ...partial };
}

describe('migration multi-tables', () => {
    let keys: VaultKeys;

    beforeEach(async () => {
        keys = await importVaultKeys(generateDekBytes());
        apiMock.migrateBatch.mockReset();
        apiMock.migrateWrite.mockReset();
        apiMock.complete.mockReset();
    });

    it('chiffre un lot mêlant comptes, tiers, fichiers et biens avec l’AAD propre à chaque table', async () => {
        const items = [
            item({ table: 'account', field: 'iban', publicId: 'ACC-1', value: 'CH9300762011623852957', scope: 'core' }),
            item({ table: 'tier', field: 'email', publicId: 'TIER-1', value: 'contact@exemple.ch' }),
            item({ table: 'tier_person', field: 'first_name', publicId: 'TIER-2', value: 'Léa' }),
            item({ table: 'tier_company', field: 'vat_number', publicId: 'TIER-3', value: 'CHE-123.456.789' }),
            item({ table: 'file', field: 'name_original', publicId: 'FILE-1', value: 'contrat.pdf' }),
            item({ table: 'real_estate_asset', field: 'ville', publicId: 'AS-1', value: 'Lausanne' }),
            item({ table: 'valuable_item_asset', field: 'storage_location', publicId: 'AS-2', value: 'Coffre banque' }),
            item({ table: 'attachment', field: 'name_fichier', publicId: 'ATT-1', value: 'ticket.pdf' })
        ];
        apiMock.migrateBatch.mockResolvedValueOnce({ items, remaining: items.length }).mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: items.length, remaining: 0, state: 'migrating' });
        apiMock.complete.mockResolvedValue({ exists: true, state: 'active' });

        const outcome = await runVaultMigration(keys, 'migrating');

        expect(outcome).toMatchObject({ applied: items.length, skipped: 0, completed: true, state: 'active' });
        const writes = apiMock.migrateWrite.mock.calls[0][0] as VaultMigrateWriteItem[];
        expect(writes).toHaveLength(items.length);
        for (const [index, write] of writes.entries()) {
            const source = items[index];
            expect(write).toMatchObject({ table: source.table, publicId: source.publicId, field: source.field, version: '7' });
            expect(isCipher(write.value)).toBe(true);
            // Lisible avec l’AAD de sa table / colonne / ligne, et pas avec une autre.
            expect(await decryptField(keys.dek, source.table, source.field, source.publicId, write.value as string)).toEqual({
                ok: true,
                value: source.value
            });
            expect((await decryptField(keys.dek, source.table, source.field, 'AUTRE', write.value as string)).ok).toBe(false);
        }
        expect(writes[0].fingerprint).toMatch(/^h:/);
        expect(writes.slice(1).every((w) => w.fingerprint == null)).toBe(true);
    });

    it('changement d’offre vers le bas : les champs étendus reviennent en clair par les mêmes lots, le socle reste', async () => {
        const email = await encryptField(keys.dek, 'tier', 'email', 'TIER-1', 'contact@exemple.ch');
        const notes = await encryptField(keys.dek, 'asset', 'notes', 'AS-1', 'Clé sous le pot');
        const name = await encryptField(keys.dek, 'file', 'name_original', 'FILE-1', 'contrat.pdf');
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    item({ table: 'tier', field: 'email', publicId: 'TIER-1', value: email, action: 'decrypt' }),
                    item({ table: 'asset', field: 'notes', publicId: 'AS-1', value: notes, action: 'decrypt' }),
                    item({ table: 'file', field: 'name_original', publicId: 'FILE-1', value: name, action: 'decrypt' })
                ],
                remaining: 3
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 3, remaining: 0, state: 'active' });

        const outcome = await runVaultMigration(keys, 'active');

        expect(outcome).toMatchObject({ applied: 3, skipped: 0, completed: false });
        const writes = apiMock.migrateWrite.mock.calls[0][0] as VaultMigrateWriteItem[];
        expect(writes.map((w) => w.value)).toEqual(['contact@exemple.ch', 'Clé sous le pot', 'contrat.pdf']);
        expect(apiMock.complete).not.toHaveBeenCalled();
    });

    it('désactivation : tout est déchiffré, sans appel à complete', async () => {
        const iban = await encryptField(keys.dek, 'account', 'iban', 'ACC-1', 'CH9300762011623852957');
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [item({ table: 'account', field: 'iban', publicId: 'ACC-1', value: iban, action: 'decrypt', scope: 'core' })],
                remaining: 1
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite.mockResolvedValue({ applied: 1, remaining: 0, state: 'disabling' });

        const outcome = await runVaultMigration(keys, 'disabling');

        expect(outcome).toMatchObject({ applied: 1, state: 'disabling', completed: false });
        expect((apiMock.migrateWrite.mock.calls[0][0] as VaultMigrateWriteItem[])[0].value).toBe('CH9300762011623852957');
        expect(apiMock.complete).not.toHaveBeenCalled();
    });

    it('un 409 sur un lot multi-tables relit le lot avec les nouvelles versions', async () => {
        apiMock.migrateBatch
            .mockResolvedValueOnce({
                items: [
                    item({ table: 'tier', field: 'phone', publicId: 'TIER-1', value: '+41 21 000 00 00', version: '1' }),
                    item({ table: 'file', field: 'description', publicId: 'FILE-1', value: 'Bail 2026', version: '1' })
                ],
                remaining: 2
            })
            .mockResolvedValueOnce({
                items: [
                    item({ table: 'tier', field: 'phone', publicId: 'TIER-1', value: '+41 21 000 00 00', version: '1' }),
                    item({ table: 'file', field: 'description', publicId: 'FILE-1', value: 'Bail 2026 (révisé)', version: '2' })
                ],
                remaining: 2
            })
            .mockResolvedValue({ items: [], remaining: 0 });
        apiMock.migrateWrite
            .mockRejectedValueOnce(
                new AppError('Conflit', 409, 'CONFLICT', { index: 1, table: 'file', publicId: 'FILE-1', currentVersion: 2 })
            )
            .mockResolvedValueOnce({ applied: 2, remaining: 0, state: 'active' });

        const outcome = await runVaultMigration(keys, 'active');

        expect(apiMock.migrateWrite).toHaveBeenCalledTimes(2);
        const retried = apiMock.migrateWrite.mock.calls[1][0] as VaultMigrateWriteItem[];
        expect(retried[1].version).toBe('2');
        expect(await decryptField(keys.dek, 'file', 'description', 'FILE-1', retried[1].value as string)).toEqual({
            ok: true,
            value: 'Bail 2026 (révisé)'
        });
        expect(outcome).toMatchObject({ applied: 2, completed: false });
    });
});
