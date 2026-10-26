<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import RecurringMonthCalendar from '@/features/recurring-payments/components/RecurringMonthCalendar.vue';
import RecurringTemplateDetailModal from '@/features/recurring-payments/components/modals/RecurringTemplateDetailModal.vue';
import RecurringTemplateFormModal from '@/features/recurring-payments/components/modals/RecurringTemplateFormModal.vue';
import { RECURRENCES_PATHS, recurrencesPathForTab } from '@/features/recurring-payments/paths';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import RecurringTemplateTable from '@/features/recurring-payments/components/list/RecurringTemplateTable.vue';
import {
    TEMPLATE_SORT_DEFAULT,
    formatPlannedAmount,
    formatShortDayMonth,
    formatSignedPlannedAmount,
    isExpenseTemplate,
    matchesRecurringSearch,
    recurringMonthlyFactor,
    recurringNature,
    sortTemplatesBy,
    type RecurringNature,
    type TemplateSort
} from '@/features/recurring-payments/format';
import { downloadCsv } from '@/utils/helpers/csv';
import {
    pageSizeForClientAmountFilter,
    parseAmountFilter,
    amountInFilterRange,
    isAmountRangeFilterActive
} from '@/components/shared/dropdown-filter/amount-range';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type {
    RecurringExpense,
    RecurringExpenseType,
    RecurringIncome,
    RecurringIncomeType,
    RecurringKind
} from '@/features/recurring-payments/types';
import { RECURRING_PAGE_SIZE_DEFAULT, RECURRING_PAGE_SIZE_MAX } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        kind?: RecurringKind | null;
        showInactive?: boolean;
        typeChoiceFirst?: RecurringKind | null;
        accountPublicId?: string | null;
        minAmount?: string | null;
        maxAmount?: string | null;
        search?: string | null;
        sort?: TemplateSort;
    }>(),
    {
        kind: null,
        showInactive: true,
        typeChoiceFirst: null,
        accountPublicId: null,
        minAmount: null,
        maxAmount: null,
        search: null,
        sort: TEMPLATE_SORT_DEFAULT
    }
);

const emit = defineEmits<{
    sort: [value: TemplateSort];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const tagsStore = useTagsStore();
const store = useRecurringPaymentsStore();

const createOpen = ref(false);
const createKind = ref<RecurringKind | null>(null);
const createType = ref<RecurringExpenseType | RecurringIncomeType | null>(null);
const editTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const deleteTarget = ref<RecurringExpense | RecurringIncome | null>(null);
const detailId = ref<string | null>(null);
const detailKind = ref<RecurringKind | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});
const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});
const detailOpen = computed({
    get: () => !!detailId.value,
    set: (value: boolean) => {
        if (!value) detailId.value = null;
    }
});

