import type { ComposerTranslation } from 'vue-i18n';
import { loadReadablePdf } from '@/features/files/content';
import { taxApi } from '@/features/tax/api';
import type { TaxReturn } from '@/features/tax/types';
import { isCipher } from '@/features/vault/crypto';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { buildZip, type ZipEntry } from '@/utils/helpers/zip-helpers';

/**
 * Dossier de justificatifs : les pièces rangées sur la déclaration, numérotées dans l'ordre du formulaire, avec un
 * sommaire, le PDF de travail et le JSON du dossier. Assemblé dans le navigateur : une pièce chiffrée par le Coffre est
 * déchiffrée sur l'appareil, rien de lisible ne passe par le serveur.
 */

export interface BundleItem {
    /** Nom dans l'archive (`03 - Pilier 3a - attestation.pdf`). */
    name: string;
    filePublicId: string;
    /** Ligne de la déclaration, ou `null` pour une pièce du dossier entier. */
    lineLabel: string | null;
    fileName: string;
}

const MAX_NAME = 120;

/** Nom de fichier sûr sous Windows, macOS et Linux. */
export function safeFileName(raw: string): string {
    const cleaned = raw
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[. ]+$/, '');
    return cleaned.slice(0, MAX_NAME).trim() || 'document';
}

/**
 * Pièces dans l'ordre de la déclaration : d'abord celles du dossier entier, puis ligne par ligne selon le formulaire.
 * Numérotées à partir de 01 ; deux pièces de même nom restent distinctes grâce au numéro.
 */
export function bundlePlan(tax: TaxReturn): BundleItem[] {
    const lines = tax.sections.flatMap((section) => section.lines);
    const order = new Map(lines.map((line, index) => [line.code, index]));
    const labels = new Map(lines.map((line) => [line.code, line.label]));
    const sorted = [...tax.documents].sort((a, b) => {
        const rank = (code: string | null) => (code === null ? -1 : (order.get(code) ?? lines.length));
        return rank(a.lineCode) - rank(b.lineCode);
    });
    const width = Math.max(2, String(sorted.length).length);
    return sorted.map((doc, index) => {
        const lineLabel = doc.lineCode ? (labels.get(doc.lineCode) ?? doc.label) : null;
        const base = doc.fileName.replace(/\.pdf$/i, '');
        const number = String(index + 1).padStart(width, '0');
        const name = safeFileName(`${number} - ${lineLabel ?? 'Dossier'} - ${base}`);
        return { name: `${name}.pdf`, filePublicId: doc.filePublicId, lineLabel, fileName: doc.fileName };
    });
}

/** Sommaire texte : pièces incluses, pièces attendues non reçues, pièces qui n'ont pas pu être ajoutées. */
export function bundleSummary(tax: TaxReturn, plan: BundleItem[], skipped: string[], t: ComposerTranslation, now: Date): string {
    const title = tax.name?.trim() ? `${tax.name.trim()} · ${tax.year} · ${tax.canton}` : `${tax.year} · ${tax.canton}`;
    const out = [t('taxPage.bundle.summaryTitle', { title }), t('taxPage.bundle.generated', { date: now.toLocaleDateString() }), ''];
    out.push(t('taxPage.bundle.files'));
    if (plan.length) for (const item of plan) out.push(`  ${item.name}`);
    else out.push(`  ${t('taxPage.bundle.none')}`);
    out.push(`  ${t('taxPage.bundle.extra', { year: tax.year, canton: tax.canton })}`);
    const missing = tax.checklist.filter((item) => !item.received);
    if (missing.length) {
        out.push('', t('taxPage.bundle.missing'));
        for (const item of missing) out.push(`  - ${item.label}${item.required ? ` (${t('taxPage.checklist.required')})` : ''}`);
    }
    if (skipped.length) {
        out.push('', t('taxPage.bundle.skipped'));
        for (const line of skipped) out.push(`  - ${line}`);
    }
    out.push('', t('taxPage.bundle.disclaimer'));
    return out.join('\r\n') + '\r\n';
}

/**
 * Noms lisibles des pièces : l'API renvoie le nom d'un fichier chiffré (`enc:v1:`) quand le Coffre le couvre ;
 * on le déchiffre sur l'appareil, sinon l'archive aurait des entrées illisibles.
 */
export async function withReadableNames(tax: TaxReturn): Promise<TaxReturn> {
    const documents = await Promise.all(
        tax.documents.map(async (doc) => {
            if (!isCipher(doc.fileName)) return doc;
            const result = await useVaultStore().decrypt('file', 'name_original', doc.filePublicId, doc.fileName);
            return { ...doc, fileName: result.ok ? result.value : 'document.pdf' };
        })
    );
    return { ...tax, documents };
}

export interface TaxBundle {
    blob: Blob;
    fileName: string;
    /** Pièces qui n'ont pas pu être ajoutées (Coffre fermé, fichier sur un autre poste…). */
    skipped: number;
}

/** Télécharge les pièces (déchiffrées sur l'appareil), le PDF de travail et le JSON, puis assemble l'archive. */
export async function buildTaxBundle(tax: TaxReturn, t: ComposerTranslation, now: Date = new Date()): Promise<TaxBundle> {
    const plan = bundlePlan(await withReadableNames(tax));
    const entries: ZipEntry[] = [];
    const skipped: string[] = [];
    for (const item of plan) {
        try {
            const blob = await loadReadablePdf(item.filePublicId);
            entries.push({ name: item.name, data: new Uint8Array(await blob.arrayBuffer()) });
        } catch (e) {
            skipped.push(`${item.name} : ${getErrorMessage(AppError.fromUnknown(e))}`);
        }
    }
    const base = `declaration-${tax.year}-${tax.canton}`;
    const pdf = await taxApi.pdf(tax.publicId);
    entries.push({ name: `${base}.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) });
    const json = await taxApi.exportFile(tax.publicId, 'json');
    entries.push({ name: `${base}.json`, data: new Uint8Array(await json.arrayBuffer()) });
    const summary = new TextEncoder().encode('﻿' + bundleSummary(tax, plan, skipped, t, now));
    entries.unshift({ name: `00 - ${safeFileName(t('taxPage.bundle.summaryFile'))}.txt`, data: summary });
    return {
        blob: new Blob([buildZip(entries, now)], { type: 'application/zip' }),
        fileName: `justificatifs-${tax.year}-${tax.canton}.zip`,
        skipped: skipped.length
    };
}
