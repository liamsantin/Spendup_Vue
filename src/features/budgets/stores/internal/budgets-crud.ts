import { AppError } from '@/utils/errors/app-error';
import { budgetsApi } from '@/features/budgets/api';
import { normalizeListQuery } from '@/features/budgets/format';
import { buildCreateBudgetPayload, buildUpdateBudgetPayload, type BudgetFormFields } from '@/features/budgets/payload';
import type { Budget, ListBudgetsQuery } from '@/features/budgets/types';
import { listCacheKey, type BudgetsState } from '@/features/budgets/stores/internal/budgets-state';

export const BUDGET_NOT_FOUND_CODE = 'budget_not_found';
export const BUDGET_NOT_FOUND_MESSAGE = 'Budget introuvable.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom du budget est obligatoire.';
        case 'nameTooLong':
            return 'Le nom du budget dépasse 150 caractères.';
        case 'amountInvalid':
        case 'amountNotPositive':
            return 'La limite du budget doit être strictement positive.';
        case 'periodeInvalid':
            return 'Période invalide (hebdomadaire, mensuel, trimestriel, annuel).';
        case 'startDateRequired':
        case 'startDateInvalid':
            return 'La date de début est invalide.';
        case 'endDateInvalid':
            return 'La date de fin est invalide.';
        case 'endDateBeforeStart':
            return 'La date de fin ne peut pas précéder la date de début.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'currencyLocked':
            return "La devise d'un budget ne peut pas être modifiée.";
        case 'scopeDuplicate':
            return 'Un budget existe déjà pour cette catégorie, cette période et cette date de début.';
        case 'categoryTypeInvalid':
            return "Un budget ne peut être rattaché qu'à une catégorie de dépense ou mixte.";
        default:
            return 'Données invalides.';
    }
}

export function createBudgetsCrud(state: BudgetsState) {
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
        allKnownItems
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = BUDGET_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of state.itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    async function loadList(query: ListBudgetsQuery & { force?: boolean } = {}) {
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
                        const result = await budgetsApi.list({
                            isActive: normalized.isActive ?? undefined,
                            periode: normalized.periode ?? undefined,
                            categoryPublicId: normalized.categoryPublicId ?? undefined
                        });
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

    async function refetchActive(force = true) {
        const query = state.activeQuery.value;
        await loadList({
            isActive: query.isActive ?? undefined,
            periode: query.periode ?? undefined,
            categoryPublicId: query.categoryPublicId ?? undefined,
            force
        }).catch(() => undefined);
    }

    async function fetchBudget(publicId: string, force = false): Promise<Budget | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const budget = await budgetsApi.get(id);
            upsertItem(budget);
            return budget;
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

    async function createBudget(fields: BudgetFormFields, extra?: { categoryTypes?: ReadonlyMap<string, string> }) {
        beginActing();
        clearError();
        try {
            const built = buildCreateBudgetPayload(fields, {
                knownBudgets: allKnownItems(),
                categoryTypes: extra?.categoryTypes
            });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await budgetsApi.create(built.payload);
            upsertItem(created);
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

    async function updateBudget(
        publicId: string,
        fields: BudgetFormFields,
        extra?: { lockedCurrency?: Budget['currency'] | null; categoryTypes?: ReadonlyMap<string, string> }
    ) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId);
            const built = buildUpdateBudgetPayload(fields, {
                knownBudgets: allKnownItems(),
                excludePublicId: publicId,
                lockedCurrency: extra?.lockedCurrency ?? current?.currency ?? null,
                categoryTypes: extra?.categoryTypes
            });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await budgetsApi.update(publicId, built.payload);
            upsertItem(updated);
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

    async function deleteBudget(publicId: string) {
        beginActing();
        clearError();
        try {
            await budgetsApi.remove(publicId);
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
        fetchBudget,
        createBudget,
        updateBudget,
        deleteBudget
    };
}

export type BudgetsCrud = ReturnType<typeof createBudgetsCrud>;