function accountFromQuery(): string | null {
    const raw = route.query.account;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterAccountId = computed(() => props.accountPublicId?.trim() || accountFromQuery());
const canCreate = computed(() => accountsStore.accounts.some((item) => canWriteRecurringOnAccount(item)));
const listingKind = computed(() => props.kind ?? null);

function templateKind(item: RecurringExpense | RecurringIncome): RecurringKind {
    return isExpenseTemplate(item) ? 'expense' : 'income';
}

function visibleOf(list: readonly (RecurringExpense | RecurringIncome)[]) {
    const filtered = props.showInactive ? list : list.filter((item) => item.isActive);
    const accountId = filterAccountId.value;
    const minAmount = parseAmountFilter(props.minAmount);
    const maxAmount = parseAmountFilter(props.maxAmount);
    return filtered.filter((item) => {
        if (accountId && item.accountPublicId !== accountId) return false;
        return amountInFilterRange(item.plannedAmount, minAmount, maxAmount);
    });
}

function accountName(accountPublicId: string): string {
    return accountsStore.accounts.find((item) => item.publicId === accountPublicId)?.name ?? t('recurrencesPage.unknownAccount');
}

const items = computed(() => {
    const scoped =
        listingKind.value === 'expense'
            ? visibleOf(store.expenses)
            : listingKind.value === 'income'
              ? visibleOf(store.incomes)
              : [...visibleOf(store.expenses), ...visibleOf(store.incomes)];
    const needle = props.search?.trim();
    const found = needle ? scoped.filter((item) => matchesRecurringSearch(needle, item.name, accountName(item.accountPublicId))) : scoped;
    return sortTemplatesBy(found, props.sort);
});
/**
 * Chiffres clés : équivalent mensuel des récurrences actives affichées, par nature
 * (calculé côté client à partir des listes chargées, devise de la première ligne).
 */
const figs = computed(() => {
    const natures: RecurringNature[] =
        listingKind.value === 'income'
            ? ['incomes']
            : listingKind.value === 'expense'
              ? ['fixed', 'subscriptions']
              : ['fixed', 'subscriptions', 'incomes'];
    const labels: Record<RecurringNature, string> = {
        fixed: t('recurrencesPage.figs.fixedPerMonth'),
        subscriptions: t('recurrencesPage.figs.subscriptionsPerMonth'),
        incomes: t('recurrencesPage.figs.incomesPerMonth')
    };
    return natures.map((nature) => {
        const rows = items.value.filter((item) => item.isActive && recurringNature(item) === nature);
        const total = rows.reduce((sum, item) => sum + item.plannedAmount * recurringMonthlyFactor(item.frequency), 0);
        const currency = rows[0]?.currency ?? 'CHF';
        return {
            key: nature,
            label: labels[nature],
            value: formatPlannedAmount(total, currency, locale.value),
            tone: nature === 'incomes' ? 'su-pos' : ''
        };
    });
});

/** Panneau latéral : les 5 prochaines échéances des récurrences actives affichées. */
const NEXT_DUES_MAX = 5;
const nextDues = computed(() =>
    items.value
        .filter((item) => item.isActive && !!item.nextDueDate)
        .slice()
        .sort((a, b) => (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? ''))
        .slice(0, NEXT_DUES_MAX)
        .map((item) => {
            const kind = templateKind(item);
            return {
                key: `${kind}-${item.publicId}`,
                item,
                kind,
                date: formatShortDayMonth(item.nextDueDate, locale.value),
                amount: formatSignedPlannedAmount(item.plannedAmount, kind, item.currency, locale.value)
            };
        })
);

/** Le calendrier du mois n'apparaît que sur la vue d'ensemble (charges et revenus vont droit à la liste). */
const showCalendar = computed(() => listingKind.value == null);

const hasFilters = computed(
    () => !!(props.search?.trim() || filterAccountId.value || props.minAmount || props.maxAmount || !props.showInactive)
);

const loading = computed(() => {
    if (listingKind.value === 'expense') return store.loadingExpenses;
    if (listingKind.value === 'income') return store.loadingIncomes;
    return store.loadingExpenses || store.loadingIncomes;
});
const hasMore = computed(() => {
    if (listingKind.value === 'expense') return store.hasMoreExpenses;
    if (listingKind.value === 'income') return store.hasMoreIncomes;
    return store.hasMoreExpenses || store.hasMoreIncomes;
});
const loadingMore = computed(() => {
    if (listingKind.value === 'expense') return store.loadingMoreExpenses;
    if (listingKind.value === 'income') return store.loadingMoreIncomes;
    return store.loadingMoreExpenses || store.loadingMoreIncomes;
});
const emptyCopy = computed(() => {
    if (hasFilters.value) return t('recurrencesPage.empty.filtered');
    if (listingKind.value === 'expense') return t('recurrencesPage.empty.expenses');
    if (listingKind.value === 'income') return t('recurrencesPage.empty.incomes');
    return t('recurrencesPage.empty.all');
});
const editKind = computed(() => (editTarget.value ? templateKind(editTarget.value) : listingKind.value));
const deleteKind = computed(() => (deleteTarget.value ? templateKind(deleteTarget.value) : listingKind.value));

async function loadList(force = false) {
    localError.value = null;
    try {
        await accountsStore.loadAccounts(force);
        if (listingKind.value !== 'income') {
            void tagsStore.loadList({ force }).catch(() => undefined);
        }
        const query = {
            accountPublicId: filterAccountId.value ?? undefined,
            force,
            pageSize: pageSizeForClientAmountFilter(props.minAmount, props.maxAmount, RECURRING_PAGE_SIZE_DEFAULT, RECURRING_PAGE_SIZE_MAX)
        };
        if (listingKind.value === 'expense') {
            await store.loadExpenses(query);
        } else if (listingKind.value === 'income') {
            await store.loadIncomes(query);
        } else {
            await Promise.all([store.loadExpenses(query), store.loadIncomes(query)]);
        }
        await drainPagesForAmountFilter();
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('recurrencesPage.errors.notFound');
            if (filterAccountId.value) await router.replace({ path: recurrencesPathForTab('all') });
            return;
        }
        localError.value = getErrorMessage(e);
    }
}

