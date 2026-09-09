import { AppError } from '@/utils/errors/app-error';
import { filesApi } from '@/features/files/api';
import { buildUpdateFileRequest, type FileFormFields } from '@/features/files/payload';
import { FILE_PAGE_SIZE_DEFAULT, type FileDto, type ListFilesQuery } from '@/features/files/types';
import { FILES_LIST_CACHE_KEY, type FilesState } from '@/features/files/stores/internal/files-state';

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
        page,
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
        invalidateAllLists
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
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? FILE_PAGE_SIZE_DEFAULT,
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
            const nextPage = page.value + 1;
            const result = await filesApi.list({
                page: nextPage,
                pageSize: pageSize.value || FILE_PAGE_SIZE_DEFAULT
            });
            if (requestId !== listRequestSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = itemsByListKey.get(key)?.items ?? [];
            const byId = new Map<string, FileDto>();
            for (const item of prev) byId.set(item.publicId, item);
            for (const item of incoming) byId.set(item.publicId, item);
            setList(key, [...byId.values()], {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? pageSize.value,
                totalCount: result?.totalCount ?? totalCount.value
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

    async function fetchFile(publicId: string): Promise<FileDto | null> {
        try {
            const file = await filesApi.get(publicId);
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

    async function uploadFile(file: File, onProgress?: (percent: number) => void) {
        beginActing();
        clearError();
        try {
            const created = await filesApi.upload(file, {
                onUploadProgress: (event) => {
                    if (!onProgress || !event.total) return;
                    onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
                }
            });
            upsertItem(created);
            touchHydratedListCaches();
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
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
            const updated = await filesApi.update(publicId, built.request);
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
        try {
            await filesApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
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

    async function refetchActive(force = true) {
        await loadList({ force }).catch(() => undefined);
    }

    return {
        loadList,
        loadMore,
        cancelPendingLoads,
        fetchFile,
        uploadFile,
        updateFile,
        deleteFile,
        refetchActive
    };
}

export type FilesCrud = ReturnType<typeof createFilesCrud>;
