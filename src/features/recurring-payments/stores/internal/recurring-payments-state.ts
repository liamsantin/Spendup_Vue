import { computed, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { sortDues, sortTemplates } from '@/features/recurring-payments/format';
import {
    RECURRING_PAGE_SIZE_DEFAULT,
    type RecurringDue,
    type RecurringExpense,
    type RecurringIncome,
    type RecurringKind
} from '@/features/recurring-payments/types';

export const RECURRING_LIST_MAX_AGE_MS = 30_000;

export type RecurringListKind = RecurringKind;

export function listCacheKey(kind: RecurringListKind, accountPublicId?: string | null): string {
    const id = accountPublicId?.trim();
    return id ? `${kind}:${id}` : `${kind}:all`;
}

export type RecurringCacheEntry<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export function createRecurringPaymentsState() {
    const expenses = ref<RecurringExpense[]>([]);
    const incomes = ref<RecurringIncome[]>([]);
    const expensesByKey = new Map<string, RecurringCacheEntry<RecurringExpense>>();
    const incomesByKey = new Map<string, RecurringCacheEntry<RecurringIncome>>();
    const activeExpenseKey = ref(listCacheKey('expense'));
    const activeIncomeKey = ref(listCacheKey('income'));

    const expensePage = ref(1);
    const expensePageSize = ref(RECURRING_PAGE_SIZE_DEFAULT);
    const expenseTotalCount = ref(0);
    const incomePage = ref(1);
    const incomePageSize = ref(RECURRING_PAGE_SIZE_DEFAULT);
    const incomeTotalCount = ref(0);

    const details = new Map<string, RecurringExpense | RecurringIncome>();
    const duesByTemplate = new Map<string, RecurringCacheEntry<RecurringDue>>();
    const detailsEpoch = ref(0);
    const duesEpoch = ref(0);

    const loadingExpenses = ref(false);
    const loadingIncomes = ref(false);
    const loadingMoreExpenses = ref(false);
    const loadingMoreIncomes = ref(false);
    const loadingDetail = ref(false);
    const loadingDues = ref(false);
    const acting = ref(false);
    let actingDepth = 0;
    const initializedExpenses = ref(false);
    const initializedIncomes = ref(false);
    const error = ref<string | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: RECURRING_LIST_MAX_AGE_MS });

    const hasExpenses = computed(() => expenses.value.length > 0);
    const hasIncomes = computed(() => incomes.value.length > 0);
    const hasMoreExpenses = computed(() => expenses.value.length > 0 && expenses.value.length < expenseTotalCount.value);
    const hasMoreIncomes = computed(() => incomes.value.length > 0 && incomes.value.length < incomeTotalCount.value);

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    function setExpenseList(key: string, nextItems: RecurringExpense[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const prev = expensesByKey.get(key);
        const entry: RecurringCacheEntry<RecurringExpense> = {
            items: sortTemplates(nextItems),
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? nextItems.length
        };
        expensesByKey.set(key, entry);
        if (activeExpenseKey.value === key) {
            expenses.value = entry.items;
            expensePage.value = entry.page;
            expensePageSize.value = entry.pageSize;
            expenseTotalCount.value = entry.totalCount;
        }
    }

    function setIncomeList(key: string, nextItems: RecurringIncome[], meta?: { page?: number; pageSize?: number; totalCount?: number }) {
        const prev = incomesByKey.get(key);
        const entry: RecurringCacheEntry<RecurringIncome> = {
            items: sortTemplates(nextItems),
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? nextItems.length
        };
        incomesByKey.set(key, entry);
        if (activeIncomeKey.value === key) {
            incomes.value = entry.items;
            incomePage.value = entry.page;
            incomePageSize.value = entry.pageSize;
            incomeTotalCount.value = entry.totalCount;
        }
    }

    function activateExpenseList(key: string) {
        activeExpenseKey.value = key;
        const entry = expensesByKey.get(key);
        if (entry) {
            expenses.value = entry.items;
            expensePage.value = entry.page;
            expensePageSize.value = entry.pageSize;
            expenseTotalCount.value = entry.totalCount;
            return;
        }
        expenses.value = [];
        expensePage.value = 1;
        expensePageSize.value = RECURRING_PAGE_SIZE_DEFAULT;
        expenseTotalCount.value = 0;
    }

    function activateIncomeList(key: string) {
        activeIncomeKey.value = key;
        const entry = incomesByKey.get(key);
        if (entry) {
            incomes.value = entry.items;
            incomePage.value = entry.page;
            incomePageSize.value = entry.pageSize;
            incomeTotalCount.value = entry.totalCount;
            return;
        }
        incomes.value = [];
        incomePage.value = 1;
        incomePageSize.value = RECURRING_PAGE_SIZE_DEFAULT;
        incomeTotalCount.value = 0;
    }

    function upsertExpense(item: RecurringExpense) {
        details.set(`expense:${item.publicId}`, item);
        detailsEpoch.value += 1;
        const keys = new Set<string>([listCacheKey('expense'), listCacheKey('expense', item.accountPublicId), ...expensesByKey.keys()]);
        for (const key of keys) {
            const entry = expensesByKey.get(key);
            const without = (entry?.items ?? []).filter((row) => row.publicId !== item.publicId);
            const existed = without.length !== (entry?.items.length ?? 0);
            const matchesAccount = key === listCacheKey('expense') || key === listCacheKey('expense', item.accountPublicId);
            if (!existed && !matchesAccount) continue;
            const nextItems = matchesAccount || existed ? [...without, item] : without;
            const nextTotal = existed
                ? (entry?.totalCount ?? nextItems.length)
                : matchesAccount
                  ? (entry?.totalCount ?? 0) + 1
                  : (entry?.totalCount ?? 0);
            setExpenseList(key, nextItems, { totalCount: nextTotal });
        }
    }

    function upsertIncome(item: RecurringIncome) {
        details.set(`income:${item.publicId}`, item);
        detailsEpoch.value += 1;
        const keys = new Set<string>([listCacheKey('income'), listCacheKey('income', item.accountPublicId), ...incomesByKey.keys()]);
        for (const key of keys) {
            const entry = incomesByKey.get(key);
            const without = (entry?.items ?? []).filter((row) => row.publicId !== item.publicId);
            const existed = without.length !== (entry?.items.length ?? 0);
            const matchesAccount = key === listCacheKey('income') || key === listCacheKey('income', item.accountPublicId);
            if (!existed && !matchesAccount) continue;
            const nextItems = matchesAccount || existed ? [...without, item] : without;
            const nextTotal = existed
                ? (entry?.totalCount ?? nextItems.length)
                : matchesAccount
                  ? (entry?.totalCount ?? 0) + 1
                  : (entry?.totalCount ?? 0);
            setIncomeList(key, nextItems, { totalCount: nextTotal });
        }
    }

    function removeExpenseLocal(publicId: string) {
        details.delete(`expense:${publicId}`);
        duesByTemplate.delete(`expense:${publicId}`);
        detailsEpoch.value += 1;
        duesEpoch.value += 1;
        for (const [key, entry] of expensesByKey.entries()) {
            const nextItems = entry.items.filter((row) => row.publicId !== publicId);
            if (nextItems.length === entry.items.length) continue;
            setExpenseList(key, nextItems, { totalCount: Math.max(0, entry.totalCount - 1) });
        }
    }

    function removeIncomeLocal(publicId: string) {
        details.delete(`income:${publicId}`);
        duesByTemplate.delete(`income:${publicId}`);
        detailsEpoch.value += 1;
        duesEpoch.value += 1;
        for (const [key, entry] of incomesByKey.entries()) {
            const nextItems = entry.items.filter((row) => row.publicId !== publicId);
            if (nextItems.length === entry.items.length) continue;
            setIncomeList(key, nextItems, { totalCount: Math.max(0, entry.totalCount - 1) });
        }
    }

    function setDues(
        kind: RecurringKind,
        publicId: string,
        items: RecurringDue[],
        meta?: { page?: number; pageSize?: number; totalCount?: number }
    ) {
        const key = `${kind}:${publicId}`;
        const prev = duesByTemplate.get(key);
        duesByTemplate.set(key, {
            items: sortDues(items),
            page: meta?.page ?? prev?.page ?? 1,
            pageSize: meta?.pageSize ?? prev?.pageSize ?? RECURRING_PAGE_SIZE_DEFAULT,
            totalCount: meta?.totalCount ?? prev?.totalCount ?? items.length
        });
        duesEpoch.value += 1;
    }

    function upsertDue(kind: RecurringKind, templatePublicId: string, due: RecurringDue) {
        const key = `${kind}:${templatePublicId}`;
        const prev = duesByTemplate.get(key);
        if (!prev) {
            setDues(kind, templatePublicId, [due], { totalCount: 1 });
            return;
        }
        const without = prev.items.filter((item) => item.publicId !== due.publicId);
        const existed = without.length !== prev.items.length;
        setDues(kind, templatePublicId, [...without, due], {
            totalCount: existed ? prev.totalCount : prev.totalCount + 1
        });
    }

    function getDetail(kind: RecurringKind, publicId: string): RecurringExpense | RecurringIncome | null {
        void detailsEpoch.value;
        return details.get(`${kind}:${publicId}`) ?? null;
    }

    function getDues(kind: RecurringKind, publicId: string): RecurringDue[] {
        void duesEpoch.value;
        return duesByTemplate.get(`${kind}:${publicId}`)?.items ?? [];
    }

    function invalidateKind(kind: RecurringKind) {
        if (kind === 'expense') {
            for (const key of expensesByKey.keys()) cache.invalidate(key);
        } else {
            for (const key of incomesByKey.keys()) cache.invalidate(key);
        }
    }

    return {
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
        details,
        duesByTemplate,
        detailsEpoch,
        duesEpoch,
        loadingExpenses,
        loadingIncomes,
        loadingMoreExpenses,
        loadingMoreIncomes,
        loadingDetail,
        loadingDues,
        acting,
        initializedExpenses,
        initializedIncomes,
        error,
        cache,
        hasExpenses,
        hasIncomes,
        hasMoreExpenses,
        hasMoreIncomes,
        beginActing,
        endActing,
        resetActing,
        clearError,
        setExpenseList,
        setIncomeList,
        activateExpenseList,
        activateIncomeList,
        upsertExpense,
        upsertIncome,
        removeExpenseLocal,
        removeIncomeLocal,
        setDues,
        upsertDue,
        getDetail,
        getDues,
        invalidateKind
    };
}

export type RecurringPaymentsState = ReturnType<typeof createRecurringPaymentsState>;
