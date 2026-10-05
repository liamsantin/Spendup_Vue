<template>
    <div class="dash">
        <section class="su-surface dash-hero">
            <div class="dash-hero__copy">
                <p class="dash-hero__date">{{ todayLabel }}</p>
                <h2>{{ greeting }}</h2>
                <p class="dash-hero__lede">{{ heroLede }}</p>
            </div>

            <div v-if="showBalance" class="dash-hero__balance">
                <p class="dash-hero__label">
                    <WalletIcon :size="16" stroke-width="1.6" />
                    {{ t('dashboard.hero.balance') }}
                </p>
                <p class="dash-hero__amount">{{ primaryTotal?.text ?? t('common.emptyValue') }}</p>
                <div v-if="otherTotals.length" class="dash-hero__pills">
                    <span v-for="row in otherTotals" :key="row.currency" class="dash-hero__pill">{{ row.text }}</span>
                </div>
                <p class="dash-hero__meta">
                    {{ t('dashboard.hero.accountsMeta', { count: accountCount }, accountCount) }}
                </p>
            </div>
        </section>

        <nav v-if="alerts.length" class="dash-alerts" :aria-label="t('dashboard.alerts.label')">
            <RouterLink v-for="alert in alerts" :key="alert.id" :to="alert.to" class="dash-alert" :class="`is-${alert.tone}`">
                <component :is="alert.icon" :size="16" stroke-width="1.8" />
                <span>{{ alert.text }}</span>
                <ChevronRightIcon :size="14" stroke-width="2" class="dash-alert__chevron" />
            </RouterLink>
        </nav>

        <section class="dash-month" :aria-label="t('dashboard.month.title', { month: monthLabel })">
            <div v-for="(kpi, i) in monthKpis" :key="kpi.id" class="dash-stat" :class="`is-${kpi.tone}`" :style="{ '--i': i }">
                <span class="dash-stat__icon">
                    <component :is="kpi.icon" :size="18" stroke-width="1.7" />
                </span>
                <span class="dash-stat__label">{{ kpi.label }}</span>
                <strong class="dash-stat__value" :class="{ 'is-loading': month.loading.value }">{{ kpi.value }}</strong>
                <span v-if="kpi.hint" class="dash-stat__hint" :class="kpi.hintTone ? `is-${kpi.hintTone}` : ''">{{ kpi.hint }}</span>
            </div>
        </section>

        <div class="dash-main">
            <div class="dash-col">
                <DashboardBudgetsCard v-if="defaultDashboardView === 'budget'" :hide-amounts="hideAmounts" />

                <AppGlassCard :title="t('dashboard.spending.title')" :subtitle="t('dashboard.spending.subtitle', { month: monthLabel })">
                    <template #icon>
                        <ChartDonutIcon :size="20" stroke-width="1.5" />
                    </template>
                    <div v-if="month.loading.value" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!spending.length" class="dash-empty">{{ t('dashboard.spending.empty') }}</p>
                    <ul v-else class="dash-bars">
                        <li v-for="row in spending" :key="row.key" class="dash-bar">
                            <span class="dash-bar__head">
                                <span class="dash-bar__dot" :style="{ background: row.color }" />
                                <span class="dash-bar__name">{{ row.name }}</span>
                                <span class="dash-bar__share">{{ formatPercent(row.share) }}</span>
                                <strong class="dash-bar__amount">{{ money(row.amount) }}</strong>
                            </span>
                            <span class="dash-bar__track">
                                <span
                                    class="dash-bar__fill"
                                    :style="{ width: `${Math.max(row.share * 100, 2)}%`, background: row.color }"
                                />
                            </span>
                        </li>
                    </ul>
                </AppGlassCard>

                <AppGlassCard :title="t('dashboard.recent.title')" :subtitle="t('dashboard.recent.subtitle')">
                    <template #icon>
                        <ArrowsExchangeIcon :size="20" stroke-width="1.5" />
                    </template>
                    <template #actions>
                        <RouterLink to="/app/finances/transactions" class="su-btn su-btn--ghost">
                            {{ t('dashboard.actions.seeAll') }}
                        </RouterLink>
                    </template>

                    <div v-if="!recentTransactions.length" class="su-empty">
                        <p>{{ t('dashboard.recent.empty') }}</p>
                        <RouterLink to="/app/finances/transactions" class="su-btn su-btn--ink">
                            {{ t('dashboard.actions.addTransaction') }}
                        </RouterLink>
                    </div>
                    <div v-else class="dash-tx-list">
                        <RouterLink v-for="tx in recentTransactions" :key="tx.publicId" class="dash-tx" to="/app/finances/transactions">
                            <span class="dash-tx__icon" :class="txTone(tx.type)">
                                <component :is="txIcon(tx.type)" :size="18" stroke-width="2" />
                            </span>
                            <span class="dash-tx__meta">
                                <span class="dash-tx__label">{{ tx.label }}</span>
                                <span class="dash-tx__sub">
                                    {{ txCategory(tx) }} · {{ formatOperationDate(tx.operationDate, locale) }}
                                </span>
                            </span>
                            <span class="dash-tx__amount" :class="txTone(tx.type)">{{ txAmount(tx) }}</span>
                        </RouterLink>
                    </div>
                </AppGlassCard>
            </div>

            <div class="dash-col">
                <AppGlassCard :title="t('dashboard.accounts.title')" :subtitle="t('dashboard.accounts.subtitle')">
                    <template #icon>
                        <BuildingBankIcon :size="20" stroke-width="1.5" />
                    </template>
                    <template #actions>
                        <RouterLink to="/app/finances/comptes" class="su-btn su-btn--ghost">
                            {{ t('dashboard.actions.seeAll') }}
                        </RouterLink>
                    </template>
                    <p v-if="!topAccounts.length" class="dash-empty">{{ t('dashboard.accounts.empty') }}</p>
                    <ul v-else class="dash-rows">
                        <li v-for="account in topAccounts" :key="account.publicId" class="dash-row">
                            <span class="dash-row__swatch" :style="{ background: safeAccountColor(account.color) ?? undefined }" />
                            <span class="dash-row__meta">
                                <span class="dash-row__title">{{ account.name }}</span>
                                <span class="dash-row__sub">{{ accountSubtitle(account) }}</span>
                            </span>
                            <span class="dash-row__amount">{{ accountBalance(account) }}</span>
                        </li>
                    </ul>
                    <p v-if="activeAccountCount > topAccounts.length" class="dash-more">
                        {{ t('dashboard.accounts.more', { count: activeAccountCount - topAccounts.length }) }}
                    </p>
                </AppGlassCard>

                <AppGlassCard
                    :title="t('dashboard.upcoming.title')"
                    :subtitle="t('dashboard.upcoming.subtitle', { days: DASHBOARD_UPCOMING_DAYS })"
                >
                    <template #icon>
                        <CalendarDueIcon :size="20" stroke-width="1.5" />
                    </template>
                    <template #actions>
                        <RouterLink :to="RECURRENCES_PATHS.echeances" class="su-btn su-btn--ghost">
                            {{ t('dashboard.actions.seeAll') }}
                        </RouterLink>
                    </template>
                    <div v-if="month.loading.value" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!upcomingList.length" class="dash-empty">{{ t('dashboard.upcoming.empty') }}</p>
                    <ul v-else class="dash-rows">
                        <li v-for="due in upcomingList" :key="`${due.kind}-${due.publicId}`" class="dash-row">
                            <span class="dash-row__date">
                                <strong>{{ dayOfMonth(due.date) }}</strong>
                                <span>{{ shortMonth(due.date) }}</span>
                            </span>
                            <span class="dash-row__meta">
                                <span class="dash-row__title">{{ due.name }}</span>
                                <span class="dash-row__sub">{{ relativeDay(due.date) }}</span>
                            </span>
                            <span class="dash-row__amount" :class="due.amount < 0 ? 'is-debit' : 'is-credit'">
                                {{ signedMoney(due.amount, due.currency) }}
                            </span>
                        </li>
                    </ul>
                </AppGlassCard>

                <DashboardBudgetsCard v-if="defaultDashboardView !== 'budget'" :hide-amounts="hideAmounts" />
                <DashboardSavingsGoalsCard :hide-amounts="hideAmounts" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
    AlertTriangleIcon,
    ArrowDownLeftIcon,
    ArrowUpRightIcon,
    ArrowsExchangeIcon,
    BellIcon,
    BuildingBankIcon,
    CalendarDueIcon,
    ChartDonutIcon,
    ChevronRightIcon,
    ScaleIcon,
    TargetIcon,
    UserPlusIcon,
    WalletIcon
} from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { formatAccountBalance, isBalanceHidden, safeAccountColor } from '@/features/accounts/format';
import type { Account, Currency } from '@/features/accounts/types';
import { DashboardBudgetsCard } from '@/features/budgets';
import { BUDGETS_PATHS } from '@/features/budgets/paths';
import { DashboardSavingsGoalsCard } from '@/features/savings-goals';
import { SAVINGS_GOALS_PATHS } from '@/features/savings-goals/paths';
import { RECURRENCES_PATHS } from '@/features/recurring-payments/paths';
import { useDashboardMonth } from '@/features/dashboard/composables/useDashboardMonth';
import { useDashboardOverview } from '@/features/dashboard/composables/useDashboardOverview';
import {
    DASHBOARD_MASKED_AMOUNT,
    DASHBOARD_UPCOMING_DAYS,
    percentChange,
    summarizeFlows,
    topExpenseCategories,
    upcomingDues
} from '@/features/dashboard/format';
import { formatOperationDate, resolveTransactionAmountDisplay } from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';

