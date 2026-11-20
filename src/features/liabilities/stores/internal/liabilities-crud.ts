import { AppError } from '@/utils/errors/app-error';
import { liabilitiesApi } from '@/features/liabilities/api';
import { normalizeLiability, normalizeListQuery } from '@/features/liabilities/format';
import {
    buildCreateLiabilityPayload,
    buildSetRemainingAmountPayload,
    buildUpdateLiabilityPayload,
    type LiabilityFormFields,
    type LiabilityPayloadContext,
    type LiabilityRemainingAmountFields
} from '@/features/liabilities/payload';
import { LIABILITY_NOT_FOUND_MESSAGE, type Liability, type ListLiabilitiesQuery } from '@/features/liabilities/types';
import { listCacheKey, type LiabilitiesState } from '@/features/liabilities/stores/internal/liabilities-state';

export const LIABILITY_NOT_FOUND_CODE = 'liability_not_found';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom du passif est obligatoire.';
        case 'nameTooLong':
            return 'Le nom du passif dépasse 150 caractères.';
        case 'typeInvalid':
            return 'Le type du passif est invalide.';
        case 'initialAmountInvalid':
        case 'initialAmountNotPositive':
            return 'Le montant initial doit être strictement positif.';
        case 'remainingAmountInvalid':
        case 'remainingAmountOutOfRange':
            return 'Le montant restant doit être compris entre 0 et le montant initial.';
        case 'interestRateInvalid':
        case 'interestRateOutOfRange':
            return 'Le taux d’intérêt doit être compris entre 0 et 100.';
        case 'startDateInvalid':
            return 'La date de début est invalide.';
        case 'plannedEndDateInvalid':
            return 'La date de fin prévue est invalide.';
        case 'plannedEndDateBeforeStart':
            return 'La date de fin prévue doit être postérieure ou égale à la date de début.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'currencyLocked':
            return 'La devise d’un passif ne peut pas être modifiée.';
        default:
            return 'Données invalides.';
    }
}

export function createLiabilitiesCrud(state: LiabilitiesState) {
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
        error.value = LIABILITY_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of state.itemsByListKey.keys()) cache.touch(key);
    }

    function handleNotFound(publicId: string) {
        rememberNotFound();
        removeItemLocal(publicId);
        invalidateAllLists();
    }

    async function loadList(query: ListLiabilitiesQuery & { force?: boolean } = {}) {
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
                        const result = await liabilitiesApi.list({
                            type: normalized.type ?? undefined,
                            status: normalized.status ?? undefined
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizeLiability);
                        setList(key, nextItems, { totalCount: result?.totalCount ?? nextItems.length });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === listRequestSeq) error.value = AppError.fromUnknown(e).message;
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
        await loadList({ type: query.type ?? undefined, status: query.status ?? undefined, force }).catch(() => undefined);
    }

    async function fetchLiability(publicId: string, force = false): Promise<Liability | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const liability = normalizeLiability(await liabilitiesApi.get(id));
            upsertItem(liability);
            return liability;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(id);
            else error.value = err.message;
            throw err;
        }
    }

    async function createLiability(fields: LiabilityFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateLiabilityPayload(fields);
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const created = normalizeLiability(await liabilitiesApi.create(built.payload));
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

    async function updateLiability(publicId: string, fields: LiabilityFormFields, extra?: LiabilityPayloadContext) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId);
            const built = buildUpdateLiabilityPayload(fields, {
                lockedCurrency: extra?.lockedCurrency ?? current?.currency ?? null
            });
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const updated = normalizeLiability(await liabilitiesApi.update(publicId, built.payload));
            upsertItem(updated);
            touchHydratedListCaches();
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

    /** Geste rapide : met à jour le restant seul (le statut `annule` colle côté serveur). */
    async function setRemainingAmount(publicId: string, fields: LiabilityRemainingAmountFields) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId) ?? normalizeLiability(await liabilitiesApi.get(publicId));
            const built = buildSetRemainingAmountPayload(fields, { initialAmount: current.initialAmount });
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const updated = normalizeLiability(await liabilitiesApi.setRemainingAmount(publicId, built.payload));
            upsertItem(updated);
            touchHydratedListCaches();
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

    async function deleteLiability(publicId: string) {
        beginActing();
        clearError();
        try {
            await liabilitiesApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                handleNotFound(publicId);
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
        fetchLiability,
        createLiability,
        updateLiability,
        setRemainingAmount,
        deleteLiability
    };
}

export type LiabilitiesCrud = ReturnType<typeof createLiabilitiesCrud>;
