<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
    AddressBookIcon,
    ArrowDownLeftIcon,
    ArrowUpRightIcon,
    ArrowsExchangeIcon,
    BellIcon,
    BuildingBankIcon,
    CreditCardIcon,
    FilesIcon,
    TagsIcon,
    UsersIcon,
    WalletIcon
} from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { FileUsageMeter } from '@/features/files';
import { useDashboardModules } from '@/features/dashboard/composables/useDashboardModules';
import { useDashboardOverview } from '@/features/dashboard/composables/useDashboardOverview';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { formatOperationDate, resolveTransactionAmountDisplay } from '@/features/transactions/format';
import type { Transaction } from '@/features/transactions/types';

const { t, locale } = useI18n();
const { live } = useDashboardModules();
const {
    greeting,
    todayLabel,
    showBalance,
    hideAmounts,
    primaryTotal,
    otherTotals,
    accountCount,
    sharedCount,
    transactionCount,
    recentTransactions,
    fileUsage,
    friendsCount,
    incomingFriends,
    unreadCount,
    categoryCount,
    tierCount,
    paymentMethodCount
} = useDashboardOverview();

const kpis = computed(() => [
    {
        to: '/app/finances/comptes',
        icon: BuildingBankIcon,
        value: String(accountCount.value),
        label: t('dashboard.kpis.accounts'),
        hint:
            sharedCount.value > 0
                ? t('dashboard.kpis.sharedAccounts', { count: sharedCount.value }, sharedCount.value)
                : t('dashboard.kpis.accountsHint')
    },
    {
        to: '/app/finances/transactions',
        icon: ArrowsExchangeIcon,
        value: String(transactionCount.value),
        label: t('dashboard.kpis.transactions'),
        hint: t('dashboard.kpis.transactionsHint')
    },
    {
        to: '/app/gestion/files',
        icon: FilesIcon,
        value: String(fileUsage.value?.fileCount ?? 0),
        label: t('dashboard.kpis.files'),
        hint: t('dashboard.kpis.filesHint')
    },
    {
        to: '/app/friends',
        icon: UsersIcon,
        value: String(friendsCount.value),
        label: t('dashboard.kpis.friends'),
        hint:
            incomingFriends.value > 0
                ? t('dashboard.kpis.incomingFriends', { count: incomingFriends.value }, incomingFriends.value)
                : t('dashboard.kpis.friendsHint')
    },
    {
        to: '/app/notifications',
        icon: BellIcon,
        value: String(unreadCount.value),
        label: t('dashboard.kpis.notifications'),
        hint: t('dashboard.kpis.notificationsHint'),
        alert: unreadCount.value > 0
    },
    {
        to: '/app/gestion/categories',
        icon: TagsIcon,
        value: String(categoryCount.value),
        label: t('dashboard.kpis.categories'),
        hint: t('dashboard.kpis.categoriesHint')
    },
    {
        to: '/app/gestion/tiers',
        icon: AddressBookIcon,
        value: String(tierCount.value),
        label: t('dashboard.kpis.tiers'),
        hint: t('dashboard.kpis.tiersHint')
    },
    {
        to: '/app/finances/moyens-de-paiement',
        icon: CreditCardIcon,
        value: String(paymentMethodCount.value),
        label: t('dashboard.kpis.paymentMethods'),
        hint: t('dashboard.kpis.paymentMethodsHint')
    }
]);

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

function txAmount(tx: Transaction) {
    if (hideAmounts.value) return DASHBOARD_MASKED_AMOUNT;
    return resolveTransactionAmountDisplay(tx.amount, tx.currency, locale.value).text;
}
</script>

