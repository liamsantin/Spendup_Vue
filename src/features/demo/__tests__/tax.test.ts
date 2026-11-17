import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import type { TaxReturn, TaxReturnListResult, TaxSuggestionList } from '@/features/tax/types';

describe('démo : impôts', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('sert une déclaration 2025 entamée avec ses sous-totaux', () => {
        const list = handleDemoRequest('GET', '/api/tax-returns') as TaxReturnListResult;
        expect(list.items.map((item) => item.year)).toEqual([2025]);
        expect(list.items[0].filledCount).toBeGreaterThan(0);

        const tax = handleDemoRequest('GET', '/api/tax-returns/TAX2025') as TaxReturn;
        const cantonal = tax.subtotals.find((item) => item.competence === 'cantonal');
        expect(cantonal?.income).toBe(74400);
        expect(cantonal?.deductions).toBe(9058);
        expect(cantonal?.netIncome).toBe(65342);
        expect(tax.gaps).not.toContain('income.employed');
    });

    it('crée une déclaration, refuse un doublon d’année et un canton inconnu', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2024, canton: 'ge' }) as { declaration: TaxReturn };
        expect(created.declaration.canton).toBe('GE');
        expect(() => handleDemoRequest('POST', '/api/tax-returns', { year: 2024, canton: 'VD' })).toThrow();
        expect(() => handleDemoRequest('POST', '/api/tax-returns', { year: 2023, canton: 'XX' })).toThrow();
    });

    it('exige un ressort pour une ligne dédoublée et refuse la personne 2 hors couple', () => {
        const base = '/api/tax-returns/TAX2025/amounts';
        expect(() =>
            handleDemoRequest('PUT', `${base}/deduction.donations`, { person: '1', competence: 'cantonal', amount: 100 })
        ).toThrow();
        expect(() => handleDemoRequest('PUT', `${base}/deduction.health`, { person: '1', competence: null, amount: 100 })).toThrow();
        expect(() => handleDemoRequest('PUT', `${base}/income.other`, { person: '2', competence: null, amount: 100 })).toThrow();

        const tax = handleDemoRequest('PUT', `${base}/deduction.donations`, { person: '1', competence: null, amount: 250 }) as TaxReturn;
        expect(tax.subtotals.find((item) => item.competence === 'federal')?.deductions).toBe(9308);

        const cleared = handleDemoRequest('PUT', `${base}/deduction.donations`, {
            person: '1',
            competence: null,
            amount: null
        }) as TaxReturn;
        expect(cleared.gaps).toContain('deduction.donations');
    });

    it('propose des montants depuis le foyer et les inscrit comme acceptés', () => {
        const list = handleDemoRequest('GET', '/api/tax-returns/TAX2025/suggestions') as TaxSuggestionList;
        expect(list.items.some((item) => item.code === 'income.employed')).toBe(false);
        const allowances = list.items.find((item) => item.code === 'income.allowances');
        expect(allowances?.amount).toBe(3864);
        expect(allowances?.source).toBe('recurringIncome');
        expect(allowances?.sources?.map((item) => item.publicId)).toEqual(['RINALL1']);

        const tax = handleDemoRequest('POST', '/api/tax-returns/TAX2025/suggestions/accept', allowances) as TaxReturn;
        const value = tax.sections.flatMap((s) => s.lines).find((l) => l.code === 'income.allowances')?.values[0];
        expect(value?.origin).toBe('propositionAcceptee');
        const after = handleDemoRequest('GET', '/api/tax-returns/TAX2025/suggestions') as TaxSuggestionList;
        expect(after.items.some((item) => item.code === 'income.allowances')).toBe(false);
    });

    it('accepte plusieurs propositions d’un coup, tout ou rien', () => {
        const items = [
            { code: 'income.unemployment', person: '1', competence: 'both', amount: 1000, origin: 'importee' },
            { code: 'income.securities', person: '1', competence: 'both', amount: 20 }
        ];
        // une case répétée refuse toute la demande : rien n'est inscrit
        expect(() =>
            handleDemoRequest('POST', '/api/tax-returns/TAX2025/suggestions/accept-many', { items: [...items, items[0]] })
        ).toThrow();
        const untouched = handleDemoRequest('GET', '/api/tax-returns/TAX2025') as TaxReturn;
        expect(untouched.sections.flatMap((s) => s.lines).find((l) => l.code === 'income.securities')?.values).toEqual([]);

        const tax = handleDemoRequest('POST', '/api/tax-returns/TAX2025/suggestions/accept-many', { items }) as TaxReturn;
        const lines = tax.sections.flatMap((s) => s.lines);
        expect(lines.find((l) => l.code === 'income.unemployment')?.values[0]?.origin).toBe('importee');
        expect(lines.find((l) => l.code === 'income.securities')?.values[0]?.origin).toBe('propositionAcceptee');
        expect(lines.find((l) => l.code === 'income.securities')?.values[0]?.amount).toBe(20);
    });

    it('crée l’année suivante sans montant, avec les fiches et les pièces attendues', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns/TAX2025/next-year', {}) as { declaration: TaxReturn };
        const next = created.declaration;
        expect(next.year).toBe(2026);
        expect(next.previousPublicId).toBe('TAX2025');
        expect(next.sections.flatMap((s) => s.lines).every((l) => l.values.length === 0)).toBe(true);
        expect(next.entries.map((e) => [e.kind, e.amount])).toEqual([['employment', null]]);
        const codes = next.checklist.map((item) => item.code);
        expect(codes.some((code) => code.startsWith('employment:'))).toBe(true);
        expect(codes).toContain('deduction.pillar3a');
        expect(next.checklist.every((item) => !item.received)).toBe(true);

        const ticked = handleDemoRequest('PUT', `/api/tax-returns/${next.publicId}/checklist/deduction.pillar3a`, {
            complete: true
        }) as TaxReturn;
        expect(ticked.checklist.find((item) => item.code === 'deduction.pillar3a')?.received).toBe(true);
        const list = handleDemoRequest('GET', '/api/tax-returns') as {
            items: { publicId: string; checklistReceived: number; checklistTotal: number }[];
        };
        const row = list.items.find((item) => item.publicId === next.publicId);
        expect(row?.checklistReceived).toBe(1);
        expect(row?.checklistTotal).toBe(next.checklist.length);
    });

    it('reporte le total d’une fiche immeuble sur deux lignes', () => {
        handleDemoRequest('POST', '/api/tax-returns/TAX2025/entries', {
            kind: 'property',
            person: '1',
            title: 'Appartement Lausanne',
            detail: null,
            amount: 640000,
            secondaryAmount: 0
        });
        const tax = handleDemoRequest('POST', '/api/tax-returns/TAX2025/entries/report', { kind: 'property', person: '1' }) as TaxReturn;
        const lines = tax.sections.flatMap((s) => s.lines);
        expect(lines.find((l) => l.code === 'asset.property')?.values[0].amount).toBe(640000);
        expect(lines.find((l) => l.code === 'income.property')?.values[0].amount).toBe(0);
    });

    it('supprime une déclaration et sert un PDF', () => {
        const pdf = handleDemoRequest('GET', '/api/tax-returns/TAX2025/pdf') as Blob;
        expect(pdf.type).toBe('application/pdf');
        expect(pdf.size).toBeGreaterThan(200);
        handleDemoRequest('DELETE', '/api/tax-returns/TAX2025');
        expect((handleDemoRequest('GET', '/api/tax-returns') as TaxReturnListResult).totalCount).toBe(0);
    });

    it('exporte en CSV (un montant par ligne) et en JSON (dossier complet)', async () => {
        const csv = handleDemoRequest('GET', '/api/tax-returns/TAX2025/export?format=csv') as Blob;
        const text = await csv.text();
        // Blob.text() retire le BOM au d\u00e9codage : on le v\u00e9rifie sur les octets
        expect([...new Uint8Array(await csv.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(text.split('\r\n')[0]).toBe('section;code;ligne;personne;ressort;montant;devise;origine');
        expect(text).toContain(';income.employed;');
        const json = handleDemoRequest('GET', '/api/tax-returns/TAX2025/export?format=json') as Blob;
        expect(JSON.parse(await json.text()).publicId).toBe('TAX2025');
    });

    it('indique le profil cantonal retenu : aucun pour VD, JU 2025 repris (signalé) pour 2026', () => {
        const vd = handleDemoRequest('GET', '/api/tax-returns/TAX2025') as TaxReturn;
        expect(vd.profile).toBeNull();
        expect(vd.federalProfile).toMatchObject({ canton: 'CH', year: 2025, status: 'draft', otherYear: false });
        const ju = (handleDemoRequest('POST', '/api/tax-returns', { year: 2026, canton: 'JU' }) as { declaration: TaxReturn }).declaration;
        expect(ju.profile).toMatchObject({ canton: 'JU', year: 2025, status: 'draft', otherYear: true, officialSoftware: 'JuraTax' });
    });

    it('enregistre l’état civil et le mode de taxation, et les reprend l’année suivante', () => {
        const base = '/api/tax-returns/TAX2025';
        const header = handleDemoRequest('GET', base) as TaxReturn;
        expect(header.civilStatus).toBeNull();
        expect(header.taxationMode).toBe('ordinaire');
        const body = {
            canton: header.canton,
            couple: header.couple,
            status: header.status,
            taxpayerNumber: header.taxpayerNumber,
            notes: header.notes,
            name: header.name,
            person1: header.person1,
            person2: header.person2
        };
        expect(() => handleDemoRequest('PUT', base, { ...body, civilStatus: 'concubin', taxationMode: 'ordinaire' })).toThrow();
        const saved = handleDemoRequest('PUT', base, { ...body, civilStatus: 'marie', taxationMode: 'source' }) as TaxReturn;
        expect(saved.civilStatus).toBe('marie');
        expect(saved.taxationMode).toBe('source');
        const next = (handleDemoRequest('POST', `${base}/next-year`, {}) as { declaration: TaxReturn }).declaration;
        expect(next.civilStatus).toBe('marie');
        expect(next.taxationMode).toBe('source');
    });

    it('saisit les totaux guidés d’un coup, tout ou rien', () => {
        const created = handleDemoRequest('POST', '/api/tax-returns', { year: 2024, canton: 'JU' }) as { declaration: TaxReturn };
        const base = `/api/tax-returns/${created.declaration.publicId}/amounts`;
        expect(() =>
            handleDemoRequest('PUT', base, {
                items: [
                    { code: 'income.employed', person: '1', competence: null, amount: 1 },
                    { code: 'income.employed', person: '1', competence: null, amount: 2 }
                ]
            })
        ).toThrow();
        const tax = handleDemoRequest('PUT', base, {
            items: [
                { code: 'income.employed', person: '1', competence: null, amount: 72000 },
                { code: 'deduction.pillar3a', person: '1', competence: 'cantonal', amount: 7258 },
                { code: 'deduction.pillar3a', person: '1', competence: 'federal', amount: 7258 }
            ]
        }) as TaxReturn;
        const lines = tax.sections.flatMap((s) => s.lines);
        expect(lines.find((l) => l.code === 'income.employed')?.values[0]).toMatchObject({ amount: 72000, origin: 'saisie' });
        expect(lines.find((l) => l.code === 'deduction.pillar3a')?.values).toHaveLength(2);
    });

    it('verrouille une déclaration déposée et la corrige ligne par ligne, avec un motif', () => {
        const base = '/api/tax-returns/TAX2025';
        const header = handleDemoRequest('GET', base) as TaxReturn;
        const body = {
            canton: header.canton,
            couple: header.couple,
            taxpayerNumber: header.taxpayerNumber,
            notes: header.notes,
            name: header.name,
            person1: header.person1,
            person2: header.person2
        };
        expect(() => handleDemoRequest('PUT', base, { ...body, status: 'deposee', submissionDate: '2999-01-01' })).toThrow();

        const filed = handleDemoRequest('PUT', base, { ...body, status: 'deposee', submissionDate: '2026-03-30' }) as TaxReturn;
        expect(filed.locked).toBe(true);
        expect(filed.submissionDate).toBe('2026-03-30');

        expect(() => handleDemoRequest('PUT', `${base}/amounts/income.other`, { person: '1', competence: null, amount: 1 })).toThrow();
        expect(() =>
            handleDemoRequest('POST', `${base}/suggestions/accept`, { code: 'income.other', person: '1', competence: 'both', amount: 1 })
        ).toThrow();
        expect(() => handleDemoRequest('PUT', base, { ...body, status: 'enCours' })).toThrow();

        const correct = { code: 'income.employed', person: '1', competence: null, amount: 1 };
        expect(() => handleDemoRequest('POST', `${base}/corrections`, { ...correct, reason: '  ' })).toThrow();
        const corrected = handleDemoRequest('POST', `${base}/corrections`, { ...correct, reason: 'Certificat rectifié' }) as TaxReturn;
        const employed = corrected.sections.flatMap((s) => s.lines).find((l) => l.code === 'income.employed')?.values[0];
        expect(employed?.amount).toBe(1);
        expect(corrected.corrections[0]).toMatchObject({ code: 'income.employed', amount: 1, reason: 'Certificat rectifié' });
        expect(corrected.corrections[0].previous).not.toBe(1);
        expect(() => handleDemoRequest('POST', `${base}/corrections`, { ...correct, reason: 'Même montant' })).toThrow();

        const archived = handleDemoRequest('PUT', base, { ...body, status: 'archivee' }) as TaxReturn;
        expect(archived.locked).toBe(true);
        const row = (handleDemoRequest('GET', '/api/tax-returns') as TaxReturnListResult).items[0];
        expect(row.locked).toBe(true);

        const reopened = handleDemoRequest('POST', `${base}/cancel-filing`, {}) as TaxReturn;
        expect(reopened.locked).toBe(false);
        expect(reopened.status).toBe('preteARecopier');
        expect(reopened.submissionDate).toBeNull();
        expect(reopened.corrections).toHaveLength(1);
        expect(() => handleDemoRequest('POST', `${base}/cancel-filing`, {})).toThrow();
        handleDemoRequest('PUT', `${base}/amounts/income.other`, { person: '1', competence: null, amount: 1 });
    });
});
