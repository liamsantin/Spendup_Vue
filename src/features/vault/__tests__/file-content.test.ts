import { describe, expect, it } from 'vitest';
import { generateDekBytes, importVaultKeys } from '@/features/vault/crypto';
import { blobBytes, decryptFileBytes, decryptPdfBlob, encryptFileBytes, encryptPdfFile, looksLikePdf } from '@/features/vault/file-content';

const PDF = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

describe('contenu de PDF chiffré (périmètre étendu)', () => {
    it('chiffre en iv || chiffré || tag et déchiffre à l’identique ; une autre DEK échoue', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const sealed = await encryptFileBytes(keys.dek, PDF);
        expect(sealed.length).toBe(12 + PDF.length + 16);
        expect(looksLikePdf(sealed)).toBe(false);
        expect(Array.from((await decryptFileBytes(keys.dek, sealed)) ?? [])).toEqual(Array.from(PDF));

        const other = await importVaultKeys(generateDekBytes());
        expect(await decryptFileBytes(other.dek, sealed)).toBeNull();
        expect(await decryptFileBytes(keys.dek, sealed.subarray(0, 20))).toBeNull();
    });

    it('encryptPdfFile envoie un nom neutre et un type opaque ; decryptPdfBlob rend un PDF lisible', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const file = new File([PDF], 'facture-dentiste.pdf', { type: 'application/pdf' });
        const sealed = await encryptPdfFile(keys.dek, file);
        expect(sealed.name).toBe('document.pdf');
        expect(sealed.type).toBe('application/octet-stream');

        const readable = await decryptPdfBlob(keys.dek, sealed);
        expect(readable).not.toBeNull();
        expect(readable?.type).toBe('application/pdf');
        expect(looksLikePdf(await blobBytes(readable as Blob))).toBe(true);
    });

    it('un PDF en clair passe tel quel, un chiffré sans clé (Coffre fermé) donne null', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const plain = new Blob([PDF], { type: 'application/pdf' });
        expect(await decryptPdfBlob(null, plain)).toBe(plain);
        const sealed = new Blob([await encryptFileBytes(keys.dek, PDF)]);
        expect(await decryptPdfBlob(null, sealed)).toBeNull();
    });
});
