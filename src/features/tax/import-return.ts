import type { ComposerTranslation } from 'vue-i18n';
import { filesApi } from '@/features/files';
import { taxApi } from '@/features/tax/api';
import { cleanIdentity, emptyIdentity } from '@/features/tax/identity';
import { writeImportedFlag } from '@/features/tax/imported-flag';
import { markImportedReturn, stashPendingRead } from '@/features/tax/pending-read';
import { readTaxPdf } from '@/features/tax/reader/pdf';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

export interface ImportTaxPdfParams {
    file: File;
    year: number;
    canton: string;
    name: string | null;
    t: ComposerTranslation;
}

export interface ImportTaxPdfResult {
    /** Déclaration créée (vide si la création a échoué). */
    createdId: string;
    /** Message d'erreur, vide si tout s'est bien passé. */
    failure: string;
}

/**
 * Crée une déclaration depuis un PDF : range le fichier, puis le lit sur l'appareil (aucun envoi réseau).
 * Un échec de lecture n'empêche jamais l'import : la déclaration reste créée, sans montant lu.
 */
export async function importTaxPdf({ file, year, canton, name, t }: ImportTaxPdfParams): Promise<ImportTaxPdfResult> {
    let createdId = '';
    try {
        const created = await taxApi.create(year, canton, name);
        createdId = created.declaration.publicId;
        markImportedReturn(createdId);
        const uploaded = await filesApi.upload(file);
        await taxApi.attachDocument(createdId, uploaded.publicId, null);
        writeImportedFlag(createdId);
        const labels = new Map(
            created.declaration.sections.flatMap((section) => section.lines.map((item) => [item.code, item.label] as const))
        );
        let notice = t('taxPage.importFormatUnknown');
        try {
            const report = await readTaxPdf(file, (target) => labels.get(target) ?? target);
            if (report) {
                // Une ligne qui se saisit séparément (canton / Confédération) reçoit le même montant des deux côtés.
                const readCount = report.suggestions.length;
                const splitting = new Set(
                    created.declaration.sections.flatMap((section) =>
                        section.lines.filter((item) => item.splitsCompetence).map((item) => item.code)
                    )
                );
                report.suggestions = report.suggestions.flatMap((item) =>
                    splitting.has(item.code) ? (['cantonal', 'federal'] as const).map((competence) => ({ ...item, competence })) : [item]
                );
                notice = readCount ? t('taxPage.importRead', { count: readCount }) : t('taxPage.importReadNone');
                stashPendingRead(
                    createdId,
                    {
                        profileLabel: report.profileLabel,
                        scope: { canton: report.canton, year: report.year },
                        items: report.suggestions,
                        totals: report.totals,
                        unmapped: report.unmapped,
                        filePublicId: uploaded.publicId
                    },
                    notice
                );
                // Des montants pour la personne 2 : le couple doit être ouvert pour pouvoir les accepter.
                if (report.suggestions.some((item) => item.person === '2')) {
                    const base = created.declaration;
                    await taxApi.update(createdId, {
                        canton: base.canton,
                        couple: true,
                        status: base.status,
                        civilStatus: base.civilStatus,
                        taxationMode: base.taxationMode,
                        taxpayerNumber: base.taxpayerNumber,
                        notes: base.notes,
                        name: base.name,
                        person1: cleanIdentity(base.person1),
                        person2: cleanIdentity(base.person2 ?? emptyIdentity())
                    });
                }
            } else {
                stashPendingRead(createdId, null, notice);
            }
        } catch {
            stashPendingRead(createdId, null, t('taxPage.importReadNone'));
        }
        return { createdId, failure: '' };
    } catch (e) {
        return { createdId, failure: getErrorMessage(AppError.fromUnknown(e)) };
    }
}
