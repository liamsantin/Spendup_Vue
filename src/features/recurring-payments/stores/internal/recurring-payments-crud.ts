import { AppError } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import { recurringExpensesApi, recurringIncomesApi } from '@/features/recurring-payments/api';
import {
    buildConfirmDuePayload,
    buildCreateExpensePayload,
    buildCreateIncomePayload,
    buildUpdateExpensePayload,
    buildUpdateIncomePayload,
    type ConfirmDueFormFields,
    type RecurringTemplateFormFields
} from '@/features/recurring-payments/payload';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import {
    RECURRING_PAGE_SIZE_DEFAULT,
    type ConfirmDueBody,
    type ListRecurringDuesQuery,
    type ListRecurringTemplatesQuery,
    type RecurringExpense,
    type RecurringIncome,
    type RecurringKind
} from '@/features/recurring-payments/types';
import { listCacheKey, type RecurringPaymentsState } from '@/features/recurring-payments/stores/internal/recurring-payments-state';

export const RECURRING_NOT_FOUND_CODE = 'recurring_not_found';
export const RECURRING_NOT_FOUND_MESSAGE = 'Charge/revenu/échéance introuvable.';
export const RECURRING_FORBIDDEN_CODE = 'recurring_forbidden';
export const RECURRING_FORBIDDEN_MESSAGE = 'Action non autorisée sur cette récurrence.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Nom requis.';
        case 'nameTooLong':
            return 'Nom trop long.';
        case 'typeInvalid':
            return 'Type invalide.';
        case 'frequencyInvalid':
            return 'Fréquence invalide.';
        case 'amountInvalid':
            return 'Montant invalide.';
        case 'amountNotPositive':
            return 'Le montant doit être supérieur à 0.';
        case 'startDateRequired':
            return 'Date de début requise.';
        case 'startDateInvalid':
            return 'Date de début invalide.';
        case 'endDateInvalid':
            return 'Date de fin invalide.';
        case 'endDateBeforeStart':
            return 'La date de fin doit être après le début.';
        case 'accountRequired':
            return 'Compte requis.';
        case 'accountArchived':
            return 'Ce compte est archivé.';
        case 'forbidden':
            return RECURRING_FORBIDDEN_MESSAGE;
        case 'paymentDayInvalid':
            return 'Le jour de paiement doit être entre 1 et 28.';
        case 'notesTooLong':
            return 'Notes trop longues.';
        case 'paymentDateInvalid':
            return 'Date de paiement invalide.';
        case 'paymentDateFuture':
            return 'La date de paiement ne peut pas être dans le futur.';
        default:
            return 'Données invalides.';
    }
}

