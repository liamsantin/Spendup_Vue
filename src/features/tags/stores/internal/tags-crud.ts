import { AppError } from '@/utils/errors/app-error';
import { tagsApi } from '@/features/tags/api';
import { buildCreateTagPayload, buildUpdateTagPayload, type TagFormFields } from '@/features/tags/payload';
import { KEY_LIST, type TagsState } from '@/features/tags/stores/internal/tags-state';

export const TAG_NOT_FOUND_CODE = 'tag_not_found';
export const TAG_NOT_FOUND_MESSAGE = 'Tag introuvable.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom du tag est obligatoire.';
        case 'nameTooLong':
            return 'Le nom du tag dépasse 100 caractères.';
        case 'nameDuplicate':
            return 'Un tag porte déjà ce nom.';
        case 'colorInvalid':
            return 'La couleur doit être un code hexadécimal (#RGB ou #RRGGBB).';
        default:
            return 'Données invalides.';
    }
}

export function createTagsCrud(state: TagsState) {
    const {
        loading,
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
        rememberLocalMutation,
        notifyDeleted
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = TAG_NOT_FOUND_MESSAGE;
    }

    function knownTags() {
        return state.allKnownItems();
    }

    async function loadList(query: { force?: boolean } = {}) {
        const key = KEY_LIST;
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchList(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await tagsApi.list();
                        if (requestId !== listRequestSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setList(key, nextItems, { totalCount: result?.totalCount ?? nextItems.length });
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
            const applied = await fetchList(force);
            if (requestId === listRequestSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchList(true);
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
    }

    async function createTag(fields: TagFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateTagPayload(fields, knownTags());
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await tagsApi.create(built.payload);
            upsertItem(created);
            cache.touch(KEY_LIST);
            rememberLocalMutation(created.publicId);
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateTag(publicId: string, fields: TagFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildUpdateTagPayload(fields, knownTags(), publicId);
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await tagsApi.update(publicId, built.payload);
            upsertItem(updated);
            cache.touch(KEY_LIST);
            rememberLocalMutation(updated.publicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                notifyDeleted(publicId);
                cache.invalidate(KEY_LIST);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteTag(publicId: string) {
        beginActing();
        clearError();
        try {
            await tagsApi.remove(publicId);
            removeItemLocal(publicId);
            cache.touch(KEY_LIST);
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                cache.invalidate(KEY_LIST);
                notifyDeleted(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchList() {
        cache.invalidate(KEY_LIST);
        await loadList({ force: true }).catch(() => undefined);
    }

    return {
        loadList,
        cancelPendingLoads,
        createTag,
        updateTag,
        deleteTag,
        refetchList
    };
}

export type TagsCrud = ReturnType<typeof createTagsCrud>;
