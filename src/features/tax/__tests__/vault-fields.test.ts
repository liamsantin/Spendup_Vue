import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import type { TaxReturn, UpdateTaxReturnPayload } from '@/features/tax/types';

const authMock = vi.hoisted(() => ({ user: { userPublicId: 'U1' } }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => authMock }));
// offre « plus » : périmètre étendu (noms, notes) en plus du socle
const statusMock = vi.hoisted(() => vi.fn(async () => ({ exists: true, state: 'active', allowedScope: 'extended' })));
vi.mock('@/features/vault/api', () => ({ vaultApi: { status: statusMock } }));

import { decryptTaxReturn, encryptTaxUpdate, sealForNextYear } from '@/features/tax/vault-fields';

const person = (officialName: string | null, vn: string | null) => ({
    officialName,
    firstName: 'Ada',
    vn,
    municipality: 'Delémont',
    job: null
});

function header(): UpdateTaxReturnPayload {
    return {
        canton: 'JU',
        couple: true,
        status: 'enCours',
        taxpayerNumber: '123.456',
        notes: 'Rappel',
        name: null,
        person1: person('Muster', '756.1234.5678.97'),
        person2: person('Exemple', '756.9999.8888.77'),
        civilStatus: null,
        taxationMode: 'ordinaire'
    };
}

function tax(payload: UpdateTaxReturnPayload, publicId = 'T1'): TaxReturn {
    return {
        publicId,
        name: null,
        year: 2025,
        canton: 'JU',
        status: 'enCours',
        couple: true,
        taxpayerNumber: payload.taxpayerNumber,
        notes: payload.notes,
        person1: payload.person1,
        person2: payload.person2,
        sections: [],
        subtotals: [],
        gaps: [],
        entries: [],
        documents: [],
        checklist: [],
        previousPublicId: null,
        submissionDate: null,
        locked: false,
        corrections: [],
        civilStatus: null,
        taxationMode: 'ordinaire',
        profile: null,
        federalProfile: null
    };
}

describe('champs du Coffre d’une déclaration', () => {
    beforeEach(async () => {
        createTestPinia();
        const vault = useVaultStore();
        await vault.prepareRegistration('Secret123');
        await vault.commitRegistration();
    }, 20_000);

    it('chiffre n° AVS, n° de contribuable, noms et notes ; garde commune et prénom… puis relit', async () => {
        const sent = await encryptTaxUpdate('T1', header());
        expect(isCipher(sent.person1.vn)).toBe(true);
        expect(isCipher(sent.person2?.vn)).toBe(true);
        expect(isCipher(sent.taxpayerNumber)).toBe(true);
        expect(isCipher(sent.notes)).toBe(true);
        expect(isCipher(sent.person1.officialName)).toBe(true);
        expect(sent.person1.municipality).toBe('Delémont');

        const read = await decryptTaxReturn(tax(sent));
        expect(read.person1.vn).toBe('756.1234.5678.97');
        expect(read.person2?.officialName).toBe('Exemple');
        expect(read.taxpayerNumber).toBe('123.456');
        expect(read.notes).toBe('Rappel');
    });

    it('un chiffré lié à un autre dossier reste illisible et repart tel quel', async () => {
        const sent = await encryptTaxUpdate('T1', header());
        const other = await decryptTaxReturn(tax(sent, 'T2'));
        expect(other.person1.vn).toBe(sent.person1.vn);
        const again = await encryptTaxUpdate('T2', { ...header(), person1: other.person1 });
        expect(again.person1.vn).toBe(sent.person1.vn);
    });

    it('N+1 : rechiffre les champs lisibles pour le nouvel identifiant', async () => {
        const sealed = await sealForNextYear(tax(header()));
        expect(sealed).not.toBeNull();
        expect(sealed!.publicId).toMatch(/^[0-9a-f-]{36}$/);
        const created = tax(
            {
                ...header(),
                taxpayerNumber: sealed!.vaultFields.taxpayerNumber,
                person1: { ...header().person1, ...sealed!.vaultFields.person1 },
                person2: { ...header().person2!, ...sealed!.vaultFields.person2 }
            },
            sealed!.publicId
        );
        const read = await decryptTaxReturn(created);
        expect(read.person1.vn).toBe('756.1234.5678.97');
        expect(read.taxpayerNumber).toBe('123.456');
    });

    it('sans valeur à chiffrer : rien à rechiffrer, l’en-tête part tel quel', async () => {
        const blank = { ...person(null, null), firstName: null };
        const empty = { ...header(), taxpayerNumber: null, notes: null, person1: blank, person2: null };
        expect(await sealForNextYear(tax(empty))).toBeNull();
        expect(await encryptTaxUpdate('T1', empty)).toBe(empty);
    });
});