/** Couleurs des catégories sans couleur propre (et de « Autres »). */
const FALLBACK_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const OTHER_COLOR = '#94A3B8';

const { t, locale } = useI18n();
const {
    greeting,
    todayLabel,
    showBalance,
    hideAmounts,
    primaryCurrency,
    primaryTotal,
    otherTotals,
    accountCount,
    topAccounts,
    activeAccountCount,
    recentTransactions,
    incomingFriends,
    unreadCount,
    overspentBudgetCount,
    overdueSavingsGoalCount,
    defaultDashboardView,
    categoryById
} = useDashboardOverview();
const month = useDashboardMonth();

/** Les chiffres du mois sont dans la devise du compte principal (CHF par défaut). */
const currency = computed<Currency>(() => primaryCurrency.value ?? 'CHF');

const monthLabel = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date()));

const flows = computed(() => summarizeFlows(month.current.value, currency.value));
const previousFlows = computed(() => summarizeFlows(month.previous.value, currency.value));

const allUpcoming = computed(() => upcomingDues(month.expenses.value, month.incomes.value, month.upcomingRange, Number.POSITIVE_INFINITY));
const upcomingList = computed(() => allUpcoming.value.slice(0, 5));
const upcomingOutflow = computed(() =>
    allUpcoming.value.filter((due) => due.amount < 0 && due.currency === currency.value).reduce((sum, due) => sum + Math.abs(due.amount), 0)
);

