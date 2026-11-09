import { fetchWrapper, type FetchFormOptions } from '@/utils/helpers/fetch-helpers';
import {
    FILE_PAGE_SIZE_DEFAULT,
    FILE_PAGE_SIZE_MAX,
    FILE_UPLOAD_ENCRYPTED_FIELD,
    FILE_UPLOAD_FIELD,
    FILE_UPLOAD_PUBLIC_ID_FIELD,
    type FileDto,
    type FileListDto,
    type FileUsage,
    type ListFilesQuery,
    type UpdateFileRequest
} from '@/features/files/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? FILE_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return FILE_PAGE_SIZE_DEFAULT;
    return Math.min(FILE_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

export const filesApi = {
    list(query: ListFilesQuery = {}) {
        const page = Math.max(1, Math.trunc(query.page ?? 1));
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(clampPageSize(query.pageSize))
        });
        return fetchWrapper.get(`/api/files?${params}`) as Promise<FileListDto>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/files/${encodeURIComponent(publicId)}`) as Promise<FileDto>;
    },

    /** Quota blobs PDF uniques — ne pas dériver de `GET /api/files`. */
    usage() {
        return fetchWrapper.get('/api/files/usage') as Promise<FileUsage>;
    },

    /**
     * Contenu brut — pas d’enveloppe. Toujours via fetch authentifié, jamais en `src` iframe.
     * Un fichier chiffré par le Coffre arrive tel quel (octets opaques) : `vault.decryptPdf` le rend lisible.
     */
    getContent(publicId: string) {
        return fetchWrapper.getBlob(`/api/files/${encodeURIComponent(publicId)}/content`);
    },

    /**
     * Upload multipart. `encrypted` : le contenu a été chiffré dans le navigateur (pas de contrôle `%PDF`,
     * pas de déduplication). `publicId` : identifiant choisi par le client (GUID minuscule) ; le nom du
     * fichier multipart peut alors déjà être chiffré (`enc:v1:`).
     */
    upload(file: File, options: FetchFormOptions = {}, vault: { encrypted?: boolean; publicId?: string } = {}) {
        const form = new FormData();
        form.append(FILE_UPLOAD_FIELD, file);
        if (vault.encrypted) form.append(FILE_UPLOAD_ENCRYPTED_FIELD, 'true');
        if (vault.publicId) form.append(FILE_UPLOAD_PUBLIC_ID_FIELD, vault.publicId);
        return fetchWrapper.postForm('/api/files', form, options) as Promise<FileDto>;
    },

    update(publicId: string, body: UpdateFileRequest) {
        return fetchWrapper.patch(`/api/files/${encodeURIComponent(publicId)}`, body) as Promise<FileDto>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/files/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
