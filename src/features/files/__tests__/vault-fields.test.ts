import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { createVaultSetup, isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import type { VaultStatus } from '@/features/vault/types';
import type { FileDto } from '@/features/files/types';

const authMock = vi.hoisted(() => ({ user: { userPublicId: 'U1', hasPassword: true } }));
const apiMock = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));
vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));

import { decryptFileFields, encryptFileUpdate } from '@/features/files/vault-fields';
import { decryptField } from '@/features/vault/crypto';

function file(overrides: Partial<FileDto> = {}): FileDto {
    return {
        publicId: 'FILE-1',
        nameOriginal: 'contrat.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        sha256Hash: 'abc',
        source: 'upload',
        status: 'active',
        documentDate: null,
        description: 'Bail 2026',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        ...overrides
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

describe('nom et description des fichiers (périmètre étendu)', () => {
    beforeEach(async () => {
        createTestPinia();
        apiMock.status.mockReset();
        const vault = useVaultStore();
        await vault.prepareRegistration('Secret123');
        await vault.commitRegistration();
    }, 20_000);

    it('offre plus : PATCH chiffré sur le publicId du fichier, relu en clair ; le PDF part chiffré avec son nom', async () => {
        apiMock.status.mockResolvedValue(await status('extended'));
        const vault = useVaultStore();

        const patch = await encryptFileUpdate('FILE-1', { nameOriginal: 'facture-dentiste.pdf' });
        expect(isCipher(patch.nameOriginal)).toBe(true);
        const update = await encryptFileUpdate('FILE-1', { description: 'Bail 2026', clearDocumentDate: true });
        expect(isCipher(update.description)).toBe(true);
        expect(update.clearDocumentDate).toBe(true);

        const read = await decryptFileFields(file({ nameOriginal: patch.nameOriginal as string, description: update.description ?? null }));
        expect(read.nameOriginal).toBe('facture-dentiste.pdf');
        expect(read.description).toBe('Bail 2026');

        const other = await decryptFileFields(file({ publicId: 'FILE-2', nameOriginal: patch.nameOriginal as string }));
        expect(isCipher(other.nameOriginal)).toBe(true);

        // Upload : le client choisit l’identifiant, le nom part chiffré dans le multipart, le contenu lié à cet identifiant.
        const publicId = '0f8fad5b-d9cb-469f-a165-70867728950e';
        const sealed = await vault.encryptPdf(
            new File([new TextEncoder().encode('%PDF-1.4 test')], 'x.pdf', { type: 'application/pdf' }),
            publicId
        );
        expect(isCipher(sealed?.name)).toBe(true);
        const keys = await vault.ensureReady();
        expect(await decryptField(keys!.dek, 'file', 'name_original', publicId, sealed!.name)).toEqual({ ok: true, value: 'x.pdf' });
        const back = await vault.decryptPdf(sealed as File, publicId);
        expect(back?.type).toBe('application/pdf');
        expect(await vault.decryptPdf(sealed as File, 'autre-id')).toBeNull();
    }, 20_000);

    it('offre free : nom, description et contenu restent en clair', async () => {
        apiMock.status.mockResolvedValue(await status('core'));
        const vault = useVaultStore();
        expect(await encryptFileUpdate('FILE-1', { nameOriginal: 'contrat.pdf', description: 'Bail' })).toEqual({
            nameOriginal: 'contrat.pdf',
            description: 'Bail'
        });
        expect(await vault.encryptPdf(new File(['%PDF-1.4'], 'x.pdf'), '0f8fad5b-d9cb-469f-a165-70867728950e')).toBeNull();
        const plain = new Blob([new TextEncoder().encode('%PDF-1.4 clair')], { type: 'application/pdf' });
        expect(await vault.decryptPdf(plain, 'FILE-1')).toBe(plain);
    }, 20_000);
});
