import { AppError } from '@/utils/errors/app-error';
import { useNotificationsStore } from '@/features/notifications';
import { importsApi } from '@/features/imports/api';
import { canReviewImport, normalizeImport } from '@/features/imports/format';
import { IMPORT_PAGE_SIZE_DEFAULT, type CreateImportPayload, type Import, type ReparseImportPayload } from '@/features/imports/types';
import { IMPORT_NOT_FOUND_MESSAGE, type ImportsLines } from '@/features/imports/stores/internal/imports-lines';
import type { ImportsListFilter, ImportsState } from '@/features/imports/stores/internal/imports-state';

type CrudDeps = Pick<ImportsLines, 'loadLines' | 'cancelPendingLines'>;

/** Historique + cycle de vie d’un import (upload → reparse → commit / cancel / revert / delete). */
export function createImportsCrud(state: ImportsState, deps: CrudDeps) {
    const {
        items,
        totalCount,
        page,
        pageSize,
        listFilter,
        loading,
        loadingMore,
        initialized,
        hasMore,
        current,
        currentLoading,
        currentGone,
        lines,
        linesTotal,
        preview,
        previewLoading,
        error,
        beginActing,
        endActing,
        clearError,
        upsertImport,
        removeImportLocal,
        clearCurrent,
        rememberLocalMutation
    } = state;
    const { loadLines, cancelPendingLines } = deps;

    let listRequestSeq = 0;
    let currentRequestSeq = 0;

    async function loadList(filter: Partial<ImportsListFilter> = {}) {
        listFilter.value = { ...listFilter.value, ...filter };
        const requestId = ++listRequestSeq;
        loading.value = true;
        clearError();
        try {
            const result = await importsApi.list({
                status: listFilter.value.status ?? undefined,
                accountPublicId: listFilter.value.accountPublicId ?? undefined,
                page: 1,
                pageSize: IMPORT_PAGE_SIZE_DEFAULT
            });
            if (requestId !== listRequestSeq) return;
            items.value = (Array.isArray(result?.items) ? result.items : []).map(normalizeImport);
            totalCount.value = result?.totalCount ?? items.value.length;
            page.value = 1;
            pageSize.value = IMPORT_PAGE_SIZE_DEFAULT;
        } catch (e: unknown) {
            if (requestId === listRequestSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === listRequestSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
    }

    async function loadMore() {
        if (!hasMore.value || loadingMore.value) return;
        const requestId = listRequestSeq;
        loadingMore.value = true;
        try {
            const nextPage = page.value + 1;
            const result = await importsApi.list({
                status: listFilter.value.status ?? undefined,
                accountPublicId: listFilter.value.accountPublicId ?? undefined,
                page: nextPage,
                pageSize: pageSize.value
            });
            if (requestId !== listRequestSeq) return;
            const known = new Set(items.value.map((item) => item.publicId));
            const next = (Array.isArray(result?.items) ? result.items : [])
                .map(normalizeImport)
                .filter((item) => !known.has(item.publicId));
            items.value = [...items.value, ...next];
            totalCount.value = result?.totalCount ?? totalCount.value;
            page.value = nextPage;
        } catch (e: unknown) {
            error.value = AppError.fromUnknown(e).message;
        } finally {
            loadingMore.value = false;
        }
    }

    async function refetchList() {
        if (!initialized.value) return;
        await loadList().catch(() => undefined);
    }

    /**
     * Ouvre un import (détail + lignes si en revue). Toujours relu à l’ouverture :
     * l’expiration automatique (30 jours) ne pousse aucun événement.
     */
    async function openImport(publicId: string) {
        const id = publicId.trim();
        if (current.value?.publicId !== id) {
            cancelPendingLines();
            clearCurrent();
        }
        currentGone.value = false;
        const requestId = ++currentRequestSeq;
        currentLoading.value = true;
        clearError();
        try {
            const fresh = normalizeImport(await importsApi.get(id));
            if (requestId !== currentRequestSeq) return;
            current.value = fresh;
            upsertImport(fresh);
            if (canReviewImport(fresh)) {
                await loadLines();
            }
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (requestId === currentRequestSeq) {
                if (err.status === 404) {
                    error.value = IMPORT_NOT_FOUND_MESSAGE;
                    currentGone.value = true;
                } else {
                    error.value = err.message;
                }
            }
            throw err;
        } finally {
            if (requestId === currentRequestSeq) currentLoading.value = false;
        }
    }

    /** Relit l’import ouvert (événement d’un autre onglet) : détail, lignes, aperçu invalidé. */
    async function refreshCurrent() {
        const id = current.value?.publicId;
        if (!id) return;
        const requestId = ++currentRequestSeq;
        try {
            const fresh = normalizeImport(await importsApi.get(id));
            if (requestId !== currentRequestSeq) return;
            upsertImport(fresh);
            preview.value = null;
            if (canReviewImport(fresh)) {
                await loadLines().catch(() => undefined);
            } else {
                lines.value = [];
                linesTotal.value = 0;
            }
        } catch (e: unknown) {
            if (AppError.fromUnknown(e).status === 404 && requestId === currentRequestSeq) {
                removeImportLocal(id);
                currentGone.value = true;
            }
        }
    }

    function closeImport() {
        currentRequestSeq += 1;
        cancelPendingLines();
        clearCurrent();
        currentLoading.value = false;
    }

    /** Exécute une action sur un import : acting, écho SignalR ignoré, 404 → import retiré. */
    async function mutate<T>(publicId: string, action: () => Promise<T>): Promise<T> {
        beginActing();
        clearError();
        // Avant l’appel : l’écho `importChanged` peut précéder la réponse HTTP.
        rememberLocalMutation(publicId);
        try {
            return await action();
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                error.value = IMPORT_NOT_FOUND_MESSAGE;
                removeImportLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    function afterStatusChange(next: Import) {
        const fresh = upsertImport(next);
        preview.value = null;
        return fresh;
    }

    /** Upload + analyse. Aucune transaction n’est écrite : le solde ne bouge pas. */
    async function uploadImport(payload: CreateImportPayload): Promise<Import> {
        beginActing();
        clearError();
        try {
            const created = normalizeImport(await importsApi.create(payload));
            rememberLocalMutation(created.publicId);
            if (initialized.value && !items.value.some((item) => item.publicId === created.publicId)) {
                const filter = listFilter.value;
                const matches =
                    (!filter.status || filter.status === created.status) &&
                    (!filter.accountPublicId || filter.accountPublicId === created.accountPublicId);
                if (matches) {
                    items.value = [created, ...items.value];
                    totalCount.value += 1;
                }
            }
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    /** ⚠ Remplace toutes les lignes : les corrections faites en revue sont perdues. */
    async function reparseImport(publicId: string, body: ReparseImportPayload = {}) {
        return mutate(publicId, async () => {
            const next = afterStatusChange(await importsApi.reparse(publicId, body));
            if (current.value?.publicId === publicId) {
                if (canReviewImport(next)) {
                    await loadLines({ status: null, q: '' }).catch(() => undefined);
                } else {
                    lines.value = [];
                    linesTotal.value = 0;
                }
            }
            return next;
        });
    }

    async function loadPreview(publicId: string) {
        previewLoading.value = true;
        clearError();
        try {
            const result = await importsApi.preview(publicId);
            if (current.value?.publicId === publicId) preview.value = result;
            return result;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? IMPORT_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            previewLoading.value = false;
        }
    }

    /**
     * L’API n’envoie `accountChanged` qu’aux **autres** co-détenteurs : rejouer l’événement ici
     * pour que soldes, journal, budgets et objectifs de cette session se mettent à jour.
     */
    function notifyAccountTransactions(accountPublicId: string | null, change: 'transactionsImported' | 'transactionsReverted') {
        if (!accountPublicId) return;
        useNotificationsStore().dispatchLocalAccountChanged({ change, accountPublicId });
    }

    /** Tout ou rien. `ignoreUnresolved` requis s’il reste des lignes à valider / en erreur. */
    async function commitImport(publicId: string, options: { ignoreUnresolved?: boolean } = {}) {
        return mutate(publicId, async () => {
            const result = await importsApi.commit(publicId, !!options.ignoreUnresolved);
            const next = afterStatusChange(result.import);
            if (current.value?.publicId === publicId) {
                await loadLines({ status: null, q: '' }).catch(() => undefined);
            }
            const createdTiers = result.createdTiers ?? 0;
            const createdPaymentMethods = result.createdPaymentMethods ?? 0;
            // Moyens créés : `accountChanged` ne revient pas à l’émetteur, on le rejoue (les tiers ont `tierChanged`).
            if (createdPaymentMethods > 0 && next.accountPublicId) {
                useNotificationsStore().dispatchLocalAccountChanged({
                    change: 'paymentMethodCreated',
                    accountPublicId: next.accountPublicId
                });
            }
            notifyAccountTransactions(next.accountPublicId, 'transactionsImported');
            return { import: next, createdTransactions: result.createdTransactions, createdTiers, createdPaymentMethods };
        });
    }

    async function cancelImport(publicId: string) {
        return mutate(publicId, async () => afterStatusChange(await importsApi.cancel(publicId)));
    }

    /** ⚠ Supprime aussi les transactions retouchées depuis l’import. */
    async function revertImport(publicId: string) {
        return mutate(publicId, async () => {
            const result = await importsApi.revert(publicId);
            const next = afterStatusChange(result.import);
            notifyAccountTransactions(next.accountPublicId, 'transactionsReverted');
            return { import: next, revertedTransactions: result.revertedTransactions };
        });
    }

    async function deleteImport(publicId: string) {
        return mutate(publicId, async () => {
            await importsApi.remove(publicId);
            removeImportLocal(publicId);
        });
    }

    function cancelPendingLoads() {
        listRequestSeq += 1;
        currentRequestSeq += 1;
        loading.value = false;
        loadingMore.value = false;
        currentLoading.value = false;
        previewLoading.value = false;
    }

    return {
        loadList,
        loadMore,
        refetchList,
        openImport,
        refreshCurrent,
        closeImport,
        uploadImport,
        reparseImport,
        loadPreview,
        commitImport,
        cancelImport,
        revertImport,
        deleteImport,
        cancelPendingLoads
    };
}

export type ImportsCrud = ReturnType<typeof createImportsCrud>;
