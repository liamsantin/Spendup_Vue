import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { TransactionFile } from '@/features/transactions/types';

/** Éléments qui portent des justificatifs par `/api/attachments/{kind}/{publicId}/files`. */
export type AttachmentKind = 'recurringIncome' | 'liability' | 'personalLoan' | 'sharedDebt' | 'tier';

export type AttachmentFilesResult = { items: TransactionFile[]; totalCount: number };

/** Plafond de l’API pour un élément générique (`AttachmentParent.DefaultMaxFiles`). */
export const ENTITY_FILES_MAX = 20;

/**
 * Où lire et écrire les justificatifs d’un élément. Le panneau `EntityAttachmentsPanel` ne connaît que cette forme :
 * routes génériques ici, routes dédiées pour un actif.
 */
export type AttachmentSource = {
    /** Change quand l’élément change : le panneau recharge. */
    key: string;
    max: number;
    list: () => Promise<AttachmentFilesResult>;
    attach: (filePublicId: string) => Promise<AttachmentFilesResult>;
    detach: (filePublicId: string) => Promise<void>;
};

function filesUrl(kind: AttachmentKind, publicId: string, suffix = ''): string {
    return `/api/attachments/${kind}/${encodeURIComponent(publicId)}/files${suffix}`;
}

export const entityFilesApi = {
    list(kind: AttachmentKind, publicId: string) {
        return fetchWrapper.get(filesUrl(kind, publicId)) as Promise<AttachmentFilesResult>;
    },

    attach(kind: AttachmentKind, publicId: string, filePublicId: string) {
        return fetchWrapper.post(filesUrl(kind, publicId), { filePublicId }) as Promise<AttachmentFilesResult>;
    },

    detach(kind: AttachmentKind, publicId: string, filePublicId: string) {
        return fetchWrapper.delete(filesUrl(kind, publicId, `/${encodeURIComponent(filePublicId)}`)) as Promise<void>;
    }
};

/** Source générique d’un revenu récurrent, d’un passif, d’un prêt, d’une dette entre amis ou d’un tiers. */
export function entityAttachmentSource(kind: AttachmentKind, publicId: string): AttachmentSource {
    return {
        key: `${kind}:${publicId}`,
        max: ENTITY_FILES_MAX,
        list: () => entityFilesApi.list(kind, publicId),
        attach: (filePublicId) => entityFilesApi.attach(kind, publicId, filePublicId),
        detach: (filePublicId) => entityFilesApi.detach(kind, publicId, filePublicId)
    };
}
