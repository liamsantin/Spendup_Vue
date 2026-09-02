import { AppError } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { paymentMethodsApi } from '@/features/payment-methods/api';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import {
    buildCreatePaymentMethodPayload,
    buildUpdatePaymentMethodPayload,
    type PaymentMethodFormFields
} from '@/features/payment-methods/payload';
import { PAYMENT_METHOD_PAGE_SIZE_DEFAULT, type ListPaymentMethodsQuery, type PaymentMethod } from '@/features/payment-methods/types';
import { KEY_GLOBAL, listCacheKey, type PaymentMethodsState } from '@/features/payment-methods/stores/internal/payment-methods-state';

export const PAYMENT_METHOD_NOT_FOUND_CODE = 'payment_method_not_found';
export const PAYMENT_METHOD_NOT_FOUND_MESSAGE = 'Moyen de paiement introuvable.';
export const PAYMENT_METHOD_FORBIDDEN_CODE = 'payment_method_forbidden';
export const PAYMENT_METHOD_FORBIDDEN_MESSAGE = 'Action non autorisée sur ce moyen de paiement.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'accountRequired':
            return 'Compte requis.';
        case 'labelRequired':
            return 'Libellé requis.';
        case 'labelTooLong':
            return 'Libellé trop long.';
        case 'labelDuplicate':
            return 'Ce libellé existe déjà sur ce compte.';
        case 'referenceTooLong':
            return 'Référence trop longue.';
        case 'lastFourInvalid':
            return 'Les quatre derniers chiffres doivent être exactement 4 chiffres.';
        case 'expirationInvalid':
            return 'Date d’expiration invalide.';
        case 'expirationPast':
            return 'Un moyen actif ne peut pas avoir une date d’expiration passée.';
        case 'isActiveRequired':
            return 'isActive est obligatoire.';
        case 'typeInvalid':
            return 'Type invalide.';
        default:
            return 'Données invalides.';
    }
}

/**
 * CRUD listes paginées + mutations.
 */
export function createPaymentMethodsCrud(state: PaymentMethodsState) {
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
        allKnownItems
    } = state;

    let listRequestSeq = 0;

    function assertCanWrite(accountPublicId: string) {
        const account = useAccountsStore().accounts.find((a) => a.publicId === accountPublicId);
        if (!account) return;
        if (!canWritePaymentMethods(account)) {
            throw new AppError(PAYMENT_METHOD_FORBIDDEN_MESSAGE, 403, PAYMENT_METHOD_FORBIDDEN_CODE);
        }
    }

    function rememberNotFound() {
        error.value = PAYMENT_METHOD_NOT_FOUND_MESSAGE;
    }

    /** Ne marque une liste comme fraîche que si elle a déjà été hydratée (évite un TTL sur une liste globale vide). */
    function touchHydratedListCaches(accountPublicId?: string | null) {
        if (accountPublicId) cache.touch(listCacheKey(accountPublicId));
        if (itemsByListKey.has(KEY_GLOBAL)) cache.touch(KEY_GLOBAL);
    }

    function dropGlobalListSnapshot() {
        itemsByListKey.delete(KEY_GLOBAL);
        cache.invalidate(KEY_GLOBAL);
    }

    /**
     * Charge une page de moyens (globale ou filtrée par compte).
     */
    async function loadList(query: ListPaymentMethodsQuery & { force?: boolean } = {}) {
        const accountPublicId = query.accountPublicId?.trim() || null;
        const key = listCacheKey(accountPublicId);
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        const cacheKey = key;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchPage(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                cacheKey,
                async () => {
                    try {
                        const result = await paymentMethodsApi.list({
                            accountPublicId: accountPublicId ?? undefined,
                            page: 1,
                            pageSize: query.pageSize ?? PAYMENT_METHOD_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? PAYMENT_METHOD_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === listRequestSeq) {
                            const err = AppError.fromUnknown(e);
                            error.value = err.message;
                            if (err.status === 404) rememberNotFound();
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
            if (requestId === listRequestSeq && (force || !cache.isFresh(cacheKey)) && !applied) {
                await fetchPage(true);
            }
        } finally {
            if (requestId === listRequestSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
        if (requestId !== listRequestSeq) {
            cache.invalidate(cacheKey);
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
        const accountPublicId = key === KEY_GLOBAL ? null : key.slice(5);
        const requestId = ++listRequestSeq;
        loadingMore.value = true;
        clearError();
        try {
            const nextPage = page.value + 1;
            const result = await paymentMethodsApi.list({
                accountPublicId: accountPublicId ?? undefined,
                page: nextPage,
                pageSize: pageSize.value || PAYMENT_METHOD_PAGE_SIZE_DEFAULT
            });
            if (requestId !== listRequestSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = itemsByListKey.get(key)?.items ?? [];
            const byId = new Map<string, PaymentMethod>();
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

    async function createPaymentMethod(fields: PaymentMethodFormFields) {
        beginActing();
        clearError();
        try {
            assertCanWrite(fields.accountPublicId);
            const built = buildCreatePaymentMethodPayload(fields, allKnownItems());
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await paymentMethodsApi.create(built.payload);
            upsertItem(created);
            touchHydratedListCaches(created.accountPublicId);
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? PAYMENT_METHOD_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updatePaymentMethod(publicId: string, fields: PaymentMethodFormFields) {
        beginActing();
        clearError();
        try {
            assertCanWrite(fields.accountPublicId);
            const built = buildUpdatePaymentMethodPayload(fields, allKnownItems(), publicId);
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await paymentMethodsApi.update(publicId, built.payload);
            upsertItem(updated);
            touchHydratedListCaches(updated.accountPublicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId, fields.accountPublicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deletePaymentMethod(publicId: string, accountPublicId?: string | null) {
        beginActing();
        clearError();
        try {
            if (accountPublicId) assertCanWrite(accountPublicId);
            await paymentMethodsApi.remove(publicId);
            removeItemLocal(publicId, accountPublicId);
            touchHydratedListCaches(accountPublicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId, accountPublicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchAccount(accountPublicId: string) {
        cache.invalidate(listCacheKey(accountPublicId));
        const currentAccount = activeListKey.value === KEY_GLOBAL ? null : activeListKey.value.slice(5);
        if (!currentAccount || currentAccount === accountPublicId) {
            cache.invalidate(KEY_GLOBAL);
            await loadList({
                accountPublicId: currentAccount ?? undefined,
                force: true
            }).catch(() => undefined);
            return;
        }
        dropGlobalListSnapshot();
        try {
            const result = await paymentMethodsApi.list({
                accountPublicId,
                page: 1,
                pageSize: PAYMENT_METHOD_PAGE_SIZE_DEFAULT
            });
            const nextItems = Array.isArray(result?.items) ? result.items : [];
            setList(listCacheKey(accountPublicId), nextItems, {
                page: result?.page ?? 1,
                pageSize: result?.pageSize ?? PAYMENT_METHOD_PAGE_SIZE_DEFAULT,
                totalCount: result?.totalCount ?? nextItems.length
            });
            cache.touch(listCacheKey(accountPublicId));
        } catch {
            // ignore background realtime errors
        }
    }

    return {
        loadList,
        loadMore,
        cancelPendingLoads,
        createPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        refetchAccount
    };
}

export type PaymentMethodsCrud = ReturnType<typeof createPaymentMethodsCrud>;
