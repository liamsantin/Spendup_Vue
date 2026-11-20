import { FILE_QUOTA_EXCEEDED_MESSAGE, type FileDto, type FileUsage, type UpdateFileRequest } from '@/features/files/types';
import { AppError } from '@/utils/errors/app-error';
import { createPublicId, demoDb } from '@/features/demo/db';

/** Plafond de la démo : assez pour tester l’ajout, pas un vrai quota. */
export const DEMO_FILE_MAX = 3;

const SLOT_BYTES = 10_485_760;

export function demoFileUsage(): FileUsage {
    const files = demoDb().files;
    const usedBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
    const full = files.length >= DEMO_FILE_MAX;
    return {
        usedBytes,
        quotaBytes: full ? Math.max(usedBytes, 1) : usedBytes + SLOT_BYTES,
        remainingBytes: full ? 0 : SLOT_BYTES,
        isUnlimited: false,
        fileCount: files.length,
        uniqueBlobCount: files.length,
        localOnlyCount: 0,
        localOnlyBytes: 0
    };
}

export function readUploadedFile(body: unknown): File {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
        const raw = body.get('file');
        if (raw instanceof File) return raw;
    }
    throw new AppError('Fichier manquant.', 400);
}

export function uploadDemoFile(file: File, preferredId?: string | null): FileDto {
    const db = demoDb();
    if (db.files.length >= DEMO_FILE_MAX) {
        throw new AppError(FILE_QUOTA_EXCEEDED_MESSAGE, 400);
    }
    const name = file.name?.trim() || 'document.pdf';
    const extension = name.includes('.') ? (name.split('.').pop() ?? 'pdf') : 'pdf';
    const created: FileDto = {
        publicId: preferredId?.trim() || createPublicId(),
        nameOriginal: name,
        extension,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        sha256Hash: 'ab'.repeat(32),
        source: 'upload',
        status: 'active',
        documentDate: null,
        description: null,
        encrypted: false,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        contentLocation: 'online',
        syncExcluded: false,
        localDevice: null
    };
    db.files.unshift(created);
    db.fileBlobs[created.publicId] = file;
    return created;
}

export function findDemoFile(publicId: string): FileDto {
    const file = demoDb().files.find((item) => item.publicId === publicId);
    if (!file) throw new AppError('Fichier introuvable.', 404);
    return file;
}

export function demoFileContent(publicId: string): Blob {
    findDemoFile(publicId);
    const blob = demoDb().fileBlobs[publicId];
    if (!blob) throw new AppError('Fichier introuvable.', 404);
    return blob;
}

export function updateDemoFile(publicId: string, body: UpdateFileRequest): FileDto {
    const file = findDemoFile(publicId);
    if (body.nameOriginal?.trim()) {
        file.nameOriginal = body.nameOriginal.trim();
        file.extension = file.nameOriginal.includes('.') ? (file.nameOriginal.split('.').pop() ?? file.extension) : file.extension;
    }
    if (body.description !== undefined) file.description = body.description;
    if (body.clearDocumentDate) file.documentDate = null;
    else if (body.documentDate) file.documentDate = body.documentDate;
    if (body.syncExcluded != null) file.syncExcluded = body.syncExcluded;
    file.updatedAt = new Date().toISOString();
    return file;
}

export function removeDemoFile(publicId: string) {
    const db = demoDb();
    findDemoFile(publicId);
    db.files = db.files.filter((item) => item.publicId !== publicId);
    delete db.fileBlobs[publicId];
}
