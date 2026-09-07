import { AppError } from '@/utils/errors/app-error';
import { transactionsApi } from '@/features/transactions/api';
import { categoriesApi } from '@/features/categories/api';
import { buildCreateCategoryPayload, buildUpdateCategoryPayload, type CategoryFormFields } from '@/features/categories/payload';
import { CATEGORY_TYPES, type Category, type ListCategoriesQuery } from '@/features/categories/types';
import { KEY_TREE, listCacheKey, type CategoriesState } from '@/features/categories/stores/internal/categories-state';

export const CATEGORY_NOT_FOUND_CODE = 'category_not_found';
export const CATEGORY_NOT_FOUND_MESSAGE = 'Catégorie introuvable.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom de la catégorie est obligatoire.';
        case 'nameTooLong':
            return 'Le nom de la catégorie dépasse 150 caractères.';
        case 'nameDuplicate':
            return 'Une catégorie porte déjà ce nom et ce type au même niveau.';
        case 'typeInvalid':
            return 'Type de catégorie invalide (depense, revenu, transfert, mixte).';
        case 'colorInvalid':
            return 'La couleur doit être un code hexadécimal (#RGB ou #RRGGBB).';
        case 'iconeTooLong':
            return 'La clé d’icône dépasse 50 caractères.';
        case 'parentNotRoot':
            return 'Une sous-catégorie ne peut pas servir de parent : la hiérarchie est limitée à deux niveaux.';
        case 'parentSelf':
            return 'Une catégorie ne peut pas être son propre parent.';
        case 'parentHasChildren':
            return 'Une catégorie qui possède des sous-catégories ne peut pas être rangée sous un parent.';
        case 'parentTypeIncompatible':
            return 'Une catégorie ne peut pas être rangée sous un parent de type incompatible.';
        default:
            return 'Données invalides.';
    }
}

/**
 * CRUD arbre + mutations.
 */
export function createCategoriesCrud(state: CategoriesState) {
    const {
        itemsByListKey,
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
        rememberLocalMutation
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = CATEGORY_NOT_FOUND_MESSAGE;
    }

    function treeRoots(): Category[] {
        return itemsByListKey.get(KEY_TREE)?.items ?? state.items.value;
    }

    function invalidateFilteredLists() {
        for (const key of [...itemsByListKey.keys()]) {
            if (key === KEY_TREE) continue;
            itemsByListKey.delete(key);
            cache.invalidate(key);
        }
    }

    async function loadList(query: ListCategoriesQuery & { force?: boolean } = {}) {
        const type = query.type && CATEGORY_TYPES.includes(query.type) ? query.type : undefined;
        const key = listCacheKey(type);
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchTree(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await categoriesApi.list({ type });
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
            const applied = await fetchTree(force);
            if (requestId === listRequestSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchTree(true);
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

    async function createCategory(fields: CategoryFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateCategoryPayload(fields, treeRoots());
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await categoriesApi.create(built.payload);
            upsertItem(created);
            cache.touch(KEY_TREE);
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

    async function updateCategory(publicId: string, fields: CategoryFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildUpdateCategoryPayload(fields, treeRoots(), publicId);
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await categoriesApi.update(publicId, built.payload);
            upsertItem(updated);
            cache.touch(KEY_TREE);
            rememberLocalMutation(updated.publicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                cache.invalidate(KEY_TREE);
                invalidateFilteredLists();
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteCategory(publicId: string) {
        beginActing();
        clearError();
        try {
            await categoriesApi.remove(publicId);
            removeItemLocal(publicId);
            cache.touch(KEY_TREE);
            rememberLocalMutation(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                cache.invalidate(KEY_TREE);
                invalidateFilteredLists();
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchTree() {
        cache.invalidate(KEY_TREE);
        invalidateFilteredLists();
        const type = state.activeType.value ?? undefined;
        await loadList({ type, force: true }).catch(() => undefined);
    }

    async function countLinkedTransactions(categoryPublicId: string): Promise<number> {
        const result = await transactionsApi.list({
            categoryPublicId,
            page: 1,
            pageSize: 1
        });
        return result?.totalCount ?? 0;
    }

    return {
        loadList,
        cancelPendingLoads,
        createCategory,
        updateCategory,
        deleteCategory,
        refetchTree,
        countLinkedTransactions
    };
}

export type CategoriesCrud = ReturnType<typeof createCategoriesCrud>;
