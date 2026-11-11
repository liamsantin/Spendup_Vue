export type FileSource = 'upload';
export type FileStatus = 'active';

/** Métadonnées d’un PDF — jamais d’URL cloud. */
export type FileDto = {
    publicId: string;
    nameOriginal: string;
    extension: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string;
    source: FileSource;
    status: FileStatus;
    documentDate: string | null;
    description: string | null;
    /** Contenu chiffré dans le navigateur (Coffre, périmètre étendu) : `GET …/content` renvoie des octets opaques. */
    encrypted?: boolean;
    createdAt: string;
    updatedAt: string | null;
    /** `online` : contenu dans le bucket (quota) ; `local_only` : seulement sur le poste `localDevice`. */
    contentLocation?: FileContentLocation;
    /** Exclu de la synchro par l'utilisateur : reste sur son poste. */
    syncExcluded?: boolean;
    /** Poste qui détient le contenu quand il est `local_only`. */
    localDevice?: FileDeviceRef | null;
};

export type FileContentLocation = 'online' | 'local_only';

/** Appareil de bureau détenteur d'un fichier gardé en local (`deviceIdentifier` = celui de la session). */
export type FileDeviceRef = {
    deviceIdentifier: string;
    name: string;
};

/** `POST /api/files/local` : fichier gardé sur ce poste, métadonnées seules (hors quota). */
export type RegisterLocalFileRequest = {
    nameOriginal: string;
    sizeBytes: number;
    sha256Hash: string;
    encrypted: boolean;
    publicId?: string;
    syncExcluded?: boolean;
};

/** `GET /api/files/changes` : changements depuis `since`, triés par insertion croissante. */
export type FileChangesDto = {
    items: FileDto[];
    deletedPublicIds: string[];
    serverTime: string;
};

export type FileListDto = {
    items: FileDto[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListFilesQuery = {
    page?: number;
    pageSize?: number;
};

export type UpdateFileRequest = {
    nameOriginal?: string;
    description?: string | null;
    documentDate?: string;
    clearDocumentDate?: boolean;
    syncExcluded?: boolean;
};

/** Consommation de blobs PDF uniques — hors avatar, hors soft-delete. */
export type FileUsage = {
    usedBytes: number;
    quotaBytes: number;
    remainingBytes: number;
    isUnlimited: boolean;
    fileCount: number;
    uniqueBlobCount: number;
    /** Fichiers gardés seulement sur un poste (hors quota). */
    localOnlyCount?: number;
    localOnlyBytes?: number;
};

/** Message 400 API quand un nouveau blob ferait dépasser le quota. */
export const FILE_QUOTA_EXCEEDED_MESSAGE = 'Quota de stockage dépassé.';
export const FILE_LINKED_TO_TRANSACTIONS_MESSAGE = "Impossible de supprimer un fichier lié à des transactions. Déliez-le d'abord.";

export const FILE_PAGE_SIZE_DEFAULT = 50;
export const FILE_PAGE_SIZE_MAX = 200;
export const FILE_SEARCH_MAX = 100;
/** 10 Mo. */
export const FILE_MAX_BYTES = 10_485_760;
export const FILE_UPLOAD_FIELD = 'file';
/** Champ de formulaire `POST /api/files` : contenu déjà chiffré par le navigateur. */
export const FILE_UPLOAD_ENCRYPTED_FIELD = 'encrypted';
/** Champ de formulaire `POST /api/files` : identifiant public choisi par le client (désactive la déduplication). */
export const FILE_UPLOAD_PUBLIC_ID_FIELD = 'publicId';
export const FILE_PDF_MIME = 'application/pdf';
export const FILE_PDF_EXTENSION = 'pdf';
