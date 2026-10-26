<template>
    <div class="dash">
        <!-- ── en-tête éditorial : solde héros à gauche, chiffres clés du mois à droite ── -->
        <section class="su-g12 dash-top">
            <div class="dash-lead">
                <p class="dash-lead__label">
                    <template v-if="showBalance">{{ t('dashboard.hero.balance') }} · </template>
                    <span class="dash-lead__date">{{ todayLabel }}</span>
                </p>

                <template v-if="showBalance">
                    <p class="su-hero-num dash-lead__num">
                        <span>{{ hero.main }}</span>
                        <small v-if="hero.decimals || hero.currency"
                            >{{ hero.decimals ?? '' }}{{ hero.currency ? ` ${hero.currency}` : '' }}</small
                        >
                    </p>
                    <p class="dash-lead__meta">{{ heroMeta }}</p>
                </template>
                <template v-else>
                    <p class="dash-lead__greeting">{{ greeting }}</p>
                    <p class="dash-lead__meta">{{ heroLede }}</p>
                </template>
            </div>

            <div class="su-figs dash-figs" role="group" :aria-label="t('dashboard.month.title', { month: monthLabel })">
                <div v-for="kpi in monthKpis" :key="kpi.id" class="su-fig">
                    <p class="su-fig__label">{{ kpi.label }}</p>
                    <p class="su-fig__num" :class="[kpi.positive ? 'su-pos' : '', { 'is-loading': month.loading.value }]">
                        {{ kpi.value }}
                    </p>
                    <p v-if="kpi.hint" class="su-fig__note">{{ kpi.hint }}</p>
                </div>
            </div>
        </section>

        <!-- ── alertes : lignes texte sur filet fin ── -->
        <nav v-if="alerts.length" class="dash-alerts" :aria-label="t('dashboard.alerts.label')">
            <RouterLink v-for="alert in alerts" :key="alert.id" :to="alert.to" class="dash-alert">
                <span class="su-sq dash-alert__sq" aria-hidden="true" />
                <span class="dash-alert__text">{{ alert.text }}</span>
                <span class="dash-alert__arrow" aria-hidden="true">→</span>
            </RouterLink>
        </nav>

        <!-- ── grille 12 colonnes : 7 | 5 ── -->
        <div class="su-g12 dash-main">
            <div class="dash-col dash-col--main">
                <DashboardBudgetsCard v-if="defaultDashboardView === 'budget'" :hide-amounts="hideAmounts" />

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('dashboard.recent.title') }}</h2>
                        <RouterLink to="/app/finances/transactions" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
                    </header>

                    <div v-if="!recentTransactions.length" class="su-empty">
                        <p>{{ t('dashboard.recent.empty') }}</p>
                        <RouterLink to="/app/finances/transactions" class="su-btn su-btn--ink">
                            {{ t('dashboard.actions.addTransaction') }}
                        </RouterLink>
                    </div>
                    <div v-else class="dash-tx-list">
                        <RouterLink
                            v-for="tx in recentTransactions"
                            :key="tx.publicId"
                            class="su-person dash-tx"
                            to="/app/finances/transactions"
                        >
                            <span class="su-person__avatar su-person__avatar--tile" :class="txTile(tx.type)">
                                <component :is="txIcon(tx.type)" :size="18" />
                            </span>
                            <span class="su-person__meta dash-tx__meta">
                                <span class="su-person__name">{{ tx.label }}</span>
                                <span class="su-person__sub">{{ txSubline(tx) }}</span>
                            </span>
                            <span class="su-chip dash-tx__cat" :style="{ '--chip-color': txCategoryColor(tx) }">{{ txCategory(tx) }}</span>
                            <span class="su-person__amount dash-tx__amount" :class="txTone(tx.type)">{{ txAmount(tx) }}</span>
                        </RouterLink>
                    </div>
                </section>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('dashboard.spending.title') }}</h2>
                        <p>{{ t('dashboard.spending.subtitle', { month: monthLabel }) }}</p>
                    </header>

                    <div v-if="month.loading.value" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!spending.length" class="dash-empty">{{ t('dashboard.spending.empty') }}</p>
                    <ul v-else class="dash-bars">
                        <li v-for="(row, index) in spending" :key="row.key" class="dash-bar">
                            <span class="dash-bar__head">
                                <span class="su-sq" :style="{ '--sq-color': row.color }" aria-hidden="true" />
                                <span class="dash-bar__name">{{ row.name }}</span>
                                <span class="dash-bar__share">{{ formatPercent(row.share) }}</span>
                                <span class="dash-bar__amount">{{ money(row.amount) }}</span>
                            </span>
                            <span class="su-gauge">
                                <span
                                    class="su-gauge__fill"
                                    :class="{ 'su-gauge__fill--blue': index === 0 }"
                                    :style="{ width: `${Math.max(row.share * 100, 1)}%` }"
                                />
                            </span>
                        </li>
                    </ul>
                </section>
            </div>

            <div class="dash-col dash-col--side">
                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('dashboard.upcoming.title') }}</h2>
                        <RouterLink :to="RECURRENCES_PATHS.echeances" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
                    </header>

                    <div v-if="month.loading.value" class="su-loading"><span class="su-spin" /></div>
                    <p v-else-if="!upcomingList.length" class="dash-empty">{{ t('dashboard.upcoming.empty') }}</p>
                    <ul v-else class="dash-rows">
                        <li v-for="due in upcomingList" :key="`${due.kind}-${due.publicId}`" class="dash-row dash-row--due">
                            <span class="dash-row__date">{{ formatShortDayMonth(due.date) }}</span>
                            <span class="dash-row__meta">
                                <span class="dash-row__title">{{ due.name }}</span>
                                <span class="dash-row__sub">{{ relativeDay(due.date) }}</span>
                            </span>
                            <span class="dash-row__amount" :class="{ 'su-pos': due.amount > 0 }">{{
                                signedMoney(due.amount, due.currency)
                            }}</span>
                        </li>
                    </ul>
                </section>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('dashboard.accounts.title') }}</h2>
                        <RouterLink to="/app/finances/comptes" class="su-link">{{ t('dashboard.actions.seeAll') }}</RouterLink>
                    </header>

                    <p v-if="!topAccounts.length" class="dash-empty">{{ t('dashboard.accounts.empty') }}</p>
                    <ul v-else class="dash-rows">
                        <li v-for="account in topAccounts" :key="account.publicId" class="dash-row dash-row--account">
                            <span
                                class="su-sq"
                                :style="{ '--sq-color': safeAccountColor(account.color) ?? 'var(--blue)' }"
                                aria-hidden="true"
                            />
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
                </section>

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
    formatShortDayMonth,
    percentChange,
    splitHeroAmount,
    summarizeFlows,
    topExpenseCategories,
    upcomingDues
} from '@/features/dashboard/format';
import { formatOperationDate, resolveTransactionAmountDisplay, sourceAccountPublicId } from '@/features/transactions/format';
import { TRANSACTION_TYPE_ICONS } from '@/features/transactions/typeUi';
import type { Transaction } from '@/features/transactions/types';

