import { describe, expect, it } from 'vitest';
import { VAULT_FILE_CONTENT_AAD, fileContentAad } from '@/features/vault/catalog';
import { decryptField, generateDekBytes, importVaultKeys } from '@/features/vault/crypto';
import { blobBytes, decryptFileBytes, decryptPdfBlob, encryptFileBytes, encryptPdfFile, looksLikePdf } from '@/features/vault/file-content';

const PDF = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('contenu de PDF chiffré (périmètre étendu)', () => {
    it('chiffre en iv || chiffré || tag avec l’AAD file:content:<publicId> ; autre DEK ou autre AAD échouent', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const aad = fileContentAad(ID);
        expect(aad).toBe(`file:content:${ID}`);
        const sealed = await encryptFileBytes(keys.dek, PDF, aad);
        expect(sealed.length).toBe(12 + PDF.length + 16);
        expect(looksLikePdf(sealed)).toBe(false);
        expect(Array.from((await decryptFileBytes(keys.dek, sealed, aad)) ?? [])).toEqual(Array.from(PDF));
        expect(await decryptFileBytes(keys.dek, sealed, fileContentAad('autre'))).toBeNull();

        const other = await importVaultKeys(generateDekBytes());
        expect(await decryptFileBytes(other.dek, sealed, aad)).toBeNull();
        expect(await decryptFileBytes(keys.dek, sealed.subarray(0, 20), aad)).toBeNull();
    });

    it('encryptPdfFile porte le nom déjà chiffré et un type opaque ; decryptPdfBlob rend un PDF lisible', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const file = new File([PDF], 'facture-dentiste.pdf', { type: 'application/pdf' });
        const sealed = await encryptPdfFile(keys.dek, file, ID, 'enc:v1:nom-chiffre');
        expect(sealed.name).toBe('enc:v1:nom-chiffre');
        expect(sealed.type).toBe('application/octet-stream');

        const readable = await decryptPdfBlob(keys.dek, sealed, ID);
        expect(readable).not.toBeNull();
        expect(readable?.type).toBe('application/pdf');
        expect(looksLikePdf(await blobBytes(readable as Blob))).toBe(true);
        expect(await decryptPdfBlob(keys.dek, sealed, 'autre-id')).toBeNull();
    });

    it('repli : un PDF chiffré avant le publicId (AAD historique file:content) reste lisible', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const legacy = new Blob([await encryptFileBytes(keys.dek, PDF, VAULT_FILE_CONTENT_AAD)]);
        const readable = await decryptPdfBlob(keys.dek, legacy, ID);
        expect(readable).not.toBeNull();
        expect(looksLikePdf(await blobBytes(readable as Blob))).toBe(true);
    });

    it('un PDF en clair passe tel quel, un chiffré sans clé (Coffre fermé) donne null', async () => {
        const keys = await importVaultKeys(generateDekBytes());
        const plain = new Blob([PDF], { type: 'application/pdf' });
        expect(await decryptPdfBlob(null, plain, ID)).toBe(plain);
        const sealed = new Blob([await encryptFileBytes(keys.dek, PDF, fileContentAad(ID))]);
        expect(await decryptPdfBlob(null, sealed, ID)).toBeNull();
        // Le module crypto reste indépendant : un champ n’est pas lisible avec l’AAD d’un contenu.
        expect((await decryptField(keys.dek, 'file', 'content', ID, 'enc:v1:AAAA')).ok).toBe(false);
    });
});