export function createRecurringPaymentsCrud(state: RecurringPaymentsState) {
    const {
        expenses,
        incomes,
        expensesByKey,
        incomesByKey,
        activeExpenseKey,
        activeIncomeKey,
        expensePage,
        expensePageSize,
        expenseTotalCount,
        incomePage,
        incomePageSize,
        incomeTotalCount,
        loadingExpenses,
        loadingIncomes,
        loadingMoreExpenses,
        loadingMoreIncomes,
        loadingDetail,
        loadingDues,
        error,
        cache,
        initializedExpenses,
        initializedIncomes,
        clearError,
        beginActing,
        endActing,
        setExpenseList,
        setIncomeList,
        activateExpenseList,
        activateIncomeList,
        upsertExpense,
        upsertIncome,
        removeExpenseLocal,
        removeIncomeLocal,
        setDues,
        upsertDue
    } = state;

    let expenseListSeq = 0;
    let incomeListSeq = 0;
    let duesSeq = 0;

    function accounts() {
        return useAccountsStore().accounts;
    }

    function payloadContext() {
        return { accounts: accounts(), requireWrite: true as const };
    }

    function rememberNotFound() {
        error.value = RECURRING_NOT_FOUND_MESSAGE;
    }

    async function refreshLinkedFinance(accountPublicId?: string | null) {
        const tx = useTransactionsStore();
        if (tx.initialized) {
            void tx.refetchActive(true).catch(() => undefined);
        }
        await useAccountsStore()
            .loadAccounts(true)
            .catch(() => undefined);
        const selected = useAccountsStore().selectedAccount?.publicId;
        if (selected && accountPublicId && selected === accountPublicId) {
            await useAccountsStore()
                .loadAccountDetail(selected, true)
                .catch(() => undefined);
        }
    }

    async function loadExpenses(query: ListRecurringTemplatesQuery & { force?: boolean } = {}) {
        const accountPublicId = query.accountPublicId?.trim() || null;
        const key = listCacheKey('expense', accountPublicId);
        const requestId = ++expenseListSeq;
        const force = !!query.force;
        activateExpenseList(key);
        loadingExpenses.value = true;
        clearError();

        async function fetchPage(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await recurringExpensesApi.list({
                            ...query,
                            accountPublicId: accountPublicId ?? undefined,
                            page: 1,
                            pageSize: query.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== expenseListSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setExpenseList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === expenseListSeq) {
                            const err = AppError.fromUnknown(e);
                            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
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
            if (requestId === expenseListSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchPage(true);
            }
        } finally {
            if (requestId === expenseListSeq) {
                loadingExpenses.value = false;
                initializedExpenses.value = true;
            }
        }
        if (requestId !== expenseListSeq) {
            cache.invalidate(key);
            return;
        }
        activateExpenseList(key);
    }

    async function loadIncomes(query: ListRecurringTemplatesQuery & { force?: boolean } = {}) {
        const accountPublicId = query.accountPublicId?.trim() || null;
        const key = listCacheKey('income', accountPublicId);
        const requestId = ++incomeListSeq;
        const force = !!query.force;
        activateIncomeList(key);
        loadingIncomes.value = true;
        clearError();

        async function fetchPage(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await recurringIncomesApi.list({
                            ...query,
                            accountPublicId: accountPublicId ?? undefined,
                            page: 1,
                            pageSize: query.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== incomeListSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setIncomeList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === incomeListSeq) {
                            const err = AppError.fromUnknown(e);
                            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
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
            if (requestId === incomeListSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchPage(true);
            }
        } finally {
            if (requestId === incomeListSeq) {
                loadingIncomes.value = false;
                initializedIncomes.value = true;
            }
        }
        if (requestId !== incomeListSeq) {
            cache.invalidate(key);
            return;
        }
        activateIncomeList(key);
    }

    function cancelPendingLoads() {
        expenseListSeq += 1;
        incomeListSeq += 1;
        duesSeq += 1;
        loadingExpenses.value = false;
        loadingIncomes.value = false;
        loadingMoreExpenses.value = false;
        loadingMoreIncomes.value = false;
        loadingDetail.value = false;
        loadingDues.value = false;
    }

    async function loadMoreExpenses() {
        if (loadingExpenses.value || loadingMoreExpenses.value) return;
        if (expenses.value.length >= expenseTotalCount.value) return;
        const key = activeExpenseKey.value;
        const accountPublicId = key.endsWith(':all') ? null : key.slice('expense:'.length);
        const requestId = ++expenseListSeq;
        loadingMoreExpenses.value = true;
        clearError();
        try {
            const nextPage = expensePage.value + 1;
            const result = await recurringExpensesApi.list({
                accountPublicId: accountPublicId ?? undefined,
                page: nextPage,
                pageSize: expensePageSize.value || RECURRING_PAGE_SIZE_DEFAULT
            });
            if (requestId !== expenseListSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = expensesByKey.get(key)?.items ?? [];
            const byId = new Map<string, RecurringExpense>();
            for (const item of prev) byId.set(item.publicId, item);
            for (const item of incoming) byId.set(item.publicId, item);
            setExpenseList(key, [...byId.values()], {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? expensePageSize.value,
                totalCount: result?.totalCount ?? expenseTotalCount.value
            });
            cache.touch(key);
        } catch (e: unknown) {
            if (requestId === expenseListSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === expenseListSeq) loadingMoreExpenses.value = false;
        }
    }

    async function loadMoreIncomes() {
        if (loadingIncomes.value || loadingMoreIncomes.value) return;
        if (incomes.value.length >= incomeTotalCount.value) return;
        const key = activeIncomeKey.value;
        const accountPublicId = key.endsWith(':all') ? null : key.slice('income:'.length);
        const requestId = ++incomeListSeq;
        loadingMoreIncomes.value = true;
        clearError();
        try {
            const nextPage = incomePage.value + 1;
            const result = await recurringIncomesApi.list({
                accountPublicId: accountPublicId ?? undefined,
                page: nextPage,
                pageSize: incomePageSize.value || RECURRING_PAGE_SIZE_DEFAULT
            });
            if (requestId !== incomeListSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = incomesByKey.get(key)?.items ?? [];
            const byId = new Map<string, RecurringIncome>();
            for (const item of prev) byId.set(item.publicId, item);
            for (const item of incoming) byId.set(item.publicId, item);
            setIncomeList(key, [...byId.values()], {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? incomePageSize.value,
                totalCount: result?.totalCount ?? incomeTotalCount.value
            });
            cache.touch(key);
        } catch (e: unknown) {
            if (requestId === incomeListSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === incomeListSeq) loadingMoreIncomes.value = false;
        }
    }

    async function getExpense(publicId: string, force = false) {
        loadingDetail.value = true;
        clearError();
        try {
            const cached = state.getDetail('expense', publicId);
            if (cached && !force && 'files' in cached) return cached as RecurringExpense;
            const detail = await recurringExpensesApi.get(publicId);
            upsertExpense(detail);
            return detail;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeExpenseLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            loadingDetail.value = false;
        }
    }

    async function getIncome(publicId: string, force = false) {
        loadingDetail.value = true;
        clearError();
        try {
            const cached = state.getDetail('income', publicId);
            if (cached && !force && 'incomeType' in cached && cached.upcomingDues?.length) return cached as RecurringIncome;
            const detail = await recurringIncomesApi.get(publicId);
            upsertIncome(detail);
            return detail;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeIncomeLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            loadingDetail.value = false;
        }
    }

    async function createExpense(fields: RecurringTemplateFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateExpensePayload(fields, payloadContext());
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const created = await recurringExpensesApi.create(built.payload);
            upsertExpense(created);
            cache.touch(listCacheKey('expense'));
            cache.touch(listCacheKey('expense', created.accountPublicId));
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function createIncome(fields: RecurringTemplateFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateIncomePayload(fields, payloadContext());
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const created = await recurringIncomesApi.create(built.payload);
            upsertIncome(created);
            cache.touch(listCacheKey('income'));
            cache.touch(listCacheKey('income', created.accountPublicId));
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateExpense(publicId: string, fields: RecurringTemplateFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildUpdateExpensePayload(fields, payloadContext());
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const updated = await recurringExpensesApi.update(publicId, built.payload);
            upsertExpense(updated);
            cache.touch(listCacheKey('expense'));
            cache.touch(listCacheKey('expense', updated.accountPublicId));
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeExpenseLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateIncome(publicId: string, fields: RecurringTemplateFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildUpdateIncomePayload(fields, payloadContext());
            if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            const updated = await recurringIncomesApi.update(publicId, built.payload);
            upsertIncome(updated);
            cache.touch(listCacheKey('income'));
            cache.touch(listCacheKey('income', updated.accountPublicId));
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeIncomeLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteExpense(publicId: string) {
        beginActing();
        clearError();
        try {
            await recurringExpensesApi.remove(publicId);
            removeExpenseLocal(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeExpenseLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteIncome(publicId: string) {
        beginActing();
        clearError();
        try {
            await recurringIncomesApi.remove(publicId);
            removeIncomeLocal(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeIncomeLocal(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function loadDues(kind: RecurringKind, publicId: string, query: ListRecurringDuesQuery & { force?: boolean } = {}) {
        const requestId = ++duesSeq;
        loadingDues.value = true;
        clearError();
        try {
            const result =
                kind === 'expense'
                    ? await recurringExpensesApi.listDues(publicId, query)
                    : await recurringIncomesApi.listDues(publicId, query);
            if (requestId !== duesSeq) return [];
            const items = Array.isArray(result?.items) ? result.items : [];
            setDues(kind, publicId, items, {
                page: result?.page ?? 1,
                pageSize: result?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
                totalCount: result?.totalCount ?? items.length
            });
            return items;
        } catch (e: unknown) {
            if (requestId === duesSeq) {
                const err = AppError.fromUnknown(e);
                error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            }
            throw e;
        } finally {
            if (requestId === duesSeq) loadingDues.value = false;
        }
    }

    async function confirmDue(kind: RecurringKind, templatePublicId: string, duePublicId: string, fields?: ConfirmDueFormFields) {
        beginActing();
        clearError();
        try {
            let body: ConfirmDueBody = {};
            if (fields) {
                const built = buildConfirmDuePayload(fields);
                if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
                body = built.payload;
            }
            const due =
                kind === 'expense'
                    ? await recurringExpensesApi.confirmDue(templatePublicId, duePublicId, body)
                    : await recurringIncomesApi.confirmDue(templatePublicId, duePublicId, body);
            upsertDue(kind, templatePublicId, due);
            const template = kind === 'expense' ? await getExpense(templatePublicId, true) : await getIncome(templatePublicId, true);
            await refreshLinkedFinance(template.accountPublicId);
            return due;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function skipDue(kind: RecurringKind, templatePublicId: string, duePublicId: string) {
        beginActing();
        clearError();
        try {
            const due =
                kind === 'expense'
                    ? await recurringExpensesApi.skipDue(templatePublicId, duePublicId)
                    : await recurringIncomesApi.skipDue(templatePublicId, duePublicId);
            upsertDue(kind, templatePublicId, due);
            if (kind === 'expense') await getExpense(templatePublicId, true);
            else await getIncome(templatePublicId, true);
            return due;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function attachExpenseFile(publicId: string, filePublicId: string) {
        beginActing();
        clearError();
        try {
            const updated = await recurringExpensesApi.attachFile(publicId, filePublicId);
            upsertExpense(updated);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function detachExpenseFile(publicId: string, filePublicId: string) {
        beginActing();
        clearError();
        try {
            await recurringExpensesApi.detachFile(publicId, filePublicId);
            await getExpense(publicId, true);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.status === 404 ? RECURRING_NOT_FOUND_MESSAGE : err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchKind(kind: RecurringKind) {
        state.invalidateKind(kind);
        if (kind === 'expense' && initializedExpenses.value) {
            const key = activeExpenseKey.value;
            const accountPublicId = key.endsWith(':all') ? undefined : key.slice('expense:'.length);
            await loadExpenses({ accountPublicId, force: true }).catch(() => undefined);
            return;
        }
        if (kind === 'income' && initializedIncomes.value) {
            const key = activeIncomeKey.value;
            const accountPublicId = key.endsWith(':all') ? undefined : key.slice('income:'.length);
            await loadIncomes({ accountPublicId, force: true }).catch(() => undefined);
        }
    }

    function assertCanWriteAccount(accountPublicId: string) {
        const account = accounts().find((item) => item.publicId === accountPublicId);
        if (!account || !canWriteRecurringOnAccount(account)) {
            throw new AppError(RECURRING_FORBIDDEN_MESSAGE, 403, RECURRING_FORBIDDEN_CODE);
        }
    }

    return {
        loadExpenses,
        loadIncomes,
        loadMoreExpenses,
        loadMoreIncomes,
        cancelPendingLoads,
        getExpense,
        getIncome,
        createExpense,
        createIncome,
        updateExpense,
        updateIncome,
        deleteExpense,
        deleteIncome,
        loadDues,
        confirmDue,
        skipDue,
        attachExpenseFile,
        detachExpenseFile,
        refetchKind,
        assertCanWriteAccount
    };
}

export type RecurringPaymentsCrud = ReturnType<typeof createRecurringPaymentsCrud>;