function money(amount: number, cur: string = currency.value): string {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, cur as Currency, locale.value);
}

function signedMoney(amount: number, cur: string = currency.value): string {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    const sign = amount < 0 ? '−' : '+';
    return `${sign}${formatAccountBalance(Math.abs(amount), cur as Currency, locale.value)}`;
}

function formatPercent(share: number): string {
    return new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }).format(share);
}

/** « +12 % vs sept. » ; `tone` : favorable ou non selon le sens attendu. */
function comparison(currentValue: number, previousValue: number, higherIsBetter: boolean) {
    const change = percentChange(currentValue, previousValue);
    if (change == null) return { hint: t('dashboard.month.noComparison'), tone: null };
    const previousMonth = new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(
        new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    );
    const hint = t('dashboard.month.vsPrevious', { change: `${change > 0 ? '+' : ''}${change} %`, month: previousMonth });
    if (change === 0) return { hint, tone: null };
    return { hint, tone: change > 0 === higherIsBetter ? 'good' : 'bad' };
}

const monthKpis = computed(() => {
    const income = comparison(flows.value.income, previousFlows.value.income, true);
    const expense = comparison(flows.value.expense, previousFlows.value.expense, false);
    const upcomingCount = allUpcoming.value.filter((due) => due.amount < 0).length;
    return [
        {
            id: 'income',
            icon: ArrowUpRightIcon,
            tone: 'credit',
            label: t('dashboard.month.income', { month: monthLabel.value }),
            value: money(flows.value.income),
            hint: income.hint,
            hintTone: income.tone
        },
        {
            id: 'expense',
            icon: ArrowDownLeftIcon,
            tone: 'debit',
            label: t('dashboard.month.expense', { month: monthLabel.value }),
            value: money(flows.value.expense),
            hint: expense.hint,
            hintTone: expense.tone
        },
        {
            id: 'net',
            icon: ScaleIcon,
            tone: flows.value.net < 0 ? 'debit' : 'primary',
            label: t('dashboard.month.net'),
            value: signedMoney(flows.value.net),
            hint: t('dashboard.month.netHint', { count: flows.value.count }, flows.value.count),
            hintTone: null
        },
        {
            id: 'upcoming',
            icon: CalendarDueIcon,
            tone: 'warning',
            label: t('dashboard.month.upcoming', { days: DASHBOARD_UPCOMING_DAYS }),
            value: money(upcomingOutflow.value),
            hint: t('dashboard.month.upcomingHint', { count: upcomingCount }, upcomingCount),
            hintTone: null
        }
    ];
});

