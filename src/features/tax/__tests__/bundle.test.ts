import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComposerTranslation } from 'vue-i18n';
import type { TaxReturn } from '@/features/tax/types';

const loadReadablePdf = vi.fn();
vi.mock('@/features/files/content', () => ({ loadReadablePdf: (id: string) => loadReadablePdf(id) }));
vi.mock('@/features/tax/api', () => ({
    taxApi: {
        pdf: vi.fn(async () => new Blob(['%PDF travail'])),
        exportFile: vi.fn(async () => new Blob(['{"publicId":"T1"}']))
    }
}));

const { bundlePlan, bundleSummary, buildTaxBundle, safeFileName } = await import('@/features/tax/bundle');

/** Traduction de test : la clé, suivie des paramètres. */
const t = ((key: string, params?: Record<string, unknown>) =>
    params && typeof params === 'object' ? `${key} ${JSON.stringify(params)}` : key) as unknown as ComposerTranslation;

const line = (code: string, label: string) => ({ code, label, splitsCompetence: false, values: [] });

function tax(): TaxReturn {
    return {
        publicId: 'T1',
        name: null,
        year: 2025,
        canton: 'JU',
        status: 'enCours',
        couple: false,
        taxpayerNumber: null,
        notes: null,
        person1: { officialName: null, firstName: null, vn: null, municipality: null, job: null },
        person2: null,
        sections: [
            { code: 'income', label: 'Revenus', lines: [line('income.employed', 'Salaire')] },
            { code: 'deduction', label: 'Déductions', lines: [line('deduction.pillar3a', 'Pilier 3a')] }
        ],
        subtotals: [],
        gaps: [],
        entries: [],
        documents: [
            { publicId: 'D3', filePublicId: 'F3', fileName: 'attestation 3a.pdf', lineCode: 'deduction.pillar3a', label: 'Pilier 3a' },
            { publicId: 'D1', filePublicId: 'F1', fileName: 'certificat.pdf', lineCode: 'income.employed', label: 'Salaire' },
            { publicId: 'D0', filePublicId: 'F0', fileName: 'déclaration 2024.pdf', lineCode: null, label: 'Dossier' }
        ],
        checklist: [
            { code: 'deduction.pillar3a', label: 'Attestation 3a', category: null, required: true, received: true, comment: null },
            { code: 'income.unemployment', label: 'Décompte chômage', category: null, required: true, received: false, comment: null }
        ],
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

describe('dossier de justificatifs', () => {
    beforeEach(() => loadReadablePdf.mockReset());

    it('numérote les pièces : dossier d’abord, puis dans l’ordre du formulaire', () => {
        expect(bundlePlan(tax()).map((item) => item.name)).toEqual([
            '01 - Dossier - déclaration 2024.pdf',
            '02 - Salaire - certificat.pdf',
            '03 - Pilier 3a - attestation 3a.pdf'
        ]);
    });

    it('rend un nom de fichier sûr', () => {
        expect(safeFileName('a/b:c*?"<>|d.  ')).toBe('a b c d');
        expect(safeFileName('   ')).toBe('document');
        expect(safeFileName('x'.repeat(300))).toHaveLength(120);
    });

    it('liste dans le sommaire les pièces attendues manquantes et les pièces non ajoutées', () => {
        const text = bundleSummary(tax(), bundlePlan(tax()), ['02 - Salaire - certificat.pdf : Coffre fermé'], t, new Date(2026, 10, 17));
        expect(text).toContain('02 - Salaire - certificat.pdf');
        expect(text).toContain('Décompte chômage');
        expect(text).not.toContain('Attestation 3a');
        expect(text).toContain('Coffre fermé');
    });

    it('assemble l’archive et continue quand une pièce ne peut pas être lue', async () => {
        loadReadablePdf.mockImplementation(async (id: string) => {
            if (id === 'F1') throw new Error('Coffre fermé');
            return new Blob([`%PDF ${id}`]);
        });
        const bundle = await buildTaxBundle(tax(), t, new Date(2026, 10, 17));
        expect(bundle.fileName).toBe('justificatifs-2025-JU.zip');
        expect(bundle.skipped).toBe(1);
        const text = new TextDecoder().decode(new Uint8Array(await bundle.blob.arrayBuffer()));
        expect(text).toContain('01 - Dossier - déclaration 2024.pdf');
        expect(text).toContain('03 - Pilier 3a - attestation 3a.pdf');
        expect(text).toContain('declaration-2025-JU.pdf');
        expect(text).toContain('declaration-2025-JU.json');
        expect(text).toContain('%PDF F3');
        expect(text).not.toContain('%PDF F1');
    });
});
