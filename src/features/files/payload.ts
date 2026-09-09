import { emptyToNull, isValidYmd } from '@/features/files/format';
import type { FileDto, UpdateFileRequest } from '@/features/files/types';

export type FileFormFields = {
    nameOriginal: string;
    description: string;
    documentDate: string | null;
};

export type FilePayloadErrorCode = 'nameRequired' | 'documentDateInvalid';

export function emptyFileFormFields(): FileFormFields {
    return { nameOriginal: '', description: '', documentDate: null };
}

export function fileToFormFields(file: FileDto): FileFormFields {
    return {
        nameOriginal: file.nameOriginal,
        description: file.description ?? '',
        documentDate: file.documentDate
    };
}

export function isFileFormDirty(original: FileDto, fields: FileFormFields): boolean {
    const built = buildUpdateFileRequest(original, fields);
    return built.ok && built.hasChanges;
}

/**
 * PATCH partiel : champs inchangés omis.
 * `description` vide / whitespace → `null`. `clearDocumentDate` gagne sur `documentDate`.
 */
export function buildUpdateFileRequest(
    original: FileDto,
    fields: FileFormFields
): { ok: true; request: UpdateFileRequest; hasChanges: boolean } | { ok: false; code: FilePayloadErrorCode } {
    const name = fields.nameOriginal.trim();
    if (!name) return { ok: false, code: 'nameRequired' };

    const description = emptyToNull(fields.description);
    const documentDate = emptyToNull(fields.documentDate);
    if (documentDate && !isValidYmd(documentDate)) return { ok: false, code: 'documentDateInvalid' };

    const request: UpdateFileRequest = {};
    if (name !== original.nameOriginal) request.nameOriginal = name;
    if (description !== original.description) request.description = description;

    const originalDate = original.documentDate;
    if (documentDate !== originalDate) {
        if (!documentDate) {
            request.clearDocumentDate = true;
        } else {
            request.documentDate = documentDate;
        }
    }

    return { ok: true, request, hasChanges: Object.keys(request).length > 0 };
}
