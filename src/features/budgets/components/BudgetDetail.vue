<script setup lang="ts">
/**
 * Fiche d’un budget (page, même structure que la fiche d’un actif). Onglets portés par `?tab=` :
 * Informations (chiffres clés, jauge, caractéristiques) et Transactions (dépenses comptées dans l’enveloppe).
 * La modification reste dans `BudgetFormModal`.
 */
defineOptions({ name: 'BudgetDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import BudgetFormModal from '@/features/budgets/components/modals/BudgetFormModal.vue';
import {
    budgetBarWidth,
    budgetScheduleStatus,
    formatBudgetAmount,
    formatCalendarDate,
    formatPercentUsed,
    isBudgetOverspent
} from '@/features/budgets/format';
import { budgetLinkedTransactionsQuery } from '@/features/budgets/paths';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import BudgetLinkTransactionsModal from '@/features/budgets/components/modals/BudgetLinkTransactionsModal.vue';
import { transactionFormFieldsWithCategory } from '@/features/budgets/link-transactions';
import LinkedTransactionsPanel from '@/features/transactions/components/LinkedTransactionsPanel.vue';
import type { Transaction } from '@/features/transactions/types';

export type BudgetDetailTab = 'informations' | 'transactions';

const props = defineProps<{
    budgetPublicId: string;
    tab: BudgetDetailTab;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const store = useBudgetsStore();
const categoriesStore = useCategoriesStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);
const linkOpen = ref(false);
/** Change après une liaison : la liste de l’onglet se recharge. */
const transactionsKey = ref(0);

/** Délier d’un budget par catégorie : la transaction perd sa catégorie, elle reste sur le compte. */
function unlinkFields(transaction: Transaction) {
    return transactionFormFieldsWithCategory(transaction, '');
}

async function onLinked() {
    transactionsKey.value += 1;
    await loadBudget();
}

const budget = computed(() => store.findByPublicId(props.budgetPublicId));
const money = (amount: number) => formatBudgetAmount(amount, budget.value?.currency ?? 'CHF', locale.value);

const overspent = computed(() => !!budget.value && isBudgetOverspent(budget.value));
const schedule = computed(() => (budget.value ? budgetScheduleStatus(budget.value) : null));

/** État en toutes lettres : en pause, pas commencé, terminé, ou rien si le budget court normalement. */
const stateNote = computed(() => {
    const current = budget.value;
    if (!current) return null;
    if (!current.isActive) return t('budgetsPage.badges.paused');
    if (schedule.value === 'upcoming') return t('budgetsPage.badges.upcoming');
    if (schedule.value === 'ended') return t('budgetsPage.badges.ended');
    return null;
});

const figures = computed(() => {
    const current = budget.value;
    if (!current) return [];
    return [
        { id: 'limit', label: t('budgetsPage.overview.budget'), value: money(current.limitAmount), tone: '' },
        { id: 'spent', label: t('budgetsPage.overview.spent'), value: money(current.spentAmount), tone: '' },
        {
            id: 'remaining',
            label: overspent.value ? t('budgetsPage.overview.overBy') : t('budgetsPage.overview.remaining'),
            value: money(Math.abs(current.remainingAmount)),
            tone: overspent.value ? 'su-over' : ''
        }
    ];
});

const categoryLabel = computed(() => {
    const id = budget.value?.categoryPublicId;
    if (!id) return t('budgetsPage.scope.global');
    return categoriesStore.findByPublicId(id)?.name ?? t('budgetsPage.scope.unknownCategory');
});

const facts = computed(() => {
    const current = budget.value;
    if (!current) return [];
    const field = (key: string) => t(`budgetsPage.form.fields.${key}`);
    const list = [
        { id: 'category', label: field('category'), value: categoryLabel.value },
        { id: 'periode', label: field('periode'), value: t(`budgetsPage.periodes.${current.periode}`) },
        {
            id: 'window',
            label: t('budgetsPage.detail.window'),
            value: t('budgetsPage.list.window', {
                start: formatCalendarDate(current.periodStart, locale.value),
                end: formatCalendarDate(current.periodEnd, locale.value)
            })
        },
        { id: 'start', label: field('startDate'), value: formatCalendarDate(current.startDate, locale.value) }
    ];
    if (current.endDate) list.push({ id: 'end', label: field('endDate'), value: formatCalendarDate(current.endDate, locale.value) });
    list.push({ id: 'active', label: field('isActive'), value: current.isActive ? t('common.yes') : t('common.no') });
    return list;
});

const percentText = computed(() =>
    budget.value ? formatPercentUsed(budget.value.isCurrent ? budget.value.percentUsed : 0, locale.value) : ''
);
const barWidth = computed(() => (budget.value ? budgetBarWidth(budget.value) : 0));
const transactionFilters = computed(() => (budget.value ? budgetLinkedTransactionsQuery(budget.value) : null));

async function loadBudget() {
    const id = props.budgetPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchBudget(id);
        if (!fresh) emit('not-found');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        store.clearError();
        if (err.status === 404) {
            emit('not-found');
            return;
        }
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    unsubscribeDeleted = store.subscribeToDeleted((id) => {
        if (id === props.budgetPublicId) emit('not-found');
    });
    if (!categoriesStore.initialized) void categoriesStore.loadList().catch(() => undefined);
});

onUnmounted(() => {
    unsubscribeDeleted?.();
});

watch(
    () => props.budgetPublicId,
    () => {
        editOpen.value = false;
        void loadBudget();
    },
    { immediate: true }
);

function openEdit() {
    if (budget.value) editOpen.value = true;
}

defineExpose({ openEdit, reload: loadBudget });
</script>

<template>
    <div class="budget-detail" :class="{ 'su-fill': tab === 'transactions' }">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link budget-detail__retry" @click="loadBudget">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!budget && loading" class="su-loading"><span class="su-spin" /></div>

        <template v-else-if="budget">
            <div v-if="tab === 'informations'" class="budget-detail__info">
                <p v-if="stateNote" class="budget-detail__state">
                    <span class="su-sq" aria-hidden="true" />
                    {{ stateNote }}
                </p>

                <div class="su-figs budget-detail__figs">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="[fig.tone, { 'is-loading': loading }]">{{ fig.value }}</p>
                    </div>
                </div>

                <!-- jauge carrée : part du budget consommée sur la période en cours -->
                <div class="budget-detail__gauge">
                    <div class="su-gauge" role="img" :aria-label="percentText">
                        <div class="su-gauge__fill" :class="{ 'su-gauge__fill--over': overspent }" :style="{ width: `${barWidth}%` }" />
                    </div>
                    <p class="budget-detail__percent">{{ percentText }}</p>
                </div>

                <div class="budget-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>
            </div>

            <LinkedTransactionsPanel
                v-else-if="tab === 'transactions' && transactionFilters"
                :key="transactionsKey"
                :locked-filters="transactionFilters"
                :unlink-fields="budget.categoryPublicId ? unlinkFields : null"
                :can-link="!!budget.categoryPublicId"
                :can-unlink="!!budget.categoryPublicId"
                @link="linkOpen = true"
                @changed="loadBudget"
            />

            <BudgetFormModal v-model="editOpen" :budget="budget" @saved="loadBudget" />
            <BudgetLinkTransactionsModal v-model="linkOpen" :budget="budget" mode="link" @linked="onLinked" />
        </template>
    </div>
</template>

<style scoped>
.budget-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.budget-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

.budget-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.budget-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.budget-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.budget-detail__gauge {
    display: flex;
    align-items: center;
    gap: 16px;
}

.budget-detail__gauge .su-gauge {
    flex: 1 1 auto;
}

.budget-detail__percent {
    flex: none;
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.budget-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.budget-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.budget-detail__state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--violet-ink);
    font-size: 13px;
    font-weight: 700;
    --sq-color: var(--violet);
}

.budget-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .budget-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .budget-detail__figs,
    .budget-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .budget-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .budget-detail__figs .su-fig__num {
        font-size: 22px;
    }
}
</style>
