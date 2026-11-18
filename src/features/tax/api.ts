import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    TaxEntryKind,
    TaxPerson,
    TaxReturn,
    TaxReturnCreated,
    TaxReturnListResult,
    TaxDocumentCandidate,
    TaxMedical,
    TaxReminder,
    TaxPillar3a,
    TaxThemes,
    TaxSuggestionList,
    UpdateTaxReturnPayload,
    UpsertTaxAmountPayload,
    UpsertTaxEntryPayload
} from '@/features/tax/types';
import { decryptCreated, decryptTaxReturn, encryptTaxUpdate, sealForNextYear } from '@/features/tax/vault-fields';

/** Proposition acceptée. `origin` : `importee` pour un montant lu dans un PDF, sinon `propositionAcceptee` (défaut). */
export interface TaxAcceptBody {
    code: string;
    person: string;
    competence: string;
    amount: number;
    origin?: 'propositionAcceptee' | 'importee';
}

/** Un montant d'une saisie groupée (saisie guidée des totaux). `competence: null` pour une ligne à un seul montant. */
export interface TaxAmountItem {
    code: string;
    person: string;
    competence: string | null;
    amount: number | null;
}

/** Correction d'un montant d'une déclaration déposée. `amount: null` vide la case. */
export interface TaxCorrectBody {
    code: string;
    person: string;
    competence: string | null;
    amount: number | null;
    reason: string;
}

/** Déclaration renvoyée par l'API, champs du Coffre déchiffrés. */
function readable(request: Promise<unknown>): Promise<TaxReturn> {
    return (request as Promise<TaxReturn>).then(decryptTaxReturn);
}

/**
 * Le JSON du serveur porte les champs du Coffre tels qu'ils sont en base (chiffrés) : on les remplace par leur clair
 * sur l'appareil, pour que l'export reste lisible. Un champ illisible reste chiffré.
 */
async function readableJsonExport(blob: Blob): Promise<Blob> {
    const text = await blob.text();
    if (!text.includes('enc:v1:')) return blob;
    const readableTax = await decryptTaxReturn(JSON.parse(text) as TaxReturn);
    return new Blob([JSON.stringify(readableTax, null, 2)], { type: blob.type || 'application/json' });
}

