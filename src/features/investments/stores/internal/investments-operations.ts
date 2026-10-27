import { AppError } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts';
import { investmentsApi } from '@/features/investments/api';
import { normalizeOperation } from '@/features/investments/format';
import { buildSaveOperationPayload, type InvestmentPayloadContext, type OperationFormFields } from '@/features/investments/payload';
import {
    INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE,
    OPERATION_NOT_FOUND_MESSAGE,
    OPERATION_PAGE_SIZE_DEFAULT,
    type InvestmentOperation,
    type ListOperationsQuery,
    type OperationsListResult
} from '@/features/investments/types';
import {
    EMPTY_OPERATIONS_FILTERS,
    operationsCacheKey,
    type InvestmentsState,
    type OperationsFilters,
    type OperationsPage
} from '@/features/investments/stores/internal/investments-state';
import type { InvestmentsPositions } from '@/features/investments/stores/internal/investments-positions';

export type LoadOperationsOptions = Omit<ListOperationsQuery, 'page' | 'pageSize'> & { force?: boolean };

/** Message client des erreurs de validation (le serveur renvoie les siennes en français). */
export function operationPayloadErrorMessage(code: string): string {
    switch (code) {
        case 'instrumentRequired':
            return 'Choisissez un instrument.';
        case 'operationTypeInvalid':
            return 'Le type d’opération est invalide.';
        case 'operationDateInvalid':
            return 'La date de l’opération est invalide.';
        case 'operationDateFuture':
            return 'La date de l’opération ne peut pas être dans le futur.';
        case 'quantityInvalid':
        case 'quantityNotPositive':
            return 'La quantité doit être strictement positive (8 décimales max).';
        case 'unitPriceInvalid':
        case 'unitPriceNegative':
            return 'Le prix unitaire doit être un nombre positif ou nul.';
        case 'totalAmountInvalid':
        case 'totalAmountNotPositive':
            return 'Le montant total doit être strictement positif.';
        case 'transactionNotAllowed':
            return 'Un dépôt ou un retrait de titres ne se lie pas à une transaction.';
        case 'notesTooLong':
            return 'La note dépasse 500 caractères.';
        default:
            return 'Données invalides.';
    }
}

function normalizeFilters(query: LoadOperationsOptions): OperationsFilters {
    return {
        instrumentPublicId: query.instrumentPublicId?.trim() || null,
        type: query.type ?? null,
        from: query.from?.trim() || null,
        to: query.to?.trim() || null
    };
}

function toPage(
    result: OperationsListResult,
    filters: OperationsFilters,
    fallbackPage: number,
    previous: InvestmentOperation[] = []
): OperationsPage {
    const fresh = (Array.isArray(result?.items) ? result.items : []).map(normalizeOperation);
    const seen = new Set(previous.map((item) => item.publicId));
    const items = [...previous, ...fresh.filter((item) => !seen.has(item.publicId))];
    const page = Number(result?.page) || fallbackPage;
    const pageSize = Number(result?.pageSize) || OPERATION_PAGE_SIZE_DEFAULT;
    const totalCount = Number(result?.totalCount) || items.length;
    return { items, page, pageSize, totalCount, hasMore: page * pageSize < totalCount, filters };
}

