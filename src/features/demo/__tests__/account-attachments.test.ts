import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';

describe('justificatifs d’un compte en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('liste vide en lecture, refus en écriture : les fichiers ne sont pas dans la démo', () => {
        expect(handleDemoRequest('GET', '/api/attachments/account/ACCCOUR/files')).toEqual({ items: [], totalCount: 0 });
        expect(() => handleDemoRequest('POST', '/api/attachments/account/ACCCOUR/files', { filePublicId: 'F1' })).toThrow();
        expect(() => handleDemoRequest('DELETE', '/api/attachments/account/ACCCOUR/files/F1')).toThrow();
    });
});
