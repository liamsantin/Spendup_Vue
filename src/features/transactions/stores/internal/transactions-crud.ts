import { AppError } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { involvedAccountPublicIds } from '@/features/transactions/format';
import { transactionsApi } from '@/features/transactions/api';
import { canWriteTransaction, canWriteTransactions, canWriteTransfer } from '@/features/transactions/rights';
import { buildCreateTransactionPayload, buildUpdateTransactionPayload, type TransactionFormFields } from '@/features/transactions/payload';
import { TRANSACTION_PAGE_SIZE_DEFAULT, type ListTransactionsQuery, type Transaction } from '@/features/transactions/types';
import {
    EMPTY_LIST_QUERY,
    listCacheKey,
    normalizeListQuery,
    parseListCacheKey,
    type TransactionsState
} from '@/features/transactions/stores/internal/transactions-state';

export const TRANSACTION_NOT_FOUND_CODE = 'transaction_not_found';
export const TRANSACTION_NOT_FOUND_MESSAGE = 'Cette transaction n’est plus disponible.';
export const TRANSACTION_FORBIDDEN_CODE = 'transaction_forbidden';
export const TRANSACTION_FORBIDDEN_MESSAGE = 'Action non autorisée sur cette transaction.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'typeInvalid':
            return 'Type de transaction invalide (depense, revenu, transfert).';
        case 'accountRequired':
            return 'Compte requis.';
        case 'labelRequired':
            return 'Le libellé de la transaction est obligatoire.';
        case 'labelTooLong':
            return 'Le libellé de la transaction dépasse 255 caractères.';
        case 'amountInvalid':
            return 'Le montant de la transaction est invalide.';
        case 'amountNotPositive':
            return 'Le montant de la transaction doit être strictement positif.';
        case 'operationDateRequired':
            return 'La date d’opération est obligatoire.';
        case 'operationDateInvalid':
            return 'La date d’opération est invalide.';
        case 'operationDateFuture':
            return 'La date d’opération ne peut pas être dans le futur.';
        case 'valueDateInvalid':
            return 'La date de valeur est invalide.';
        case 'valueDateBeforeOperation':
            return 'La date de valeur ne peut pas précéder la date d’opération.';
        case 'counterpartyRequired':
            return 'Le compte cible est obligatoire pour un transfert.';
        case 'counterpartyNotAllowed':
            return 'Un compte cible n’est accepté que pour un transfert.';
        case 'counterpartySame':
            return 'Les deux comptes d’un transfert doivent être différents.';
        case 'accountArchived':
            return 'Impossible de modifier un compte archivé. Restaurez-le d’abord.';
        case 'currencyMismatch':
            return 'Les deux comptes d’un transfert doivent partager la même devise.';
        case 'forbidden':
            return TRANSACTION_FORBIDDEN_MESSAGE;
        default:
            return 'Données invalides.';
    }
}

/**
 * CRUD listes paginées + mutations.
 */