export function createInvestmentsOperations(state: InvestmentsState, deps: Pick<InvestmentsPositions, 'refetchPositions'>) {
    const {
        loadingOperations,
        error,
        cache,
        initialized,
        clearError,
        beginActing,
        endActing,
        operationsFor,
        setOperations,
        forgetAccount,
        invalidateAccount,
        rememberLocalMutation
    } = state;
    const { refetchPositions } = deps;

    const requestSeqByAccount = new Map<string, number>();

    function nextSeq(accountPublicId: string): number {
        const next = (requestSeqByAccount.get(accountPublicId) ?? 0) + 1;
        requestSeqByAccount.set(accountPublicId, next);
        return next;
    }

    function isCurrent(accountPublicId: string, seq: number): boolean {
        return requestSeqByAccount.get(accountPublicId) === seq;
    }

    function handleLoadError(accountPublicId: string, e: unknown): AppError {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            error.value = INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE;
            forgetAccount(accountPublicId);
        } else {
            error.value = err.message;
        }
        return err;
    }

    /** Première page du journal (plus récent d’abord) avec les filtres donnés. */
    async function loadOperations(accountPublicId: string, options: LoadOperationsOptions = {}) {
        const id = accountPublicId.trim();
        if (!id) return;
        const filters = normalizeFilters(options);
        const key = operationsCacheKey(id, filters);
        const seq = nextSeq(id);
        const current = operationsFor(id);
        const sameFilters = !!current && operationsCacheKey(id, current.filters) === key;
        const force = !!options.force || !sameFilters;
        loadingOperations.value = true;
        clearError();
        try {
            await cache.ensure(
                key,
                async () => {
                    const result = await investmentsApi.listOperations(id, { ...stripNull(filters), page: 1 });
                    if (!isCurrent(id, seq)) return;
                    setOperations(id, toPage(result, filters, 1));
                },
                { force }
            );
        } catch (e: unknown) {
            throw handleLoadError(id, e);
        } finally {
            if (isCurrent(id, seq)) {
                loadingOperations.value = false;
                initialized.value = true;
            }
        }
    }

    /** Page suivante du journal, ajoutée à la suite (dédoublonnée). */
    async function loadMoreOperations(accountPublicId: string) {
        const id = accountPublicId.trim();
        const current = operationsFor(id);
        if (!id || !current || !current.hasMore || loadingOperations.value) return;
        const seq = nextSeq(id);
        loadingOperations.value = true;
        clearError();
        try {
            const result = await investmentsApi.listOperations(id, {
                ...stripNull(current.filters),
                page: current.page + 1,
                pageSize: current.pageSize
            });
            if (!isCurrent(id, seq)) return;
            setOperations(id, toPage(result, current.filters, current.page + 1, current.items));
        } catch (e: unknown) {
            throw handleLoadError(id, e);
        } finally {
            if (isCurrent(id, seq)) loadingOperations.value = false;
        }
    }

    /** Refetch silencieux du journal avec ses filtres courants (page 1). */
    async function refetchOperations(accountPublicId: string) {
        const current = operationsFor(accountPublicId);
        await loadOperations(accountPublicId, { ...stripNull(current?.filters ?? EMPTY_OPERATIONS_FILTERS), force: true }).catch(
            () => undefined
        );
    }

    /** Après écriture : positions + journal du compte, puis le solde du compte (non bloquant). */
    function afterWrite(accountPublicId: string) {
        rememberLocalMutation(accountPublicId);
        invalidateAccount(accountPublicId);
        void refetchPositions(accountPublicId);
        void refetchOperations(accountPublicId);
        try {
            const accounts = useAccountsStore();
            void accounts.loadAccountDetail(accountPublicId, true).catch(() => undefined);
        } catch {
            // store comptes indisponible (tests) : ignoré
        }
    }

    async function getOperation(accountPublicId: string, operationPublicId: string): Promise<InvestmentOperation> {
        try {
            return normalizeOperation(await investmentsApi.getOperation(accountPublicId, operationPublicId));
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) error.value = OPERATION_NOT_FOUND_MESSAGE;
            else error.value = err.message;
            throw err;
        }
    }

    async function createOperation(
        accountPublicId: string,
        fields: OperationFormFields,
        context: InvestmentPayloadContext = {}
    ): Promise<InvestmentOperation> {
        beginActing();
        clearError();
        try {
            const built = buildSaveOperationPayload(fields, context);
            if (!built.ok) throw new AppError(operationPayloadErrorMessage(built.code), 400, built.code);
            const created = normalizeOperation(await investmentsApi.createOperation(accountPublicId, built.payload));
            afterWrite(accountPublicId);
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateOperation(
        accountPublicId: string,
        operationPublicId: string,
        fields: OperationFormFields,
        context: InvestmentPayloadContext = {}
    ): Promise<InvestmentOperation> {
        beginActing();
        clearError();
        try {
            const built = buildSaveOperationPayload(fields, context);
            if (!built.ok) throw new AppError(operationPayloadErrorMessage(built.code), 400, built.code);
            const updated = normalizeOperation(await investmentsApi.updateOperation(accountPublicId, operationPublicId, built.payload));
            afterWrite(accountPublicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                error.value = OPERATION_NOT_FOUND_MESSAGE;
                removeOperationLocal(accountPublicId, operationPublicId);
                invalidateAccount(accountPublicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteOperation(accountPublicId: string, operationPublicId: string): Promise<void> {
        beginActing();
        clearError();
        try {
            await investmentsApi.removeOperation(accountPublicId, operationPublicId);
            removeOperationLocal(accountPublicId, operationPublicId);
            afterWrite(accountPublicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                error.value = OPERATION_NOT_FOUND_MESSAGE;
                removeOperationLocal(accountPublicId, operationPublicId);
                invalidateAccount(accountPublicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    function removeOperationLocal(accountPublicId: string, operationPublicId: string) {
        const current = operationsFor(accountPublicId);
        if (!current || !current.items.some((item) => item.publicId === operationPublicId)) return;
        setOperations(accountPublicId, {
            ...current,
            items: current.items.filter((item) => item.publicId !== operationPublicId),
            totalCount: Math.max(0, current.totalCount - 1)
        });
    }

    function cancelPendingOperations() {
        for (const id of requestSeqByAccount.keys()) nextSeq(id);
        loadingOperations.value = false;
    }

    return {
        loadOperations,
        loadMoreOperations,
        refetchOperations,
        getOperation,
        createOperation,
        updateOperation,
        deleteOperation,
        cancelPendingOperations
    };
}

/** Filtres → query API (clés `null` omises). */
function stripNull(filters: OperationsFilters): Omit<ListOperationsQuery, 'page' | 'pageSize'> {
    const query: Omit<ListOperationsQuery, 'page' | 'pageSize'> = {};
    if (filters.instrumentPublicId) query.instrumentPublicId = filters.instrumentPublicId;
    if (filters.type) query.type = filters.type;
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
    return query;
}

export type InvestmentsOperations = ReturnType<typeof createInvestmentsOperations>;
