import { AppError } from '@/utils/errors/app-error';
import { personalLoansApi } from '@/features/personal-loans/api';
import { isPersonalLoanCurrency, normalizeListQuery, normalizePersonalLoan } from '@/features/personal-loans/format';
import {
    buildCreatePersonalLoanPayload,
    buildUpdatePersonalLoanPayload,
    type PersonalLoanFormFields,
    type PersonalLoanPayloadContext
} from '@/features/personal-loans/payload';
import { PERSONAL_LOAN_NOT_FOUND_MESSAGE, type ListPersonalLoansQuery, type PersonalLoan } from '@/features/personal-loans/types';
import { listCacheKey, type PersonalLoansState } from '@/features/personal-loans/stores/internal/personal-loans-state';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'directionInvalid':
            return 'Le sens du prêt est invalide.';
        case 'directionLocked':
            return 'Le sens ne se modifie que sur un prêt en cours.';
        case 'counterpartRequired':
            return 'La contrepartie est obligatoire.';
        case 'counterpartLocked':
            return 'La contrepartie ne se modifie que sur un prêt en cours.';
        case 'labelTooLong':
            return 'Le libellé dépasse 150 caractères.';
        case 'initialAmountInvalid':
        case 'initialAmountNotPositive':
            return 'Le montant initial doit être strictement positif.';
        case 'remainingAmountInvalid':
        case 'remainingAmountOutOfRange':
            return 'Le montant restant doit être compris entre 0 et le montant initial.';
        case 'startDateRequired':
            return 'La date de début est obligatoire.';
        case 'startDateInvalid':
            return 'La date de début est invalide.';
        case 'plannedEndDateInvalid':
            return 'La date de fin prévue est invalide.';
        case 'plannedEndDateBeforeStart':
            return 'La date de fin prévue doit être postérieure ou égale à la date de début.';
        case 'notesTooLong':
            return 'Les notes sont trop longues.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'currencyLocked':
            return 'La devise d’un prêt ne peut pas être modifiée.';
        default:
            return 'Données invalides.';
    }
}

export function createPersonalLoansCrud(state: PersonalLoansState) {
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

    function handleNotFound(publicId: string) {
        error.value = PERSONAL_LOAN_NOT_FOUND_MESSAGE;
        removeItemLocal(publicId);
        invalidateAllLists();
    }

    async function loadList(query: ListPersonalLoansQuery & { force?: boolean } = {}) {
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
                        const result = await personalLoansApi.list({
                            status: normalized.status ?? undefined,
                            direction: normalized.direction ?? undefined
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizePersonalLoan);
                        setList(key, nextItems, {
                            totalCount: result?.totalCount ?? nextItems.length,
                            totalLent: Number(result?.totalLent) || 0,
                            totalBorrowed: Number(result?.totalBorrowed) || 0,
                            currency: isPersonalLoanCurrency(result?.currency) ? result.currency : null
                        });
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
        await loadList({ status: query.status ?? undefined, direction: query.direction ?? undefined, force }).catch(() => undefined);
    }

    /** Après une mutation locale : les totaux (devise de base) ne se recalculent que côté serveur. */
    function refreshTotals() {
        invalidateAllLists();
        if (initialized.value) void refetchActive(true);
    }

    async function fetchPersonalLoan(publicId: string, force = false): Promise<PersonalLoan | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const loan = normalizePersonalLoan(await personalLoansApi.get(id));
            upsertItem(loan);
            return loan;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(id);
            else error.value = err.message;
            throw err;
        }
    }

    async function createPersonalLoan(fields: PersonalLoanFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreatePersonalLoanPayload(fields);
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const created = normalizePersonalLoan(await personalLoansApi.create(built.payload));
            rememberLocalMutation(created.publicId);
            upsertItem(created);
            refreshTotals();
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updatePersonalLoan(publicId: string, fields: PersonalLoanFormFields, extra?: PersonalLoanPayloadContext) {
        beginActing();
        clearError();
        try {
            const built = buildUpdatePersonalLoanPayload(fields, { current: extra?.current ?? findByPublicId(publicId) });
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const updated = normalizePersonalLoan(await personalLoansApi.update(publicId, built.payload));
            rememberLocalMutation(updated.publicId);
            upsertItem(updated);
            refreshTotals();
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

    async function deletePersonalLoan(publicId: string) {
        beginActing();
        clearError();
        try {
            await personalLoansApi.remove(publicId);
            rememberLocalMutation(publicId);
            removeItemLocal(publicId);
            notifyDeleted(publicId);
            refreshTotals();
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
        fetchPersonalLoan,
        createPersonalLoan,
        updatePersonalLoan,
        deletePersonalLoan
    };
}

export type PersonalLoansCrud = ReturnType<typeof createPersonalLoansCrud>;