<template>
    <div class="dash">
        <section class="su-surface dash-hero">
            <div class="dash-hero__copy">
                <p class="dash-hero__date">{{ todayLabel }}</p>
                <h2>{{ greeting }}</h2>
                <p class="dash-hero__lede">{{ t('dashboard.hero.lede') }}</p>
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

        <div class="dash-kpis">
            <RouterLink
                v-for="(kpi, i) in kpis"
                :key="kpi.to"
                :to="kpi.to"
                class="dash-kpi"
                :class="{ 'is-alert': kpi.alert }"
                :style="{ '--i': i }"
            >
                <span class="dash-kpi__icon">
                    <component :is="kpi.icon" :size="18" stroke-width="1.6" />
                </span>
                <strong>{{ kpi.value }}</strong>
                <span class="dash-kpi__label">{{ kpi.label }}</span>
                <span class="dash-kpi__hint">{{ kpi.hint }}</span>
            </RouterLink>
        </div>

        <div class="dash-main">
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
                                {{ t(`transactionsPage.types.${tx.type}`) }} · {{ formatOperationDate(tx.operationDate, locale) }}
                            </span>
                        </span>
                        <span class="dash-tx__amount" :class="txTone(tx.type)">{{ txAmount(tx) }}</span>
                    </RouterLink>
                </div>
            </AppGlassCard>

            <div class="dash-side">
                <AppGlassCard :title="t('dashboard.shortcuts.title')" :subtitle="t('dashboard.shortcuts.subtitle')">
                    <nav class="dash-shortcuts">
                        <RouterLink v-for="mod in live" :key="mod.id" :to="mod.to" class="dash-shortcut">
                            <span class="dash-shortcut__icon">
                                <component :is="mod.icon" :size="18" stroke-width="1.6" />
                            </span>
                            <span>
                                <strong>{{ t(mod.titleKey) }}</strong>
                                <span>{{ t(mod.captionKey) }}</span>
                            </span>
                        </RouterLink>
                    </nav>
                </AppGlassCard>

                <AppGlassCard v-if="fileUsage" :title="t('dashboard.storage.title')" :subtitle="t('dashboard.storage.subtitle')">
                    <template #icon>
                        <FilesIcon :size="20" stroke-width="1.5" />
                    </template>
                    <FileUsageMeter :usage="fileUsage" />
                </AppGlassCard>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dash {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

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

.dash-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 12px;
}

.dash-kpi {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 118px;
    padding: 14px;
    border-radius: var(--radius-surface);
    border: 1px solid var(--stroke);
    background: var(--surface);
    box-shadow: var(--shadow-rest);
    color: inherit;
    text-decoration: none;
    animation: su-row 0.55s var(--ease) both;
}

.dash-kpi:hover {
    border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 35%, var(--stroke));
}

.dash-kpi__icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
    border-radius: 10px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
    color: rgb(var(--v-theme-primary));
}

.dash-kpi.is-alert .dash-kpi__icon {
    background: color-mix(in srgb, rgb(var(--v-theme-error)) 14%, transparent);
    color: rgb(var(--v-theme-error));
}

.dash-kpi strong {
    font-size: 1.35rem;
    font-weight: 720;
    letter-spacing: -0.03em;
}

.dash-kpi__label {
    font-size: 0.82rem;
    font-weight: 650;
}

.dash-kpi__hint {
    color: var(--ink-muted);
    font-size: 0.75rem;
}

.dash-main {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.9fr);
    gap: 16px;
    align-items: start;
}

.dash-side {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

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
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.dash-tx__icon.is-credit {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
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
}

.dash-tx__amount.is-debit {
    color: rgb(var(--v-theme-error));
}

.dash-tx__amount.is-credit {
    color: rgb(var(--v-theme-success));
}

.dash-shortcuts {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.dash-shortcut {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
}

.dash-shortcut:hover {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent);
}

.dash-shortcut__icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
    color: rgb(var(--v-theme-primary));
}

.dash-shortcut strong,
.dash-shortcut span span {
    display: block;
}

.dash-shortcut strong {
    font-size: 0.9rem;
}

.dash-shortcut span span {
    color: var(--ink-muted);
    font-size: 0.76rem;
}

.dash-side :deep(.file-usage) {
    margin: 0;
}

.dash :deep(.su-empty .su-btn) {
    margin-top: 12px;
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
</style>