export function createTransactionsCrud(state: TransactionsState) {
    const {
        items,
        itemsByListKey,
        activeListKey,
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

    function accountsStore() {
        return useAccountsStore();
    }

    function assertCanWriteAccounts(accountPublicIds: string[]) {
        const accounts = accountsStore().accounts;
        for (const id of accountPublicIds) {
            const account = accounts.find((a) => a.publicId === id);
            if (!account || !canWriteTransactions(account)) {
                throw new AppError(TRANSACTION_FORBIDDEN_MESSAGE, 403, TRANSACTION_FORBIDDEN_CODE);
            }
        }
    }

    function rememberNotFound() {
        error.value = TRANSACTION_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    async function refreshAccountBalances(accountPublicIds: string[]) {
        const accounts = accountsStore();
        await accounts.loadAccounts(true).catch(() => undefined);
        const selected = accounts.selectedAccount?.publicId;
        if (selected && accountPublicIds.includes(selected)) {
            await accounts.loadAccountDetail(selected, true).catch(() => undefined);
        }
    }

    async function loadList(query: ListTransactionsQuery & { force?: boolean } = {}) {
        const normalized = normalizeListQuery(query);
        const key = listCacheKey(normalized);
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
                        const result = await transactionsApi.list({
                            accountPublicId: normalized.accountPublicId ?? undefined,
                            categoryPublicId: normalized.categoryPublicId ?? undefined,
                            tierPublicId: normalized.tierPublicId ?? undefined,
                            from: normalized.from ?? undefined,
                            to: normalized.to ?? undefined,
                            page: 1,
                            pageSize: query.pageSize ?? TRANSACTION_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? TRANSACTION_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === listRequestSeq) {
                            const err = AppError.fromUnknown(e);
                            error.value = err.status === 404 ? TRANSACTION_NOT_FOUND_MESSAGE : err.message;
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
        const key = activeListKey.value;
        const query = parseListCacheKey(key);
        const requestId = ++listRequestSeq;
        loadingMore.value = true;
        clearError();
        try {
            const nextPage = page.value + 1;
            const result = await transactionsApi.list({
                accountPublicId: query.accountPublicId ?? undefined,
                categoryPublicId: query.categoryPublicId ?? undefined,
                tierPublicId: query.tierPublicId ?? undefined,
                from: query.from ?? undefined,
                to: query.to ?? undefined,
                page: nextPage,
                pageSize: pageSize.value || TRANSACTION_PAGE_SIZE_DEFAULT
            });
            if (requestId !== listRequestSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = itemsByListKey.get(key)?.items ?? [];
            const byId = new Map<string, Transaction>();
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

    async function createTransaction(fields: TransactionFormFields) {
        beginActing();
        clearError();
        try {
            const accounts = accountsStore().accounts;
            const source = accounts.find((a) => a.publicId === fields.accountPublicId.trim());
            if (!source || !canWriteTransactions(source)) {
                throw new AppError(TRANSACTION_FORBIDDEN_MESSAGE, 403, TRANSACTION_FORBIDDEN_CODE);
            }
            if (fields.type === 'transfert') {
                const target = accounts.find((a) => a.publicId === fields.counterpartyAccountPublicId.trim());
                if (!canWriteTransfer(source, target)) {
                    throw new AppError(TRANSACTION_FORBIDDEN_MESSAGE, 403, TRANSACTION_FORBIDDEN_CODE);
                }
            }
            const built = buildCreateTransactionPayload(fields, { accounts });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await transactionsApi.create(built.payload);
            upsertItem(created);
            touchHydratedListCaches();
            await refreshAccountBalances(involvedAccountPublicIds(created));
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? TRANSACTION_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateTransaction(publicId: string, fields: TransactionFormFields) {
        beginActing();
        clearError();
        try {
            const accounts = accountsStore().accounts;
            const known = state.allKnownItems().find((item) => item.publicId === publicId);
            if (known && !canWriteTransaction(known, accounts)) {
                throw new AppError(TRANSACTION_FORBIDDEN_MESSAGE, 403, TRANSACTION_FORBIDDEN_CODE);
            }
            if (!known) {
                assertCanWriteAccounts([fields.accountPublicId.trim()].filter(Boolean));
            }
            const built = buildUpdateTransactionPayload(fields, { accounts });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await transactionsApi.update(publicId, built.payload);
            upsertItem(updated);
            touchHydratedListCaches();
            await refreshAccountBalances(involvedAccountPublicIds(updated));
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteTransaction(publicId: string) {
        beginActing();
        clearError();
        const known = state.allKnownItems().find((item) => item.publicId === publicId);
        const accountIds = known ? involvedAccountPublicIds(known) : [];
        try {
            if (known) {
                const accounts = accountsStore().accounts;
                if (!canWriteTransaction(known, accounts)) {
                    throw new AppError(TRANSACTION_FORBIDDEN_MESSAGE, 403, TRANSACTION_FORBIDDEN_CODE);
                }
            }
            await transactionsApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            await refreshAccountBalances(accountIds);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchAccount(accountPublicId: string) {
        invalidateAllLists();
        const current = parseListCacheKey(activeListKey.value);
        const touchesActive = !current.accountPublicId || current.accountPublicId === accountPublicId;
        if (touchesActive) {
            await loadList({
                accountPublicId: current.accountPublicId ?? undefined,
                categoryPublicId: current.categoryPublicId ?? undefined,
                tierPublicId: current.tierPublicId ?? undefined,
                from: current.from ?? undefined,
                to: current.to ?? undefined,
                force: true
            }).catch(() => undefined);
            return;
        }
        const key = listCacheKey({ ...EMPTY_LIST_QUERY, accountPublicId });
        try {
            const result = await transactionsApi.list({
                accountPublicId,
                page: 1,
                pageSize: TRANSACTION_PAGE_SIZE_DEFAULT
            });
            const nextItems = Array.isArray(result?.items) ? result.items : [];
            setList(key, nextItems, {
                page: result?.page ?? 1,
                pageSize: result?.pageSize ?? TRANSACTION_PAGE_SIZE_DEFAULT,
                totalCount: result?.totalCount ?? nextItems.length
            });
            cache.touch(key);
        } catch {
            // ignore background realtime errors
        }
    }

    async function refetchActive(force = true) {
        const current = parseListCacheKey(activeListKey.value);
        await loadList({
            accountPublicId: current.accountPublicId ?? undefined,
            categoryPublicId: current.categoryPublicId ?? undefined,
            tierPublicId: current.tierPublicId ?? undefined,
            from: current.from ?? undefined,
            to: current.to ?? undefined,
            force
        }).catch(() => undefined);
    }

    return {
        loadList,
        loadMore,
        cancelPendingLoads,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        refetchAccount,
        refetchActive,
        refreshAccountBalances
    };
}

export type TransactionsCrud = ReturnType<typeof createTransactionsCrud>;
