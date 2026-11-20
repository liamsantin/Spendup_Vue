import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { demoDb, localYmd, resetDemoDb } from '@/features/demo/db';
import type {
    BulkUpdateImportLinesResult,
    CommitImportResult,
    Import,
    ImportLine,
    ImportLineList,
    ImportPreview,
    ImportTemplate,
    ImportTemplateList,
    RevertImportResult
} from '@/features/imports/types';

/** Import de relevés en démo (roadmap « import dans la démo », chantier D3). */

function dmy(iso: string): string {
    const [year, month, day] = iso.split('-');
    return `${day}.${month}.${year}`;
}

function shiftDays(iso: string, days: number): string {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localYmd(date);
}

function csvFile(rows: string[], name = 'releve.csv'): File {
    return new File([rows.join('\r\n') + '\r\n'], name, { type: 'text/csv' });
}

async function upload(file: File, fields: Record<string, string> = {}): Promise<Import> {
    const form = new FormData();
    form.append('file', file);
    form.append('accountPublicId', fields.accountPublicId ?? 'ACCCOUR');
    for (const [key, value] of Object.entries(fields)) if (key !== 'accountPublicId') form.append(key, value);
    return (await handleDemoRequest('POST', '/api/imports', form)) as Import;
}

function lines(publicId: string, query = 'pageSize=200'): ImportLine[] {
    return (handleDemoRequest('GET', `/api/imports/${publicId}/lines?${query}`) as ImportLineList).items;
}

function byLabel(items: ImportLine[], label: string): ImportLine {
    const line = items.find((item) => item.label === label);
    if (!line) throw new Error(`ligne « ${label} » absente`);
    return line;
}

function balance(): number {
    return demoDb().accounts.find((item) => item.publicId === 'ACCCOUR')?.currentBalance ?? 0;
}

/** Relevé type : un doublon du compte, un alias, une suggestion de catégorie, un doublon interne, une date future, un total. */
function statement() {
    const migros = demoDb().transactions.find((item) => item.publicId === 'TXN0003');
    if (!migros) throw new Error('TXN0003 absente');
    const day = migros.operationDate;
    const future = shiftDays(localYmd(new Date()), 3);
    return {
        day,
        file: csvFile([
            'Relevé de compte UBS',
            '',
            'Date;Libellé;Montant;Solde',
            `${dmy(day)};Migros;-86.40;1000.00`,
            `${dmy(day)};MIGROS ZURICH 1234;-23.10;976.90`,
            `${dmy(day)};Restaurant;-64.50;912.40`,
            `${dmy(day)};Café du Coin;-4.50;907.90`,
            `${dmy(day)};Café du Coin;-4.50;903.40`,
            `${dmy(day)};Remboursement ami;30.00;933.40`,
            `${dmy(future)};Paiement futur;-10.00;923.40`,
            ';Total;-153.00;'
        ])
    };
}

