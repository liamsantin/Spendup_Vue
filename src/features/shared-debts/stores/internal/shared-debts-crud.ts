import { AppError } from '@/utils/errors/app-error';
import { transactionsApi } from '@/features/transactions';
import type { Transaction } from '@/features/transactions/types';
import { sharedDebtsApi } from '@/features/shared-debts/api';
import { normalizeListQuery, normalizeSharedDebt } from '@/features/shared-debts/format';
import {
    buildCreateSharedDebtPayload,
    buildSettlePayload,
    buildUpdateSharedDebtPayload,
    type SharedDebtFormFields,
    type SharedDebtPayloadContext,
    type SharedDebtSettleContext,
    type SharedDebtSettleFields
} from '@/features/shared-debts/payload';
import { SHARED_DEBT_NOT_FOUND_MESSAGE, type ListSharedDebtsQuery, type SharedDebt } from '@/features/shared-debts/types';
import { listCacheKey, type SharedDebtsState } from '@/features/shared-debts/stores/internal/shared-debts-state';

export const SHARED_DEBT_NOT_FOUND_CODE = 'shared_debt_not_found';

/** Taille de page demandée pour les dépenses candidates (une seule page). */
export const SHARED_DEBT_EXPENSE_CANDIDATES_PAGE_SIZE = 100;

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'friendRequired':
            return 'Choisissez l’ami qui vous doit cette somme.';
        case 'labelRequired':
            return 'Le libellé est obligatoire sans transaction liée.';
        case 'labelTooLong':
            return 'Le libellé dépasse 150 caractères.';
        case 'amountInvalid':
        case 'amountNotPositive':
            return 'Le montant doit être strictement positif.';
        case 'dueDateInvalid':
            return 'La date d’échéance est invalide.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'settleAmountInvalid':
        case 'settleAmountNotPositive':
            return 'Le montant remboursé doit être strictement positif.';
        case 'settleAmountAboveRemaining':
            return 'Le montant remboursé dépasse le reste dû.';
        case 'settleDateInvalid':
            return 'La date de remboursement est invalide.';
        case 'settleDateFuture':
            return 'La date de remboursement ne peut pas être dans le futur.';
        default:
            return 'Données invalides.';
    }
}

export function createSharedDebtsCrud(state: SharedDebtsState) {
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
        invalidateAllLists,
        rememberLocalMutation,
        notifyDeleted,
        findByPublicId,
        expenseCandidates,
        expenseCandidatesLoading
    } = state;

    let listRequestSeq = 0;
    let candidatesRequestSeq = 0;

    function rememberNotFound() {
        error.value = SHARED_DEBT_NOT_FOUND_MESSAGE;
    }

    /**
     * Après une mutation locale : les lignes sont déjà à jour, mais les totaux (`totalOwedToMe` / `totalIOwe`)
     * viennent du serveur → invalide les listes et refetch la liste active en arrière-plan.
     */
    function invalidateAfterMutation() {
        invalidateAllLists();
        if (initialized.value) void refetchActive(true);
    }

    function handleNotFound(publicId: string, notify = false) {
        rememberNotFound();
        removeItemLocal(publicId);
        invalidateAllLists();
        if (notify) notifyDeleted(publicId);
    }

    async function loadList(query: ListSharedDebtsQuery & { force?: boolean } = {}) {
        const normalized = normalizeListQuery(query);
        const key = listCacheKey(normalized);
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
                        const result = await sharedDebtsApi.list({
                            role: normalized.role,
                            status: normalized.status ?? undefined
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizeSharedDebt);
                        setList(key, nextItems, {
                            totalCount: result?.totalCount ?? nextItems.length,
                            totalOwedToMe: Number(result?.totalOwedToMe) || 0,
                            totalIOwe: Number(result?.totalIOwe) || 0,
                            currency: result?.currency ?? null
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
        candidatesRequestSeq += 1;
        loading.value = false;
        expenseCandidatesLoading.value = false;
    }

    async function refetchActive(force = true) {
        const query = state.activeQuery.value;
        await loadList({ role: query.role, status: query.status ?? undefined, force }).catch(() => undefined);
    }

    async function fetchSharedDebt(publicId: string, force = false): Promise<SharedDebt | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const debt = normalizeSharedDebt(await sharedDebtsApi.get(id));
            upsertItem(debt);
            return debt;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(id);
            else error.value = err.message;
            throw err;
        }
    }

    async function createSharedDebt(fields: SharedDebtFormFields, context?: SharedDebtPayloadContext): Promise<SharedDebt> {
        beginActing();
        clearError();
        try {
            const built = buildCreateSharedDebtPayload(fields, context);
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const created = normalizeSharedDebt(await sharedDebtsApi.create(built.payload));
            upsertItem(created);
            invalidateAfterMutation();
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

    /** Mutation créancier générique : upsert du résultat, 404 neutre, mémorisation locale pour le realtime. */
    async function mutate(publicId: string, run: () => Promise<SharedDebt>): Promise<SharedDebt> {
        beginActing();
        clearError();
        try {
            const updated = normalizeSharedDebt(await run());
            upsertItem(updated);
            invalidateAfterMutation();
            rememberLocalMutation(updated.publicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
            else error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    function updateSharedDebt(publicId: string, fields: SharedDebtFormFields): Promise<SharedDebt> {
        return mutate(publicId, () => {
            const built = buildUpdateSharedDebtPayload(fields);
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            return sharedDebtsApi.update(publicId, built.payload);
        });
    }

    function settleSharedDebt(publicId: string, fields: SharedDebtSettleFields, context: SharedDebtSettleContext): Promise<SharedDebt> {
        return mutate(publicId, () => {
            const built = buildSettlePayload(fields, context);
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            return sharedDebtsApi.settle(publicId, built.payload);
        });
    }

    function cancelSharedDebt(publicId: string): Promise<SharedDebt> {
        return mutate(publicId, () => sharedDebtsApi.cancel(publicId));
    }

    async function deleteSharedDebt(publicId: string): Promise<void> {
        beginActing();
        clearError();
        try {
            await sharedDebtsApi.remove(publicId);
            removeItemLocal(publicId);
            invalidateAfterMutation();
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId, true);
            else error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    /** Dépenses possédées, candidates au rattachement d’une dette (recherche serveur, 100 max). */
    async function loadExpenseCandidates(search?: string): Promise<Transaction[]> {
        const requestId = ++candidatesRequestSeq;
        expenseCandidatesLoading.value = true;
        try {
            const result = await transactionsApi.list({
                search: search?.trim() || undefined,
                pageSize: SHARED_DEBT_EXPENSE_CANDIDATES_PAGE_SIZE
            });
            if (requestId !== candidatesRequestSeq) return expenseCandidates.value;
            const expenses = (Array.isArray(result?.items) ? result.items : []).filter((item) => item.type === 'depense');
            expenseCandidates.value = expenses;
            return expenses;
        } catch (e: unknown) {
            throw AppError.fromUnknown(e);
        } finally {
            if (requestId === candidatesRequestSeq) expenseCandidatesLoading.value = false;
        }
    }

    return {
        loadList,
        cancelPendingLoads,
        refetchActive,
        fetchSharedDebt,
        createSharedDebt,
        updateSharedDebt,
        settleSharedDebt,
        cancelSharedDebt,
        deleteSharedDebt,
        loadExpenseCandidates
    };
}

export type SharedDebtsCrud = ReturnType<typeof createSharedDebtsCrud>;