/** Catégorie sans couleur propre : encre grise ; « Autres » : gris texte. Jamais d’arc-en-ciel. */
const FALLBACK_CATEGORY_COLOR = 'var(--t-gray-ink)';
const OTHER_COLOR = 'var(--gray)';

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
    categoryById,
    accountById
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

/** Chiffre héros : entier en 76 px, décimales et devise en petit gris. */
const hero = computed(() => splitHeroAmount(primaryTotal.value?.text ?? t('common.emptyValue')));

/** Sous le chiffre héros : nombre de comptes, puis les totaux des autres devises, en gris. */
const heroMeta = computed(() =>
    [t('dashboard.hero.accountsMeta', { count: accountCount.value }, accountCount.value), ...otherTotals.value.map((row) => row.text)].join(
        ' · '
    )
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

/** « +12 % vs sept. » ou « Pas de comparaison possible ». */
function comparison(currentValue: number, previousValue: number): string {
    const change = percentChange(currentValue, previousValue);
    if (change == null) return t('dashboard.month.noComparison');
    const previousMonth = new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(
        new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    );
    return t('dashboard.month.vsPrevious', { change: `${change > 0 ? '+' : ''}${change} %`, month: previousMonth });
}

const monthKpis = computed(() => {
    const upcomingCount = allUpcoming.value.filter((due) => due.amount < 0).length;
    return [
        {
            id: 'income',
            label: t('dashboard.month.income', { month: monthLabel.value }),
            value: money(flows.value.income),
            hint: comparison(flows.value.income, previousFlows.value.income),
            positive: false
        },
        {
            id: 'expense',
            label: t('dashboard.month.expense', { month: monthLabel.value }),
            value: money(flows.value.expense),
            hint: comparison(flows.value.expense, previousFlows.value.expense),
            positive: false
        },
        {
            id: 'net',
            label: t('dashboard.month.net'),
            value: signedMoney(flows.value.net),
            hint: t('dashboard.month.netHint', { count: flows.value.count }, flows.value.count),
            positive: !hideAmounts.value && flows.value.net > 0
        },
        {
            id: 'upcoming',
            label: t('dashboard.month.upcoming', { days: DASHBOARD_UPCOMING_DAYS }),
            value: money(upcomingOutflow.value),
            hint: t('dashboard.month.upcomingHint', { count: upcomingCount }, upcomingCount),
            positive: false
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
    topExpenseCategories(month.current.value, currency.value).map((row) => {
        if (row.categoryPublicId === 'other') {
            return { key: 'other', name: t('dashboard.spending.other'), color: OTHER_COLOR, amount: row.amount, share: row.share };
        }
        const category = row.categoryPublicId ? categoryById(row.categoryPublicId) : null;
        return {
            key: row.categoryPublicId ?? 'none',
            name: category?.name ?? t('dashboard.spending.uncategorized'),
            color: category?.color || FALLBACK_CATEGORY_COLOR,
            amount: row.amount,
            share: row.share
        };
    })
);

const alerts = computed(() => {
    const list: { id: string; to: string; text: string }[] = [];
    if (overspentBudgetCount.value > 0) {
        list.push({
            id: 'budgets',
            to: BUDGETS_PATHS.list,
            text: t('dashboard.alerts.budgets', { count: overspentBudgetCount.value }, overspentBudgetCount.value)
        });
    }
    if (overdueSavingsGoalCount.value > 0) {
        list.push({
            id: 'goals',
            to: SAVINGS_GOALS_PATHS.list,
            text: t('dashboard.alerts.goals', { count: overdueSavingsGoalCount.value }, overdueSavingsGoalCount.value)
        });
    }
    if (incomingFriends.value > 0) {
        list.push({
            id: 'friends',
            to: '/app/friends',
            text: t('dashboard.alerts.friends', { count: incomingFriends.value }, incomingFriends.value)
        });
    }
    if (unreadCount.value > 0) {
        list.push({
            id: 'notifications',
            to: '/app/notifications',
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

function relativeDay(value: string): string {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((parseYmd(value).getTime() - start.getTime()) / 86_400_000);
    return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }).format(days, 'day');
}

function txIcon(type: Transaction['type']) {
    return TRANSACTION_TYPE_ICONS[type];
}

/** Teinte du carré : revenu et virement en bleu (teinte par défaut), dépense en gris neutre. */
function txTile(type: Transaction['type']) {
    return type === 'depense' ? 'dash-tx__tile--gray' : '';
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

function txCategoryColor(tx: Transaction): string {
    const category = tx.categoryPublicId ? categoryById(tx.categoryPublicId) : null;
    return category?.color || FALLBACK_CATEGORY_COLOR;
}

/** « 23 oct. 2026 · Courant » */
function txSubline(tx: Transaction): string {
    const sourceId = sourceAccountPublicId(tx);
    const accountName = sourceId ? accountById(sourceId)?.name : null;
    return [formatOperationDate(tx.operationDate, locale.value), accountName].filter(Boolean).join(' · ');
}

/** Montant signé : « + » bleu pour un revenu, vrai signe moins pour une dépense, nu pour un virement. */
function txAmount(tx: Transaction) {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    const signed = tx.type === 'transfert' || tx.amount == null ? tx.amount : Math.abs(tx.amount);
    const display = resolveTransactionAmountDisplay(signed, tx.currency, locale.value);
    if (display.hidden) return display.text;
    const sign = tx.type === 'revenu' ? '+' : tx.type === 'depense' ? '−' : '';
    return `${sign}${display.text}`;
}
</script>

<style scoped>
/* Page éditoriale : aucune carte, les blocs flottent sur le fond et sont séparés par l'espace et les filets. */
.dash {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
}

/* ── en-tête : solde héros (5/12) | chiffres clés (7/12) ── */
.dash-top {
    align-items: end;
}

.dash-lead {
    grid-column: span 5;
    min-width: 0;
}

.dash-figs {
    grid-column: span 7;
    align-self: end;
    /* 4 chiffres clés : grille 2 × 2 dans une seule carte, filets fins entre les cases */
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dash-figs > .su-fig {
    box-shadow:
        -1px 0 0 var(--line),
        0 -1px 0 var(--line);
}

.dash-figs .su-fig__num {
    font-size: 26px;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 767px) {
    .dash-figs .su-fig__num {
        font-size: 18px;
        overflow: visible;
        white-space: normal;
    }
}

.dash-lead__label {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
}

.dash-lead__date {
    color: var(--gray);
}

.dash-lead__num {
    margin-top: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dash-lead__num small {
    margin-left: 2px;
}

.dash-lead__greeting {
    margin: 12px 0 0;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1.1;
}

.dash-lead__meta {
    margin: 12px 0 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.4;
}

.su-fig__num.is-loading {
    opacity: 0.35;
}

/* ── alertes : texte sur filet fin, carré violet 7 px, flèche ── */
.dash-alerts {
    display: flex;
    flex-direction: column;
    margin: -16px 0;
    border-bottom: 1px solid var(--line);
}

.dash-alert {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
    color: var(--ink);
    font-size: 14px;
    text-decoration: none;
    transition: background 0.15s var(--ease);
}

.dash-alert:hover {
    background: var(--soft);
}

.dash-alert__sq {
    --sq-color: var(--violet);
}

.dash-alert__text {
    flex: 1 1 auto;
    min-width: 0;
}

.dash-alert__arrow {
    color: var(--gray);
}

/* ── colonnes 7 | 5 ── */
.dash-main {
    align-items: start;
}

.dash-col {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
    min-width: 0;
}

.dash-col--main {
    grid-column: span 7;
}

.dash-col--side {
    grid-column: span 5;
}

.dash-empty,
.dash-more {
    margin: 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    color: var(--gray);
    font-size: 14px;
}

.dash-more {
    font-size: 13px;
}

/* ── dernières transactions : 36 px | nom + date · compte | catégorie | montant ── */
.dash-tx-list {
    display: flex;
    flex-direction: column;
}

.dash-tx {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto 120px;
    gap: 14px;
    align-items: center;
}

.dash-tx .su-person__name,
.dash-tx .su-person__sub {
    display: block;
}

.dash-tx__tile--gray {
    background: var(--t-gray-bg);
    color: var(--t-gray-ink);
}

.dash-tx__cat {
    max-width: 180px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.dash-tx__amount {
    min-width: 0;
    color: rgb(var(--amount-debit));
}

.dash-tx__amount.is-credit {
    color: rgb(var(--amount-credit));
}

/* ── dépenses par catégorie : nom + part + montant, jauge carrée 6 px ── */
.dash-bars {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0 14px;
    border-top: 1px solid var(--line);
}

.dash-bar__head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
    font-size: 14px;
}

.dash-bar__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-bar__share {
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.dash-bar__amount {
    min-width: 96px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: right;
}

/* ── lignes de la colonne droite (échéances, comptes) ── */
.dash-rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dash-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.dash-row--due {
    grid-template-columns: 56px minmax(0, 1fr) auto;
}

.dash-row__date {
    color: var(--gray);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.dash-row__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.dash-row__title {
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-row__sub {
    overflow: hidden;
    color: var(--gray);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dash-row__amount {
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    text-align: right;
}

/* ── mobile : tout s'empile, le chiffre héros se resserre ── */
@media (max-width: 959.98px) {
    .dash-top {
        row-gap: 32px;
    }
}

@media (max-width: 767.98px) {
    .dash-tx {
        grid-template-columns: 36px minmax(0, 1fr) auto;
    }

    .dash-tx__cat {
        display: none;
    }
}

@media (max-width: 599.98px) {
    .dash-lead__num {
        font-size: 52px;
    }

    .dash-tx__amount {
        min-width: 0;
    }
}
</style>
