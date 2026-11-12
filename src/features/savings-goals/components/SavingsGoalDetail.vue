<script setup lang="ts">
/**
 * Fiche d’un objectif d’épargne (page, même structure que la fiche d’un actif). Onglets portés par `?tab=` :
 * Informations (chiffres clés, jauge, caractéristiques) et Transactions (versements rattachés : lier, délier les lignes cochées, ajouter).
 * La modification reste dans `SavingsGoalFormModal`.
 */
defineOptions({ name: 'SavingsGoalDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import SavingsGoalFormModal from '@/features/savings-goals/components/modals/SavingsGoalFormModal.vue';
import SavingsGoalLinkTransactionsModal from '@/features/savings-goals/components/modals/SavingsGoalLinkTransactionsModal.vue';
import { formatCalendarDate, formatPercentReached, formatSavingsGoalAmount, savingsGoalBarWidth } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import { transactionFormFieldsWithSavingsGoal } from '@/features/savings-goals/link-transactions';
import LinkedTransactionsPanel from '@/features/transactions/components/LinkedTransactionsPanel.vue';
import type { TransactionsLockedFilters } from '@/features/transactions/components/TransactionsTimeline.vue';
import type { Transaction } from '@/features/transactions/types';

export type SavingsGoalDetailTab = 'informations' | 'transactions';

const props = defineProps<{
    savingsGoalPublicId: string;
    tab: SavingsGoalDetailTab;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const store = useSavingsGoalsStore();
const accountsStore = useAccountsStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);
const linkOpen = ref(false);
/** Change après une liaison : la liste de l’onglet se recharge. */
const transactionsKey = ref(0);

const goal = computed(() => store.findByPublicId(props.savingsGoalPublicId));
const money = (amount: number) => formatSavingsGoalAmount(amount, goal.value?.currency ?? 'CHF', locale.value);

const exceeded = computed(() => !!goal.value && goal.value.remainingAmount < 0);

const figures = computed(() => {
    const current = goal.value;
    if (!current) return [];
    return [
        { id: 'target', label: t('savingsGoalsPage.form.fields.targetAmount'), value: money(current.targetAmount), tone: '' },
        { id: 'current', label: t('savingsGoalsPage.detail.figs.saved'), value: money(current.currentAmount), tone: 'su-pos' },
        {
            id: 'remaining',
            label: exceeded.value ? t('savingsGoalsPage.detail.figs.exceeded') : t('savingsGoalsPage.detail.figs.remaining'),
            value: money(Math.abs(current.remainingAmount)),
            tone: ''
        }
    ];
});

const accountName = computed(() => {
    const id = goal.value?.accountPublicId;
    if (!id) return t('savingsGoalsPage.list.noAccount');
    return accountsStore.accounts.find((item) => item.publicId === id)?.name ?? t('savingsGoalsPage.list.unknownAccount');
});

const facts = computed(() => {
    const current = goal.value;
    if (!current) return [];
    const field = (key: string) => t(`savingsGoalsPage.form.fields.${key}`);
    const list = [
        { id: 'account', label: field('account'), value: accountName.value },
        {
            id: 'targetDate',
            label: field('targetDate'),
            value: current.targetDate ? formatCalendarDate(current.targetDate, locale.value) : t('savingsGoalsPage.list.noDate')
        },
        { id: 'opening', label: field('openingAmount'), value: money(current.openingAmount) },
        { id: 'contributed', label: t('savingsGoalsPage.detail.figs.contributed'), value: money(current.contributedAmount) }
    ];
    if (current.projectedDate) {
        list.push({
            id: 'projected',
            label: t('savingsGoalsPage.detail.figs.projected'),
            value: formatCalendarDate(current.projectedDate, locale.value)
        });
    }
    return list;
});

const percentText = computed(() => (goal.value ? formatPercentReached(goal.value.percentReached, locale.value) : ''));
const barWidth = computed(() => (goal.value ? savingsGoalBarWidth(goal.value) : 0));
/** Transactions du compte lié, réduites à celles rattachées à l’objectif. Sans compte lié : pas de liste. */
const transactionFilters = computed<TransactionsLockedFilters | null>(() => {
    const current = goal.value;
    if (!current?.accountPublicId) return null;
    return { account: current.accountPublicId, savingsGoal: current.publicId };
});

function unlinkFields(transaction: Transaction) {
    return transactionFormFieldsWithSavingsGoal(transaction, '');
}

async function onLinked() {
    transactionsKey.value += 1;
    await loadGoal();
}

async function loadGoal() {
    const id = props.savingsGoalPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchSavingsGoal(id);
        if (!fresh) emit('not-found');
        if (!accountsStore.initialized) void accountsStore.loadAccounts().catch(() => undefined);
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
        if (id === props.savingsGoalPublicId) emit('not-found');
    });
});

onUnmounted(() => {
    unsubscribeDeleted?.();
});

watch(
    () => props.savingsGoalPublicId,
    () => {
        editOpen.value = false;
        linkOpen.value = false;
        void loadGoal();
    },
    { immediate: true }
);

function openEdit() {
    if (goal.value) editOpen.value = true;
}

defineExpose({ openEdit, reload: loadGoal });
</script>

<template>
    <div class="goal-detail" :class="{ 'su-fill': tab === 'transactions' }">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link goal-detail__retry" @click="loadGoal">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!goal && loading" class="su-loading"><span class="su-spin" /></div>

        <template v-else-if="goal">
            <div v-if="tab === 'informations'" class="goal-detail__info">
                <div class="su-figs goal-detail__figs">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="[fig.tone, { 'is-loading': loading }]">{{ fig.value }}</p>
                    </div>
                </div>

                <!-- jauge carrée : part de la cible déjà épargnée -->
                <div class="goal-detail__gauge">
                    <div class="su-gauge" role="img" :aria-label="percentText">
                        <div class="su-gauge__fill su-gauge__fill--blue" :style="{ width: `${barWidth}%` }" />
                    </div>
                    <p class="goal-detail__percent">{{ percentText }}</p>
                </div>

                <div class="goal-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>
            </div>

            <!-- ── Transactions : versements rattachés à l’objectif ── -->
            <template v-else-if="tab === 'transactions'">
                <LinkedTransactionsPanel
                    v-if="transactionFilters"
                    :key="transactionsKey"
                    :locked-filters="transactionFilters"
                    :create-defaults="{ accountPublicId: goal.accountPublicId, savingsGoalPublicId: goal.publicId }"
                    :unlink-fields="unlinkFields"
                    :can-link="!store.acting"
                    @link="linkOpen = true"
                    @changed="loadGoal"
                />
                <!-- sans compte lié, aucune transaction ne peut être rattachée -->
                <p v-else class="goal-detail__empty">{{ t('savingsGoalsPage.form.linkedTransactions.noAccount') }}</p>
            </template>

            <SavingsGoalFormModal v-model="editOpen" :savings-goal="goal" @saved="loadGoal" />
            <SavingsGoalLinkTransactionsModal v-model="linkOpen" :savings-goal="goal" mode="link" @linked="onLinked" />
        </template>
    </div>
</template>

<style scoped>
.goal-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.goal-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

.goal-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.goal-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.goal-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.goal-detail__gauge {
    display: flex;
    align-items: center;
    gap: 16px;
}

.goal-detail__gauge .su-gauge {
    flex: 1 1 auto;
}

.goal-detail__percent {
    flex: none;
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.goal-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.goal-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.goal-detail__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.goal-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .goal-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .goal-detail__figs,
    .goal-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .goal-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .goal-detail__figs .su-fig__num {
        font-size: 22px;
    }
}
</style>