const heroLede = computed(() => {
    if (month.loading.value || !flows.value.count) return t('dashboard.hero.lede');
    if (hideAmounts.value) return t('dashboard.hero.ledeMonth', { month: monthLabel.value });
    const key = flows.value.net >= 0 ? 'dashboard.hero.ledePositive' : 'dashboard.hero.ledeNegative';
    return t(key, { month: monthLabel.value, amount: money(Math.abs(flows.value.net)) });
});

const spending = computed(() =>
    topExpenseCategories(month.current.value, currency.value).map((row, index) => {
        if (row.categoryPublicId === 'other') {
            return { key: 'other', name: t('dashboard.spending.other'), color: OTHER_COLOR, amount: row.amount, share: row.share };
        }
        const category = row.categoryPublicId ? categoryById(row.categoryPublicId) : null;
        return {
            key: row.categoryPublicId ?? 'none',
            name: category?.name ?? t('dashboard.spending.uncategorized'),
            color: category?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
            amount: row.amount,
            share: row.share
        };
    })
);

const alerts = computed(() => {
    const list: { id: string; to: string; icon: unknown; tone: 'error' | 'warning' | 'info'; text: string }[] = [];
    if (overspentBudgetCount.value > 0) {
        list.push({
            id: 'budgets',
            to: BUDGETS_PATHS.list,
            icon: AlertTriangleIcon,
            tone: 'error',
            text: t('dashboard.alerts.budgets', { count: overspentBudgetCount.value }, overspentBudgetCount.value)
        });
    }
    if (overdueSavingsGoalCount.value > 0) {
        list.push({
            id: 'goals',
            to: SAVINGS_GOALS_PATHS.list,
            icon: TargetIcon,
            tone: 'warning',
            text: t('dashboard.alerts.goals', { count: overdueSavingsGoalCount.value }, overdueSavingsGoalCount.value)
        });
    }
    if (incomingFriends.value > 0) {
        list.push({
            id: 'friends',
            to: '/app/friends',
            icon: UserPlusIcon,
            tone: 'info',
            text: t('dashboard.alerts.friends', { count: incomingFriends.value }, incomingFriends.value)
        });
    }
    if (unreadCount.value > 0) {
        list.push({
            id: 'notifications',
            to: '/app/notifications',
            icon: BellIcon,
            tone: 'info',
            text: t('dashboard.alerts.notifications', { count: unreadCount.value }, unreadCount.value)
        });
    }
    return list;
});