export const taxApi = {
    list() {
        return fetchWrapper.get('/api/tax-returns') as Promise<TaxReturnListResult>;
    },

    create(year: number, canton: string, name: string | null = null) {
        return (fetchWrapper.post('/api/tax-returns', { year, canton, name }) as Promise<TaxReturnCreated>).then(decryptCreated);
    },

    get(publicId: string) {
        return readable(fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}`));
    },

    /** Les champs du Coffre (n° AVS, noms, notes…) partent chiffrés quand le Coffre est ouvert. */
    async update(publicId: string, body: UpdateTaxReturnPayload) {
        const sent = await encryptTaxUpdate(publicId, body);
        return readable(fetchWrapper.put(`/api/tax-returns/${encodeURIComponent(publicId)}`, sent));
    },

    upsertAmount(publicId: string, code: string, body: UpsertTaxAmountPayload) {
        return readable(fetchWrapper.put(`/api/tax-returns/${encodeURIComponent(publicId)}/amounts/${encodeURIComponent(code)}`, body));
    },

    /** Plusieurs montants saisis en une requête (saisie guidée des totaux) : tout est inscrit, ou rien. */
    upsertAmounts(publicId: string, items: TaxAmountItem[]) {
        return readable(fetchWrapper.put(`/api/tax-returns/${encodeURIComponent(publicId)}/amounts`, { items }));
    },

    /** Corrige un montant d'une déclaration déposée. Le motif est obligatoire : la correction est journalisée. */
    correctAmount(publicId: string, body: TaxCorrectBody) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/corrections`, body));
    },

    /** Annule un dépôt marqué par erreur : retour à « prête à recopier », montants déverrouillés (journalisé). */
    cancelFiling(publicId: string) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/cancel-filing`, {}));
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/tax-returns/${encodeURIComponent(publicId)}`) as Promise<void>;
    },

    createEntry(publicId: string, body: UpsertTaxEntryPayload) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/entries`, body));
    },

    deleteEntry(publicId: string, entryPublicId: string) {
        return readable(
            fetchWrapper.delete(`/api/tax-returns/${encodeURIComponent(publicId)}/entries/${encodeURIComponent(entryPublicId)}`)
        );
    },

    reportEntries(publicId: string, kind: TaxEntryKind, person: TaxPerson) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/entries/report`, { kind, person }));
    },

    /** Export des données : CSV (un montant par ligne) ou JSON (dossier complet). */
    async exportFile(publicId: string, format: 'csv' | 'json') {
        const blob = await fetchWrapper.getBlob(`/api/tax-returns/${encodeURIComponent(publicId)}/export?format=${format}`);
        return format === 'json' ? readableJsonExport(blob) : blob;
    },

    pdf(publicId: string) {
        return fetchWrapper.getBlob(`/api/tax-returns/${encodeURIComponent(publicId)}/pdf`);
    },

    reminders(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/reminders`) as Promise<{
            year: number;
            items: TaxReminder[];
        }>;
    },

    documentCandidates(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/document-candidates`) as Promise<{
            items: TaxDocumentCandidate[];
        }>;
    },

    themes(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/themes`) as Promise<TaxThemes>;
    },

    medical(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/medical`) as Promise<TaxMedical>;
    },

    pillar3a(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/pillar3a`) as Promise<TaxPillar3a>;
    },

    suggestions(publicId: string) {
        return fetchWrapper.get(`/api/tax-returns/${encodeURIComponent(publicId)}/suggestions`) as Promise<TaxSuggestionList>;
    },

    acceptSuggestion(publicId: string, body: TaxAcceptBody) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/suggestions/accept`, body));
    },

    /** Plusieurs propositions en une requête : tout est inscrit, ou rien. */
    acceptSuggestions(publicId: string, items: TaxAcceptBody[]) {
        return readable(
            fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/suggestions/accept-many`, {
                items
            })
        );
    },

    /**
     * Crée la déclaration de l'année suivante : identité, fiches sans montant et pièces attendues. Avec la déclaration
     * d'origine déchiffrée, les champs du Coffre sont rechiffrés pour le nouveau dossier (sinon l'API ne les reprend pas).
     */
    async createNextYear(publicId: string, name?: string | null, source?: TaxReturn | null) {
        const sealed = source ? await sealForNextYear(source) : null;
        const created = (await fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/next-year`, {
            name: name ?? null,
            publicId: sealed?.publicId ?? null,
            vaultFields: sealed?.vaultFields ?? null
        })) as TaxReturnCreated;
        return decryptCreated(created);
    },

    updateChecklistItem(publicId: string, code: string, body: { complete?: boolean; comment?: string | null }) {
        return readable(fetchWrapper.put(`/api/tax-returns/${encodeURIComponent(publicId)}/checklist/${encodeURIComponent(code)}`, body));
    },

    /** Complète les pièces attendues d'après les fiches et l'année précédente, sans doublon. */
    generateChecklist(publicId: string) {
        return readable(fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/checklist/generate`, {}));
    },

    attachDocument(publicId: string, filePublicId: string, lineCode: string | null) {
        return readable(
            fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/documents`, {
                filePublicId,
                lineCode
            })
        );
    },

    detachDocument(publicId: string, documentPublicId: string) {
        return readable(
            fetchWrapper.delete(`/api/tax-returns/${encodeURIComponent(publicId)}/documents/${encodeURIComponent(documentPublicId)}`)
        );
    },

    importStatement(publicId: string, xml: string) {
        return fetchWrapper.post(`/api/tax-returns/${encodeURIComponent(publicId)}/statements`, { xml }) as Promise<TaxSuggestionList>;
    }
};
