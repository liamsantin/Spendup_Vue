import { AppError } from '@/utils/errors/app-error';
import { savingsGoalsApi } from '@/features/savings-goals/api';
import { normalizeListQuery, normalizeSavingsGoal } from '@/features/savings-goals/format';
import {
    buildCreateSavingsGoalPayload,
    buildUnlinkAccountPayload,
    buildUpdateSavingsGoalPayload,
    type SavingsGoalFormFields,
    type SavingsGoalPayloadContext
} from '@/features/savings-goals/payload';
import { SAVINGS_GOAL_NOT_FOUND_MESSAGE, type ListSavingsGoalsQuery, type SavingsGoal } from '@/features/savings-goals/types';
import { listCacheKey, type SavingsGoalsState } from '@/features/savings-goals/stores/internal/savings-goals-state';

export const SAVINGS_GOAL_NOT_FOUND_CODE = 'savings_goal_not_found';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return "Le nom de l'objectif est obligatoire.";
        case 'nameTooLong':
            return "Le nom de l'objectif dépasse 150 caractères.";
        case 'targetAmountInvalid':
        case 'targetAmountNotPositive':
            return 'Le montant cible doit être strictement positif.';
        case 'openingAmountInvalid':
        case 'openingAmountNegative':
            return 'Le montant d’ouverture ne peut pas être négatif.';
        case 'targetDateInvalid':
            return "La date d'échéance est invalide.";
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'currencyLocked':
            return "La devise d'un objectif d'épargne ne peut pas être modifiée.";
        case 'accountInvalid':
            return 'Le compte lié doit être un compte actif dont vous êtes propriétaire.';
        default:
            return 'Données invalides.';
    }
}

export function createSavingsGoalsCrud(state: SavingsGoalsState) {
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
        findByPublicId
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = SAVINGS_GOAL_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of state.itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    async function loadList(query: ListSavingsGoalsQuery & { force?: boolean } = {}) {
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
                        const result = await savingsGoalsApi.list({
                            status: normalized.status ?? undefined,
                            accountPublicId: normalized.accountPublicId ?? undefined
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizeSavingsGoal);
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

    async function refetchActive(force = true) {
        const query = state.activeQuery.value;
        await loadList({
            status: query.status ?? undefined,
            accountPublicId: query.accountPublicId ?? undefined,
            force
        }).catch(() => undefined);
    }

    async function fetchSavingsGoal(publicId: string, force = false): Promise<SavingsGoal | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const goal = normalizeSavingsGoal(await savingsGoalsApi.get(id));
            upsertItem(goal, { replaceContributions: true });
            return goal;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(id);
                invalidateAllLists();
            } else {
                error.value = err.message;
            }
            throw err;
        }
    }

    async function createSavingsGoal(fields: SavingsGoalFormFields, extra?: SavingsGoalPayloadContext) {
        beginActing();
        clearError();
        try {
            const built = buildCreateSavingsGoalPayload(fields, extra);
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = normalizeSavingsGoal(await savingsGoalsApi.create(built.payload));
            upsertItem(created, { replaceContributions: true });
            touchHydratedListCaches();
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

    async function updateSavingsGoal(publicId: string, fields: SavingsGoalFormFields, extra?: SavingsGoalPayloadContext) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId);
            const built = buildUpdateSavingsGoalPayload(fields, {
                lockedCurrency: extra?.lockedCurrency ?? current?.currency ?? null,
                allowedAccountIds: extra?.allowedAccountIds
            });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = normalizeSavingsGoal(await savingsGoalsApi.update(publicId, built.payload));
            upsertItem(updated, { replaceContributions: true });
            touchHydratedListCaches();
            rememberLocalMutation(updated.publicId);
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

    async function unlinkSavingsGoalAccount(publicId: string) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId) ?? normalizeSavingsGoal(await savingsGoalsApi.get(publicId));
            const updated = normalizeSavingsGoal(await savingsGoalsApi.update(publicId, buildUnlinkAccountPayload(current)));
            upsertItem(updated, { replaceContributions: true });
            touchHydratedListCaches();
            rememberLocalMutation(updated.publicId);
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

    async function listLinkedToAccount(accountPublicId: string): Promise<SavingsGoal[]> {
        const id = accountPublicId.trim();
        if (!id) return [];
        try {
            const result = await savingsGoalsApi.list({ accountPublicId: id });
            const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizeSavingsGoal);
            for (const item of nextItems) upsertItem(item);
            return nextItems.filter((item) => item.accountPublicId === id);
        } catch (e: unknown) {
            throw AppError.fromUnknown(e);
        }
    }

    async function deleteSavingsGoal(publicId: string) {
        beginActing();
        clearError();
        try {
            await savingsGoalsApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                invalidateAllLists();
                notifyDeleted(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    return {
        loadList,
        cancelPendingLoads,
        refetchActive,
        fetchSavingsGoal,
        createSavingsGoal,
        updateSavingsGoal,
        unlinkSavingsGoalAccount,
        listLinkedToAccount,
        deleteSavingsGoal
    };
}

export type SavingsGoalsCrud = ReturnType<typeof createSavingsGoalsCrud>;