function accountSubtitle(account: Account): string {
    const parts = [t(`comptesPage.types.${account.type}`)];
    const bank = account.bank?.name ?? account.institutionName;
    if (bank) parts.push(bank);
    if (!account.isOwned) parts.push(t('dashboard.accounts.shared'));
    return parts.join(' · ');
}

function accountBalance(account: Account): string {
    if (hideAmounts.value || isBalanceHidden(account) || account.currentBalance == null) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(account.currentBalance, account.currency, locale.value);
}

function parseYmd(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function dayOfMonth(value: string): string {
    return String(parseYmd(value).getDate());
}

function shortMonth(value: string): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(parseYmd(value)).replace('.', '');
}

function relativeDay(value: string): string {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((parseYmd(value).getTime() - start.getTime()) / 86_400_000);
    return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }).format(days, 'day');
}

function txIcon(type: Transaction['type']) {
    if (type === 'depense') return ArrowDownLeftIcon;
    if (type === 'revenu') return ArrowUpRightIcon;
    return ArrowsExchangeIcon;
}

function txTone(type: Transaction['type']) {
    if (type === 'depense') return 'is-debit';
    if (type === 'revenu') return 'is-credit';
    return '';
}

function txCategory(tx: Transaction): string {
    const category = tx.categoryPublicId ? categoryById(tx.categoryPublicId) : null;
    return category?.name ?? t(`transactionsPage.types.${tx.type}`);
}

function txAmount(tx: Transaction) {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    return resolveTransactionAmountDisplay(tx.amount, tx.currency, locale.value).text;
}
</script>

<style scoped>
.dash {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* ── hero ─────────────────────────────────────────── */
.dash-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.9fr);
    gap: 20px;
    padding: 22px 22px 20px;
    background: linear-gradient(135deg, color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent), transparent 58%), var(--surface);
}

.dash-hero h2 {
    margin: 4px 0 8px;
    font-size: 1.65rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.15;
}

.dash-hero__date {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.dash-hero__lede {
    margin: 0;
    max-width: 46ch;
    color: var(--ink-muted);
    font-size: 0.92rem;
    line-height: 1.5;
}

.dash-hero__balance {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    text-align: right;
}

.dash-hero__label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 650;
}

.dash-hero__amount {
    margin: 4px 0 0;
    font-size: 2rem;
    font-weight: 720;
    letter-spacing: -0.045em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
}

.dash-hero__pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
}

.dash-hero__pill {
    padding: 3px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, var(--surface-raised));
    font-size: 0.75rem;
    font-weight: 650;
}

.dash-hero__meta {
    margin: 8px 0 0;
    color: var(--ink-muted);
    font-size: 0.8rem;
}

/* ── alertes ──────────────────────────────────────── */
.dash-alerts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.dash-alert {
    --tone: var(--v-theme-primary);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 8px 12px;
    border: 1px solid rgba(var(--tone), 0.28);
    border-radius: 999px;
    background: rgba(var(--tone), 0.08);
    color: rgb(var(--tone));
    font-size: 0.82rem;
    font-weight: 650;
    text-decoration: none;
    transition: background 0.2s ease;
}

.dash-alert:hover {
    background: rgba(var(--tone), 0.14);
}

.dash-alert.is-error {
    --tone: var(--v-theme-error);
}

.dash-alert.is-warning {
    --tone: var(--v-theme-warning);
}

.dash-alert__chevron {
    opacity: 0.6;
}

/* ── chiffres du mois ─────────────────────────────── */
.dash-month {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

.dash-stat {
    --tone: var(--v-theme-primary);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--stroke);
    border-radius: var(--radius-surface);
    background: var(--surface);
    box-shadow: var(--shadow-rest);
    animation: su-row 0.55s var(--ease) both;
    animation-delay: calc(var(--i, 0) * 40ms);
}

.dash-stat.is-credit {
    --tone: var(--amount-credit);
}

.dash-stat.is-debit {
    --tone: var(--amount-debit);
}

.dash-stat.is-warning {
    --tone: var(--v-theme-warning);
}

