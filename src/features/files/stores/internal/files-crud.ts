import { AppError } from '@/utils/errors/app-error';
import { filesApi } from '@/features/files/api';
import { isQuotaExceededMessage } from '@/features/files/format';
import { buildUpdateFileRequest, type FileFormFields } from '@/features/files/payload';
import { FILE_PAGE_SIZE_DEFAULT, type FileDto, type ListFilesQuery } from '@/features/files/types';
import { FILES_LIST_CACHE_KEY, nextPageFromLoaded, type FilesState } from '@/features/files/stores/internal/files-state';
import { buildEncryptedNamePatch, decryptFileFields, encryptFileUpdate } from '@/features/files/vault-fields';
import { useVaultStore } from '@/features/vault/stores/vault-store';

/** Déchiffre nom et description (Coffre ouvert) d’une liste de fichiers. */
function prepareFiles(files: FileDto[]): Promise<FileDto[]> {
    return Promise.all(files.map(decryptFileFields));
}

export const FILE_NOT_FOUND_MESSAGE = 'Ce fichier n’est plus disponible.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom du fichier est obligatoire.';
        case 'documentDateInvalid':
            return 'La date du document est invalide.';
        default:
            return 'Données invalides.';
    }
}

export function createFilesCrud(state: FilesState) {
    const {
        items,
        itemsByListKey,
        pageSize,
        totalCount,
        loading,
        loadingMore,
        error,
        cache,
        initialized,
        clearError,
        beginActing,
        endActing,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        usage
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = FILE_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    async function loadList(query: ListFilesQuery & { force?: boolean } = {}) {
        const key = FILES_LIST_CACHE_KEY;
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        // Un loadMore en vol est supplanté (sa réponse sera ignorée via le seq) : libérer le verrou.
        loadingMore.value = false;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchPage(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await filesApi.list({
                            page: 1,
                            pageSize: query.pageSize ?? FILE_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = await prepareFiles(Array.isArray(result?.items) ? result.items : []);
                        if (requestId !== listRequestSeq) return;
                        setList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? query.pageSize ?? FILE_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === listRequestSeq) {
                            error.value = AppError.fromUnknown(e).message;
                        }
                        throw e;
                    }
                },
                { force: ensureForce }
            );
            return applied;
        }

        try {
            const applied = await fetchPage(force);
            if (requestId === listRequestSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchPage(true);
            }
        } finally {
            if (requestId === listRequestSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
        if (requestId !== listRequestSeq) {
            cache.invalidate(key);
            return;
        }
        activateList(key);
    }

    function cancelPendingLoads() {
        listRequestSeq += 1;
        loading.value = false;
        loadingMore.value = false;
    }

    async function loadMore() {
        if (loading.value || loadingMore.value) return;
        if (items.value.length >= totalCount.value) return;
        const key = FILES_LIST_CACHE_KEY;
        const requestId = ++listRequestSeq;
        loadingMore.value = true;
        clearError();
        try {
            const size = pageSize.value || FILE_PAGE_SIZE_DEFAULT;
            const prev = itemsByListKey.get(key)?.items ?? [];
            const nextPage = nextPageFromLoaded(prev.length, size);
            const result = await filesApi.list({
                page: nextPage,
                pageSize: size
            });
            if (requestId !== listRequestSeq) return;
            const incoming = await prepareFiles(Array.isArray(result?.items) ? result.items : []);
            if (requestId !== listRequestSeq) return;
            const byId = new Map<string, FileDto>();
            for (const item of prev) byId.set(item.publicId, item);
            for (const item of incoming) byId.set(item.publicId, item);
            const merged = [...byId.values()];
            setList(key, merged, {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? size,
                // Page vide : plus rien côté serveur, on arrête hasMore.
                totalCount: incoming.length ? (result?.totalCount ?? totalCount.value) : merged.length
            });
            cache.touch(key);
        } catch (e: unknown) {
            if (requestId === listRequestSeq) {
                error.value = AppError.fromUnknown(e).message;
            }
            throw e;
        } finally {
            if (requestId === listRequestSeq) {
                loadingMore.value = false;
            }
        }
    }

    async function loadUsage() {
        try {
            usage.value = await filesApi.usage();
        } catch {
            /* La barre reste sur la dernière valeur connue ; ne pas écraser error liste. */
        }
    }

    async function fetchFile(publicId: string): Promise<FileDto | null> {
        try {
            const file = await decryptFileFields(await filesApi.get(publicId));
            upsertItem(file);
            return file;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                removeItemLocal(publicId);
                return null;
            }
            throw err;
        }
    }

    /**
     * Périmètre étendu ouvert : le PDF est chiffré dans le navigateur, envoyé sous un nom neutre avec
     * `encrypted=true`, puis le nom réel est posé chiffré par PATCH (l’AAD a besoin du `publicId`).
     * Si le PATCH échoue, le fichier tout juste créé est supprimé. Sinon : upload en clair comme avant.
     */
    async function uploadWithVault(file: File, onProgress?: (percent: number) => void): Promise<FileDto> {
        const progress = {
            onUploadProgress: (event: { loaded: number; total?: number }) => {
                if (!onProgress || !event.total) return;
                onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
            }
        };
        const sealed = await useVaultStore().encryptPdf(file);
        if (!sealed) {
            return decryptFileFields(await filesApi.upload(file, progress));
        }
        const created = await filesApi.upload(sealed, progress, true);
        try {
            return await decryptFileFields(
                await filesApi.update(created.publicId, await buildEncryptedNamePatch(created.publicId, file.name))
            );
        } catch (e: unknown) {
            await filesApi.remove(created.publicId).catch(() => undefined);
            throw e;
        }
    }

    async function uploadFile(file: File, onProgress?: (percent: number) => void) {
        beginActing();
        clearError();
        let refreshUsage = false;
        try {
            const created = await uploadWithVault(file, onProgress);
            upsertItem(created);
            touchHydratedListCaches();
            refreshUsage = true;
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            if (err.status === 400 && isQuotaExceededMessage(err.message)) {
                refreshUsage = true;
            }
            throw err;
        } finally {
            endActing();
            if (refreshUsage) {
                await loadUsage();
            }
        }
    }

    async function updateFile(publicId: string, fields: FileFormFields) {
        beginActing();
        clearError();
        try {
            const current = state.findByPublicId(publicId);
            if (!current) {
                throw new AppError(FILE_NOT_FOUND_MESSAGE, 404);
            }
            const built = buildUpdateFileRequest(current, fields);
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            if (!built.hasChanges) return current;
            const updated = await decryptFileFields(await filesApi.update(publicId, await encryptFileUpdate(publicId, built.request)));
            upsertItem(updated);
            touchHydratedListCaches();
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                invalidateAllLists();
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteFile(publicId: string) {
        beginActing();
        clearError();
        let refreshUsage = false;
        try {
            await filesApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            refreshUsage = true;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                invalidateAllLists();
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
            if (refreshUsage) {
                await loadUsage();
            }
        }
    }

    async function refetchActive(force = true) {
        await loadList({ force }).catch(() => undefined);
    }

    return {
        loadList,
        loadMore,
        loadUsage,
        cancelPendingLoads,
        fetchFile,
        uploadFile,
        updateFile,
        deleteFile,
        refetchActive
    };
}

export type FilesCrud = ReturnType<typeof createFilesCrud>;