async function drainPagesForAmountFilter() {
    if (!isAmountRangeFilterActive(props.minAmount, props.maxAmount)) return;
    let guard = 0;
    while (guard++ < 30) {
        const moreExpenses = (listingKind.value === 'expense' || listingKind.value == null) && store.hasMoreExpenses;
        const moreIncomes = (listingKind.value === 'income' || listingKind.value == null) && store.hasMoreIncomes;
        if (!moreExpenses && !moreIncomes) return;
        if (moreExpenses) await store.loadMoreExpenses();
        if (moreIncomes) await store.loadMoreIncomes();
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadList(true).catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadList().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [route.query.account, props.accountPublicId, listingKind.value, props.minAmount, props.maxAmount] as const,
    () => {
        void loadList().catch(() => undefined);
    }
);

function openCreate(kind: RecurringKind | null = listingKind.value, type: RecurringExpenseType | RecurringIncomeType | null = null) {
    if (!canCreate.value) return;
    createKind.value = kind;
    createType.value = type;
    createOpen.value = true;
}

watch(createOpen, (value) => {
    if (!value) {
        createKind.value = null;
        createType.value = null;
    }
});

function frequencyLabel(item: RecurringExpense | RecurringIncome): string {
    return isExpenseTemplate(item)
        ? t(`recurrencesPage.expenseFrequencies.${item.frequency}`)
        : t(`recurrencesPage.incomeFrequencies.${item.frequency}`);
}

function exportCsv() {
    const header = (['name', 'kind', 'type', 'frequency', 'account', 'nextDue', 'amount', 'status'] as const).map((key) =>
        t(`recurrencesPage.columns.${key}`)
    );
    const rows = items.value.map((item) => [
        item.name,
        t(`recurrencesPage.kinds.${templateKind(item)}`),
        isExpenseTemplate(item)
            ? t(`recurrencesPage.expenseTypes.${item.expenseType}`)
            : t(`recurrencesPage.incomeTypes.${item.incomeType}`),
        frequencyLabel(item),
        accountName(item.accountPublicId),
        item.nextDueDate ?? '',
        item.plannedAmount,
        item.isActive ? t('recurrencesPage.badges.active') : t('recurrencesPage.badges.paused')
    ]);
    downloadCsv('recurrences', header, rows);
}

const visibleCount = computed(() => items.value.length);

defineExpose({ openCreate, exportCsv, visibleCount });

function canWrite(accountPublicId: string) {
    const account = accountsStore.accounts.find((item) => item.publicId === accountPublicId);
    return account ? canWriteRecurringOnAccount(account) : false;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        if (templateKind(deleteTarget.value) === 'expense') await store.deleteExpense(deleteTarget.value.publicId);
        else await store.deleteIncome(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onSaved(template: RecurringExpense | RecurringIncome) {
    detailKind.value = templateKind(template);
    detailId.value = template.publicId;
}

function openDetail(item: RecurringExpense | RecurringIncome) {
    detailKind.value = templateKind(item);
    detailId.value = item.publicId;
}

function loadMore() {
    if (listingKind.value === 'expense') {
        void store.loadMoreExpenses();
        return;
    }
    if (listingKind.value === 'income') {
        void store.loadMoreIncomes();
        return;
    }
    if (store.hasMoreExpenses) void store.loadMoreExpenses();
    if (store.hasMoreIncomes) void store.loadMoreIncomes();
}
</script>

<template>
    <div class="recurring-panel">
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div class="recurring-panel__scroll">
            <div v-if="loading && !items.length" class="su-loading"><span class="su-spin" /></div>
            <div v-else-if="!items.length" class="su-empty">
                <p>{{ emptyCopy }}</p>
            </div>
            <div v-else class="recurring-directory">
                <!-- liste en premier : c'est l'information qu'on vient chercher -->
                <div class="recurring-directory__main">
                    <RecurringTemplateTable
                        :items="items"
                        :sort="sort"
                        :show-kind="!listingKind"
                        :acting="store.acting"
                        :can-write="canWrite"
                        @open="openDetail"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                        @sort="emit('sort', $event)"
                    />
                    <RecurringMonthCalendar v-if="showCalendar" class="recurring-directory__calendar" :items="items" />
                </div>

                <!-- panneau latéral fixe : chiffres clés mensuels + prochaines échéances -->
                <aside class="recurring-directory__aside">
                    <section class="recurring-aside__block">
                        <h2 class="recurring-aside__title">{{ t('recurrencesPage.aside.figsTitle') }}</h2>
                        <dl class="recurring-aside__figs">
                            <div v-for="fig in figs" :key="fig.key" class="recurring-aside__fig">
                                <dt>{{ fig.label }}</dt>
                                <dd :class="fig.tone">{{ fig.value }}</dd>
                            </div>
                        </dl>
                        <p class="recurring-aside__note">{{ t('recurrencesPage.figs.note') }}</p>
                    </section>

                    <section class="recurring-aside__block recurring-aside__block--dues">
                        <h2 class="recurring-aside__title">{{ t('recurrencesPage.aside.nextTitle') }}</h2>
                        <p v-if="!nextDues.length" class="recurring-aside__note">{{ t('recurrencesPage.aside.none') }}</p>
                        <ul v-else class="recurring-aside__dues">
                            <li v-for="due in nextDues" :key="due.key">
                                <button type="button" class="recurring-aside__due" @click="openDetail(due.item)">
                                    <span class="recurring-aside__date">{{ due.date }}</span>
                                    <span class="recurring-aside__name">{{ due.item.name }}</span>
                                    <span class="recurring-aside__amount" :class="due.kind === 'income' ? 'su-pos' : 'su-neg'">{{
                                        due.amount
                                    }}</span>
                                </button>
                            </li>
                        </ul>
                        <RouterLink :to="RECURRENCES_PATHS.echeances" class="su-link recurring-aside__all">{{
                            t('recurrencesPage.aside.allDues')
                        }}</RouterLink>
                    </section>
                </aside>
            </div>

            <div v-if="hasMore" class="su-more">
                <button type="button" class="su-btn su-btn--ghost" :disabled="loadingMore" @click="loadMore">
                    {{ t('recurrencesPage.loadMore') }}
                </button>
            </div>
        </div>

        <RecurringTemplateFormModal
            v-model="createOpen"
            :kind="createKind"
            :type-choice-first="typeChoiceFirst"
            :default-type="createType"
            :default-account-public-id="filterAccountId"
            @saved="onSaved"
        />
        <RecurringTemplateFormModal v-model="editOpen" :kind="editKind" :template="editTarget" />
        <RecurringTemplateDetailModal
            v-model="detailOpen"
            :kind="detailKind ?? 'expense'"
            :public-id="detailId"
            @edit="
                editTarget = (
                    detailKind === 'income' ? store.getDetail('income', detailId || '') : store.getDetail('expense', detailId || '')
                ) as RecurringExpense | RecurringIncome | null
            "
        />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="deleteKind === 'income' ? t('recurrencesPage.deleteModal.incomeTitle') : t('recurrencesPage.deleteModal.expenseTitle')"
            :message="t('recurrencesPage.deleteModal.body')"
            :confirm-label="t('recurrencesPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.recurring-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.recurring-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
}

/* PC : liste à gauche, panneau fixe à droite ; l'essentiel est visible sans défiler */
.recurring-directory {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 40px;
    align-items: start;
    padding: 8px 16px 24px 0;
}

.recurring-directory__main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
}

.recurring-directory__aside {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.recurring-aside__block {
    padding: 18px 20px;
    border: 1px solid var(--line);
    background: var(--bg);
}

.recurring-aside__block--dues {
    background: var(--soft);
    border-color: transparent;
}

.recurring-aside__title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.recurring-aside__figs {
    margin: 0;
    display: flex;
    flex-direction: column;
}

.recurring-aside__fig {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--line);
}

.recurring-aside__fig:first-child {
    border-top: 0;
    padding-top: 0;
}

.recurring-aside__fig dt {
    color: var(--gray);
    font-size: 13px;
}

.recurring-aside__fig dd {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.03em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.recurring-aside__note {
    margin: 10px 0 0;
    color: var(--gray);
    font-size: 12px;
}

.recurring-aside__dues {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
}

.recurring-aside__due {
    appearance: none;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 8px 0;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 13.5px;
    text-align: left;
    cursor: pointer;
}

.recurring-aside__dues li:first-child .recurring-aside__due {
    border-top: 0;
}

.recurring-aside__due:hover .recurring-aside__name {
    text-decoration: underline;
}

.recurring-aside__due:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.recurring-aside__date {
    color: var(--gray);
    font-variant-numeric: tabular-nums;
}

.recurring-aside__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.recurring-aside__amount {
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.recurring-aside__all {
    font-size: 13px;
}

/* tablette : le panneau passe au-dessus de la liste, en deux cartes côte à côte */
@media (max-width: 1199.98px) {
    .recurring-directory {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
        padding-right: 0;
    }

    .recurring-directory__aside {
        position: static;
        order: -1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

/* le calendrier est trop large pour un écran étroit : la liste suffit */
@media (max-width: 959.98px) {
    .recurring-directory__calendar {
        display: none;
    }
}

/* mobile : seuls les chiffres clés restent en tête, compacts ; les échéances ont leur propre vue */
@media (max-width: 767px) {
    .recurring-directory {
        padding: 0 6px 16px 0;
        gap: 20px;
    }

    .recurring-directory__aside {
        grid-template-columns: minmax(0, 1fr);
    }

    .recurring-aside__block {
        padding: 12px 14px;
    }

    .recurring-aside__block--dues,
    .recurring-aside__note,
    .recurring-aside__title {
        display: none;
    }

    .recurring-aside__fig {
        padding: 6px 0;
    }

    .recurring-aside__fig dd {
        font-size: 16px;
    }
}
</style>