.dash-stat__icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-bottom: 10px;
    border-radius: 10px;
    background: rgba(var(--tone), 0.12);
    color: rgb(var(--tone));
}

.dash-stat__label {
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-weight: 650;
}

.dash-stat__label::first-letter {
    text-transform: uppercase;
}

.dash-stat__value {
    overflow: hidden;
    font-size: 1.4rem;
    font-weight: 720;
    letter-spacing: -0.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.dash-stat__value.is-loading {
    opacity: 0.35;
}

.dash-stat__hint {
    color: var(--ink-muted);
    font-size: 0.75rem;
}

.dash-stat__hint.is-good {
    color: rgb(var(--amount-credit));
}

.dash-stat__hint.is-bad {
    color: rgb(var(--amount-debit));
}

/* ── colonnes ─────────────────────────────────────── */
.dash-main {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(280px, 1fr);
    gap: 16px;
    align-items: start;
}

.dash-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.dash-empty,
.dash-more {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.85rem;
}

.dash-more {
    margin-top: 8px;
    font-size: 0.78rem;
}

/* ── dépenses par catégorie ───────────────────────── */
.dash-bars {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-bar {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.dash-bar__head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 0.86rem;
}

.dash-bar__dot {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 999px;
}

.dash-bar__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-bar__share {
    color: var(--ink-muted);
    font-size: 0.76rem;
    font-variant-numeric: tabular-nums;
}

.dash-bar__amount {
    font-variant-numeric: tabular-nums;
}

.dash-bar__track {
    display: block;
    height: 8px;
    border-radius: 999px;
    background: var(--hair);
    overflow: hidden;
}

.dash-bar__fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s var(--ease);
}

/* ── lignes (comptes, échéances) ──────────────────── */
.dash-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 12px;
}

.dash-row__swatch {
    width: 10px;
    height: 34px;
    border-radius: 999px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 40%, transparent);
}

.dash-row__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 40px;
    padding: 4px 0;
    border-radius: 10px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
    line-height: 1.1;
}

.dash-row__date strong {
    font-size: 1rem;
}

.dash-row__date span {
    color: var(--ink-muted);
    font-size: 0.66rem;
    font-weight: 650;
    text-transform: uppercase;
}

.dash-row__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.dash-row__title {
    overflow: hidden;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-row__sub {
    overflow: hidden;
    color: var(--ink-muted);
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-row__sub::first-letter {
    text-transform: uppercase;
}

.dash-row__amount {
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.dash-row__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.dash-row__amount.is-credit {
    color: rgb(var(--amount-credit));
}

/* ── transactions récentes ────────────────────────── */
.dash-tx-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.dash-tx {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
}

.dash-tx:hover {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent);
}

.dash-tx__icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}

.dash-tx__icon.is-debit {
    background: rgba(var(--amount-debit), 0.12);
    color: rgb(var(--amount-debit));
}

.dash-tx__icon.is-credit {
    background: rgba(var(--amount-credit), 0.12);
    color: rgb(var(--amount-credit));
}

.dash-tx__meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.dash-tx__label {
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-tx__sub {
    color: var(--ink-muted);
    font-size: 0.78rem;
}

.dash-tx__amount {
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.dash-tx__amount.is-debit {
    color: rgb(var(--amount-debit));
}

.dash-tx__amount.is-credit {
    color: rgb(var(--amount-credit));
}

.dash :deep(.su-empty .su-btn) {
    margin-top: 12px;
}

/* ── responsive ───────────────────────────────────── */
@media (max-width: 1100px) {
    .dash-month {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 960px) {
    .dash-hero,
    .dash-main {
        grid-template-columns: 1fr;
    }

    .dash-hero__balance {
        align-items: flex-start;
        text-align: left;
    }

    .dash-hero__pills {
        justify-content: flex-start;
    }
}

@media (max-width: 480px) {
    .dash-month {
        gap: 8px;
    }

    .dash-stat {
        padding: 12px;
    }

    .dash-stat__value {
        font-size: 1.15rem;
    }
}
</style>