describe('import de relevés en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('lit le relevé dans l’onglet et prépare les lignes comme l’API', async () => {
        const { file } = statement();
        const created = await upload(file);

        expect(created).toMatchObject({
            accountPublicId: 'ACCCOUR',
            accountCurrency: 'CHF',
            fileName: 'releve.csv',
            sourceType: 'csv',
            status: 'aValider',
            analysis: { separator: ';', headerRow: 3 }
        });
        expect(created.analysis.columns.map((column) => column.field)).toEqual(['operationDate', 'label', 'amount', 'balance']);
        expect(created.expiresAt).not.toBeNull();

        const items = lines(created.publicId);
        expect(byLabel(items, 'Migros')).toMatchObject({ status: 'aValider', duplicateOfTransactionPublicId: 'TXN0003' });
        expect(byLabel(items, 'MIGROS ZURICH 1234')).toMatchObject({ status: 'validee', tierPublicId: 'TIERMIG', type: 'depense' });
        expect(byLabel(items, 'Restaurant')).toMatchObject({ categoryPublicId: 'CATREST', categorySuggested: true, status: 'validee' });
        const cafes = items.filter((item) => item.label === 'Café du Coin');
        expect(cafes[0].duplicateOfLineNumber).toBeNull();
        expect(cafes[1]).toMatchObject({ status: 'aValider', duplicateOfLineNumber: cafes[0].lineNumber });
        expect(byLabel(items, 'Remboursement ami')).toMatchObject({ amount: 30, type: 'revenu', status: 'validee' });
        expect(byLabel(items, 'Paiement futur')).toMatchObject({ status: 'erreur', issues: [{ code: 'FUTURE_DATE' }] });
        expect(items.find((item) => item.label === 'Total')?.status).toBe('ignoree');
        expect(items.every((item) => !('cells' in item))).toBe(true);

        expect(created.counts).toEqual({ total: 8, validated: 4, toReview: 2, errors: 1, ignored: 1 });
        expect(demoDb().importFiles[created.publicId]).toBeInstanceOf(Uint8Array);
        // Rien n'est écrit avant la validation.
        expect(demoDb().transactions.some((item) => item.source === 'import')).toBe(false);
    });

    it('filtre, cherche et trie les lignes', async () => {
        const created = await upload(statement().file);
        expect(lines(created.publicId, 'status=erreur').map((item) => item.label)).toEqual(['Paiement futur']);
        expect(lines(created.publicId, 'q=caf').length).toBe(2);
        expect(lines(created.publicId, 'sort=-amount')[0].label).toBe('Remboursement ami');
        expect(() => lines(created.publicId, 'sort=nom')).toThrow('Tri invalide');
    });

    it('corrige une ligne, la remet à zéro, et applique une action groupée', async () => {
        const created = await upload(statement().file);
        const future = byLabel(lines(created.publicId), 'Paiement futur');

        expect(() =>
            handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines/${future.publicId}`, { status: 'validee' })
        ).toThrow('Ligne invalide');

        const fixed = handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines/${future.publicId}`, {
            operationDate: statement().day,
            categoryPublicId: 'CATREST'
        }) as ImportLine;
        expect(fixed).toMatchObject({ status: 'validee', isEdited: true, categoryPublicId: 'CATREST', issues: [] });

        expect(() =>
            handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines/${future.publicId}`, { categoryPublicId: 'CATSALN' })
        ).toThrow('pas compatible');

        const reset = handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines/${future.publicId}`, {
            reset: true
        }) as ImportLine;
        expect(reset).toMatchObject({ status: 'erreur', isEdited: false, publicId: future.publicId, categoryPublicId: null });

        const cafe = byLabel(lines(created.publicId), 'Café du Coin');
        const bulk = handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines`, {
            action: 'setCategory',
            sameLabelAs: cafe.publicId,
            categoryPublicId: 'CATREST'
        }) as BulkUpdateImportLinesResult;
        expect(bulk).toMatchObject({ updated: 2, skipped: 0 });
        expect(lines(created.publicId, 'q=caf').every((item) => item.categoryPublicId === 'CATREST')).toBe(true);

        const ignored = handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines`, {
            action: 'ignore',
            status: 'erreur'
        }) as BulkUpdateImportLinesResult;
        expect(ignored.updated).toBe(1);
        expect(ignored.import.counts.errors).toBe(0);
    });

    it('relit le fichier gardé en mémoire avec un autre mapping', async () => {
        const created = await upload(statement().file);
        const reread = handleDemoRequest('POST', `/api/imports/${created.publicId}/reparse`, {
            mapping: { ...created.analysis.mapping, invertSign: true }
        }) as Import;
        expect(reread.analysis.mapping?.invertSign).toBe(true);
        expect(byLabel(lines(created.publicId), 'Remboursement ami')).toMatchObject({ amount: -30, type: 'depense' });

        const broken = handleDemoRequest('POST', `/api/imports/${created.publicId}/reparse`, {
            mapping: { headerRow: 0, columns: { operationDate: '#0', label: '#5', amount: '#2' } }
        }) as Import;
        expect(broken.status).toBe('erreur');
        expect(broken.counts.total).toBe(0);
    });

    it('valide l’import, crée les transactions, oublie le fichier, puis revient en arrière', async () => {
        const before = balance();
        const created = await upload(statement().file);

        const preview = handleDemoRequest('GET', `/api/imports/${created.publicId}/preview`) as ImportPreview;
        expect(preview).toMatchObject({ toCreate: 4, unresolved: 3, totalDebit: 92.1, totalCredit: 30, balanceBefore: before });
        expect(preview.balanceAfter).toBeCloseTo(before - 62.1, 2);
        expect(preview.bankClosingBalance).toBe(923.4);
        expect(preview.balanceCheck).toBe('mismatch');

        expect(() => handleDemoRequest('POST', `/api/imports/${created.publicId}/commit`, {})).toThrow('restent à valider');

        const result = handleDemoRequest('POST', `/api/imports/${created.publicId}/commit`, {
            ignoreUnresolved: true
        }) as CommitImportResult;
        expect(result).toMatchObject({ createdTransactions: 4, createdTiers: 0, createdPaymentMethods: 0, detectedRecurrences: 0 });
        expect(result.import.status).toBe('valide');
        expect(result.import.counts).toMatchObject({ validated: 4, toReview: 0, errors: 0, ignored: 4 });
        expect(result.import.expiresAt).toBeNull();
        expect(result.import.analysis.sample).toEqual([]);
        expect(balance()).toBeCloseTo(before - 62.1, 2);

        const imported = demoDb().transactions.filter((item) => item.source === 'import');
        expect(imported.map((item) => item.label).sort()).toEqual([
            'Café du Coin',
            'MIGROS ZURICH 1234',
            'Remboursement ami',
            'Restaurant'
        ]);
        expect(imported.find((item) => item.label === 'MIGROS ZURICH 1234')).toMatchObject({ tierPublicId: 'TIERMIG', type: 'depense' });

        // Fichier et valeurs d'origine oubliés à la clôture.
        expect(demoDb().importFiles[created.publicId]).toBeUndefined();
        expect(lines(created.publicId).every((item) => item.original === null)).toBe(true);
        expect(() => handleDemoRequest('POST', `/api/imports/${created.publicId}/reparse`, {})).toThrow('déjà validé');
        expect(() => handleDemoRequest('DELETE', `/api/imports/${created.publicId}`)).toThrow('annulez-le');

        const reverted = handleDemoRequest('POST', `/api/imports/${created.publicId}/revert`) as RevertImportResult;
        expect(reverted).toMatchObject({ revertedTransactions: 4, import: { status: 'annule' } });
        expect(demoDb().transactions.some((item) => item.source === 'import')).toBe(false);
        expect(balance()).toBeCloseTo(before, 2);

        handleDemoRequest('DELETE', `/api/imports/${created.publicId}`);
        expect(() => handleDemoRequest('GET', `/api/imports/${created.publicId}`)).toThrow('Import introuvable');
    });

    it('signale un doublon apparu depuis l’analyse au lieu de l’écrire', async () => {
        const { day } = statement();
        const created = await upload(csvFile(['Date;Libellé;Montant', `${dmy(day)};Boulangerie;-7.20`]));
        handleDemoRequest('POST', '/api/transactions', {
            type: 'depense',
            accountPublicId: 'ACCCOUR',
            amount: 7.2,
            label: 'Boulangerie',
            operationDate: day,
            valueDate: day
        });
        expect(() => handleDemoRequest('POST', `/api/imports/${created.publicId}/commit`, {})).toThrow('depuis l');
        expect(lines(created.publicId)[0].status).toBe('aValider');
    });

    it('crée à la validation le tier et le moyen inconnus, puis les reconnaît au prochain import', async () => {
        const { day } = statement();
        const rows = ['Date;Libellé;Montant;Bénéficiaire;Moyen de paiement', `${dmy(day)};Achat;-12.00;Librairie Payot;Visa ...9876`];
        const first = await upload(csvFile(rows));
        expect(lines(first.publicId)[0]).toMatchObject({
            tierPublicId: null,
            unmatchedTierName: 'Librairie Payot',
            unmatchedPaymentMethodName: 'Visa ...9876'
        });
        const result = handleDemoRequest('POST', `/api/imports/${first.publicId}/commit`, {}) as CommitImportResult;
        expect(result).toMatchObject({ createdTiers: 1, createdPaymentMethods: 1 });
        const tier = demoDb().tiers.find((item) => item.name === 'Librairie Payot');
        const method = demoDb().paymentMethods.find((item) => item.label === 'Visa ...9876');
        expect(tier?.nature).toBe('unknown');
        expect(method).toMatchObject({ type: 'other', lastFourDigits: '9876', accountPublicId: 'ACCCOUR' });
        expect(demoDb().aliases[tier?.publicId ?? '']?.[0]).toMatchObject({ matchType: 'exact', createdByImport: true });

        const second = await upload(csvFile([rows[0], `${dmy(shiftDays(day, -1))};Achat;-15.00;LIBRAIRIE PAYOT;Visa ...9876`]));
        expect(lines(second.publicId)[0]).toMatchObject({
            tierPublicId: tier?.publicId,
            unmatchedTierName: null,
            paymentMethodPublicId: method?.publicId,
            unmatchedPaymentMethodName: null
        });
    });

    it('annule un import ouvert et oublie le fichier', async () => {
        const created = await upload(statement().file);
        const cancelled = handleDemoRequest('POST', `/api/imports/${created.publicId}/cancel`) as Import;
        expect(cancelled.status).toBe('annule');
        expect(demoDb().importFiles[created.publicId]).toBeUndefined();
        const list = handleDemoRequest('GET', '/api/imports?status=annule') as { items: Import[]; totalCount: number };
        expect(list.items.map((item) => item.publicId)).toEqual([created.publicId]);
    });

    it('avertit d’un fichier déjà importé et d’une période qui chevauche', async () => {
        const first = await upload(statement().file);
        handleDemoRequest('POST', `/api/imports/${first.publicId}/commit`, { ignoreUnresolved: true });
        const again = await upload(statement().file);
        expect(again.analysis.warnings.map((warning) => warning.code)).toEqual(['FILE_ALREADY_IMPORTED', 'PERIOD_OVERLAP']);
        // Les lignes déjà écrites sont reconnues comme doublons du compte.
        expect(byLabel(lines(again.publicId), 'Restaurant').duplicateOfTransactionPublicId).not.toBeNull();
    });

    it('refuse un classeur Excel et un fichier vide avec un message clair', async () => {
        const xlsx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])], 'releve.xlsx');
        await expect(upload(xlsx)).rejects.toThrow('exportez votre relevé en .csv');
        await expect(upload(new File([], 'vide.csv'))).rejects.toThrow('Le fichier est vide.');
        await expect(upload(statement().file, { accountPublicId: 'NOPE' })).rejects.toThrow('Compte introuvable.');
        expect(demoDb().imports).toEqual([]);
    });

    it('propose les modèles système et enregistre un modèle personnel', async () => {
        const list = handleDemoRequest('GET', '/api/import-templates') as ImportTemplateList;
        expect(list.items.filter((item) => item.isSystem).map((item) => item.publicId)).toEqual([
            'system-postfinance-csv',
            'system-ubs-csv',
            'system-raiffeisen-csv',
            'system-credit-card-csv',
            'system-credit-card-excel'
        ]);
        expect((handleDemoRequest('GET', '/api/import-templates?sourceType=csv') as ImportTemplateList).totalCount).toBe(4);
        expect(() => handleDemoRequest('PUT', '/api/import-templates/system-ubs-csv', {})).toThrow('pas modifiables');

        const created = await upload(statement().file);
        const template = handleDemoRequest('POST', `/api/imports/${created.publicId}/save-as-template`, {
            name: 'Mon relevé UBS'
        }) as ImportTemplate;
        expect(template).toMatchObject({ name: 'Mon relevé UBS', isSystem: false, isActive: true, sourceType: 'csv' });
        expect(template.mapping.headerRow).toBeNull();
        expect(() => handleDemoRequest('POST', `/api/imports/${created.publicId}/save-as-template`, { name: 'mon releve ubs' })).toThrow(
            'déjà ce nom'
        );

        // Les en-têtes nommés par le modèle sont dans le fichier : il est suggéré.
        const next = await upload(statement().file);
        expect(next.analysis.suggestedTemplates.map((item) => item.publicId)).toContain(template.publicId);

        const withTemplate = await upload(statement().file, { importTemplatePublicId: template.publicId });
        expect(withTemplate).toMatchObject({ templatePublicId: template.publicId, status: 'aValider' });
        expect(withTemplate.analysis.suggestedTemplates).toEqual([]);

        handleDemoRequest('PUT', `/api/import-templates/${template.publicId}`, {
            name: template.name,
            mapping: template.mapping,
            bankTierPublicId: null,
            isActive: false
        });
        await expect(upload(statement().file, { importTemplatePublicId: template.publicId })).rejects.toThrow('désactivé');
        await expect(upload(statement().file, { importTemplatePublicId: 'system-credit-card-excel' })).rejects.toThrow(
            'Ce modèle lit des fichiers excel, pas csv.'
        );

        handleDemoRequest('DELETE', `/api/import-templates/${template.publicId}`);
        expect((handleDemoRequest('GET', '/api/import-templates') as ImportTemplateList).items.some((item) => !item.isSystem)).toBe(false);
    });

    it('n’a aucun rapprochement d’échéance en démo', async () => {
        const created = await upload(statement().file);
        const line = lines(created.publicId)[0];
        expect(handleDemoRequest('GET', `/api/imports/${created.publicId}/lines/${line.publicId}/recurring-dues`)).toEqual([]);
        expect(() =>
            handleDemoRequest('PATCH', `/api/imports/${created.publicId}/lines/${line.publicId}`, {
                recurringDue: { recurringPublicId: 'REC1', scheduledAt: '2026-11-01' }
            })
        ).toThrow('Échéance introuvable');
    });

    it('repart de zéro au rechargement de la démo', async () => {
        await upload(statement().file);
        resetDemoDb();
        expect(demoDb().imports).toEqual([]);
        expect(demoDb().importFiles).toEqual({});
    });
});
