<script setup lang="ts">
/**
 * Vue d’ensemble du patrimoine : chiffre héros, chiffres clés, répartition (barre empilée +
 * trois colonnes par type), solde entre amis, courbe d’évolution et dernier snapshot.
 * Page éditoriale : aucune carte, les blocs flottent sur le fond, séparés par l’espace et les filets.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { CameraIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { ASSETS_PATHS } from '@/features/assets/paths';
import { INVESTMENTS_PATHS } from '@/features/investments/paths';
import { DEBTS_PATHS } from '@/features/liabilities/paths';
import { REAL_ESTATE_PATHS } from '@/features/real-estate/paths';
import NetWorthEvolutionChart from '@/features/net-worth/components/NetWorthEvolutionChart.vue';
import {
    breakdownLabel,
    evolutionSeries,
    formatCalendarDate,
    formatNetWorthAmount,
    formatPercent,
    formatSignedDelta,
    splitHeroAmount,
    stackedShares,
    type BreakdownKind
} from '@/features/net-worth/format';
import { useNetWorthStore } from '@/features/net-worth/stores/net-worth-store';
import type { NetWorthBucket } from '@/features/net-worth/types';
import { SWISS_MINUS } from '@/features/accounts/format';

const ACCOUNTS_PATH = '/app/finances/comptes';

const { t, te, locale } = useI18n();
const store = useNetWorthStore();

const overview = computed(() => store.overview);
const currency = computed(() => overview.value?.currency ?? 'CHF');

/** `su-loading` au premier chargement seulement ; ensuite les chiffres restent affichés pendant les rechargements. */
const showLoading = computed(() => store.loading && !overview.value);

function money(amount: number): string {
    return formatNetWorthAmount(amount, currency.value, locale.value);
}

/** Montant de passif : toujours en négatif noir, vrai signe moins. */
function negative(amount: number): string {
    if (amount === 0) return money(0);
    return `${SWISS_MINUS}${money(Math.abs(amount))}`;
}

// ── en-tête ─────────────────────────────────────────────────────────────────
const asOfLabel = computed(() => (overview.value?.asOf ? formatCalendarDate(overview.value.asOf, locale.value) : ''));
const hero = computed(() => splitHeroAmount(overview.value?.netWorth ?? 0, currency.value, locale.value));

const lastSnapshot = computed(() => overview.value?.lastSnapshot ?? null);
const deltaText = computed(() => {
    const last = lastSnapshot.value;
    if (!last) return '';
    return t('netWorthPage.hero.since', {
        delta: formatSignedDelta(last.delta, currency.value, locale.value),
        date: formatCalendarDate(last.periode, locale.value)
    });
});
/** Hausse en bleu (`+`), baisse en noir (vrai signe moins), stable sans couleur. */
const deltaTone = computed(() => {
    const delta = lastSnapshot.value?.delta ?? 0;
    if (delta > 0) return 'su-pos';
    if (delta < 0) return 'su-neg';
    return '';
});

const figs = computed(() => {
    const data = overview.value;
    if (!data) return [];
    const withoutQuote = data.investmentsWithoutQuote;
    return [
        { id: 'accounts', label: t('netWorthPage.figs.accounts'), value: money(data.totalAccounts), note: '', negative: false },
        { id: 'assets', label: t('netWorthPage.figs.assets'), value: money(data.totalAssets), note: '', negative: false },
        { id: 'liabilities', label: t('netWorthPage.figs.liabilities'), value: negative(data.totalLiabilities), note: '', negative: true },
        {
            id: 'investments',
            label: t('netWorthPage.figs.investments'),
            value: money(data.investments),
            note: withoutQuote > 0 ? t('netWorthPage.figs.withoutQuote', { count: withoutQuote }, withoutQuote) : '',
            negative: false
        }
    ];
});

// ── devises exclues ──────────────────────────────────────────────────────────
const excludedText = computed(() => {
    const rows = overview.value?.excluded ?? [];
    if (!rows.length) return '';
    const list = rows
        .map((row) => {
            const parts: string[] = [];
            if (row.accountsCount > 0) parts.push(t('netWorthPage.excluded.accounts', { count: row.accountsCount }, row.accountsCount));
            if (row.assetsCount > 0) parts.push(t('netWorthPage.excluded.assets', { count: row.assetsCount }, row.assetsCount));
            if (row.liabilitiesCount > 0) {
                parts.push(t('netWorthPage.excluded.liabilities', { count: row.liabilitiesCount }, row.liabilitiesCount));
            }
            return `${row.currency} — ${parts.join(', ')}`;
        })
        .join(' ; ');
    return t('netWorthPage.excluded.message', { list });
});

// ── répartition ──────────────────────────────────────────────────────────────
type Segment = { key: string; value: number; share: number; color: string; label: string };

/** Les placements sont déjà dans les comptes : on les isole pour ne pas les compter deux fois. */
const segments = computed<Segment[]>(() => {
    const data = overview.value;
    if (!data) return [];
    const accountsOnly = Math.max(0, data.totalAccounts - Math.max(0, data.investments));
    const shares = stackedShares([
        { key: 'accounts', value: accountsOnly, color: 'var(--blue)', label: t('netWorthPage.figs.accounts') },
        { key: 'assets', value: data.totalAssets, color: 'var(--violet)', label: t('netWorthPage.figs.assets') },
        { key: 'investments', value: data.investments, color: 'var(--blue-soft)', label: t('netWorthPage.figs.investments') },
        { key: 'liabilities', value: data.totalLiabilities, color: 'var(--ink)', label: t('netWorthPage.figs.liabilities') }
    ]);
    return shares.filter((segment) => segment.share > 0);
});

/** Même gabarit de colonnes pour la barre et sa légende : la légende reste alignée sous chaque segment. */
const segmentColumns = computed(() => segments.value.map((segment) => `minmax(0, ${segment.share}fr)`).join(' '));

function label(kind: BreakdownKind, type: string): string {
    return breakdownLabel(kind, type, { t, te });
}

type BreakdownColumn = {
    id: BreakdownKind;
    title: string;
    buckets: NetWorthBucket[];
    color: string;
    negative: boolean;
    links: { to: string; text: string }[];
};

const columns = computed<BreakdownColumn[]>(() => {
    const data = overview.value;
    if (!data) return [];
    return [
        {
            id: 'assets',
            title: t('netWorthPage.breakdown.assetsTitle'),
            buckets: data.assetsByType,
            color: 'var(--violet)',
            negative: false,
            links: [
                { to: ASSETS_PATHS.list, text: t('netWorthPage.breakdown.seeAssets') },
                { to: REAL_ESTATE_PATHS.list, text: t('netWorthPage.breakdown.seeRealEstate') }
            ]
        },
        {
            id: 'liabilities',
            title: t('netWorthPage.breakdown.liabilitiesTitle'),
            buckets: data.liabilitiesByType,
            color: 'var(--ink)',
            negative: true,
            links: [{ to: DEBTS_PATHS.liabilities, text: t('netWorthPage.breakdown.seeLiabilities') }]
        },
        {
            id: 'accounts',
            title: t('netWorthPage.breakdown.accountsTitle'),
            buckets: data.accountsByType,
            color: 'var(--blue)',
            negative: false,
            links: [
                { to: ACCOUNTS_PATH, text: t('netWorthPage.breakdown.seeAccounts') },
                { to: INVESTMENTS_PATHS.list, text: t('netWorthPage.breakdown.seeInvestments') }
            ]
        }
    ];
});

// ── entre amis ───────────────────────────────────────────────────────────────
const friends = computed(() => overview.value?.friendsBalance ?? { receivable: 0, payable: 0 });

// ── évolution ────────────────────────────────────────────────────────────────
const points = computed(() => evolutionSeries(store.snapshots, overview.value));
const hasHistory = computed(() => store.snapshots.length > 0);

const latestSnapshot = computed(() => store.snapshots.at(-1) ?? null);
const savingsRateText = computed(() => {
    const rate = latestSnapshot.value?.savingsRate;
    return rate == null ? t('common.emptyValue') : formatPercent(rate, locale.value);
});

async function onTakeSnapshot() {
    if (store.acting) return;
    await store.takeSnapshot().catch(() => undefined);
}

async function onRetry() {
    store.clearError();
    await Promise.all([store.load(true), store.loadSnapshots({ force: true })]).catch(() => undefined);
}
</script>

<template>
    <div class="nw">
        <AppAlert v-if="store.error" type="error" class="nw-alert">
            <div class="nw-alert__row">
                <span>{{ store.error }}</span>
                <button type="button" class="su-btn su-btn--sm" :disabled="store.loading" @click="onRetry">{{ t('common.retry') }}</button>
            </div>
        </AppAlert>

        <div v-if="showLoading" class="su-loading"><span class="su-spin" /></div>

        <template v-else-if="overview">
            <!-- ── en-tête éditorial : patrimoine net à gauche, chiffres clés à droite ── -->
            <section class="su-g12 nw-top">
                <div class="nw-lead">
                    <p class="nw-lead__label">
                        {{ t('netWorthPage.hero.label') }} ·
                        <span class="nw-lead__date">{{ t('netWorthPage.hero.asOf', { date: asOfLabel }) }}</span>
                    </p>
                    <p class="su-hero-num nw-lead__num" :class="{ 'su-neg': hero.sign }">
                        <span>{{ hero.sign }}{{ hero.main }}</span>
                        <small>{{ hero.decimals ?? '' }} {{ hero.currency }}</small>
                    </p>
                    <p v-if="deltaText" class="nw-lead__meta" :class="deltaTone">{{ deltaText }}</p>
                    <p v-else class="nw-lead__meta nw-lead__meta--muted">{{ t('netWorthPage.hero.noSnapshot') }}</p>
                </div>

                <div class="su-figs nw-figs" role="group" :aria-label="t('netWorthPage.figs.label')">
                    <div v-for="fig in figs" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="{ 'su-neg': fig.negative, 'is-loading': store.loading }">{{ fig.value }}</p>
                        <p v-if="fig.note" class="su-fig__note">{{ fig.note }}</p>
                    </div>
                </div>
            </section>

            <!-- ── devises exclues ── -->
            <AppAlert v-if="excludedText" type="warning">{{ excludedText }}</AppAlert>

            <!-- ── répartition : barre empilée carrée + trois colonnes par type ── -->
            <section class="su-section nw-section">
                <header class="su-section__head">
                    <h2>{{ t('netWorthPage.breakdown.title') }}</h2>
                    <p>{{ t('netWorthPage.breakdown.subtitle') }}</p>
                </header>

                <div v-if="segments.length" class="nw-stack" :style="{ '--nw-columns': segmentColumns }">
                    <div class="nw-stack__bar" role="img" :aria-label="t('netWorthPage.breakdown.barLabel')">
                        <span
                            v-for="segment in segments"
                            :key="segment.key"
                            class="nw-stack__segment"
                            :style="{ background: segment.color }"
                            :title="`${segment.label} · ${formatPercent(segment.share, locale)}`"
                        />
                    </div>
                    <ul class="nw-stack__legend">
                        <li v-for="segment in segments" :key="segment.key" class="nw-stack__item">
                            <span class="nw-stack__name">
                                <span class="su-sq" :style="{ '--sq-color': segment.color }" aria-hidden="true" />
                                {{ segment.label }}
                            </span>
                            <span class="nw-stack__share">{{ formatPercent(segment.share, locale) }}</span>
                        </li>
                    </ul>
                </div>
                <p v-else class="nw-muted">{{ t('netWorthPage.breakdown.empty') }}</p>

                <div class="su-g12 nw-columns">
                    <div v-for="column in columns" :key="column.id" class="nw-column">
                        <h3 class="nw-column__title">{{ column.title }}</h3>
                        <p v-if="!column.buckets.length" class="nw-muted">{{ t('netWorthPage.breakdown.none') }}</p>
                        <ul v-else class="nw-kv-list">
                            <li v-for="bucket in column.buckets" :key="bucket.type" class="su-kv nw-kv">
                                <span class="nw-kv__label">
                                    <span class="su-sq" :style="{ '--sq-color': column.color }" aria-hidden="true" />
                                    <span class="nw-kv__name">{{ label(column.id, bucket.type) }}</span>
                                    <span class="nw-kv__count">× {{ bucket.count }}</span>
                                </span>
                                <span class="nw-kv__amount" :class="{ 'su-neg': column.negative }">{{
                                    column.negative ? negative(bucket.total) : money(bucket.total)
                                }}</span>
                            </li>
                        </ul>
                        <p class="nw-column__links">
                            <RouterLink v-for="link in column.links" :key="link.to" :to="link.to" class="su-link">{{
                                link.text
                            }}</RouterLink>
                        </p>
                    </div>
                </div>
            </section>

            <!-- ── entre amis ── -->
            <section class="su-section nw-section">
                <header class="su-section__head">
                    <h2>{{ t('netWorthPage.friends.title') }}</h2>
                    <RouterLink :to="DEBTS_PATHS.shared" class="su-link">{{ t('netWorthPage.friends.seeAll') }}</RouterLink>
                </header>
                <div class="su-g12 nw-friends">
                    <div class="su-kv su-kv--strong nw-friends__row">
                        <span>{{ t('netWorthPage.friends.receivable') }}</span>
                        <span :class="{ 'su-pos': friends.receivable > 0 }">{{
                            friends.receivable > 0 ? `+${money(friends.receivable)}` : money(friends.receivable)
                        }}</span>
                    </div>
                    <div class="su-kv su-kv--strong nw-friends__row">
                        <span>{{ t('netWorthPage.friends.payable') }}</span>
                        <span class="su-neg">{{ negative(friends.payable) }}</span>
                    </div>
                </div>
            </section>

            <!-- ── évolution ── -->
            <section class="su-section nw-section">
                <header class="su-section__head nw-evolution__head">
                    <h2>{{ t('netWorthPage.evolution.title') }}</h2>
                    <button type="button" class="su-btn nw-evolution__btn" :disabled="store.acting" @click="onTakeSnapshot">
                        <CameraIcon :size="16" stroke-width="1.6" />
                        {{ t('netWorthPage.actions.takeSnapshot') }}
                    </button>
                </header>

                <div v-if="store.loadingSnapshots && !hasHistory" class="su-loading"><span class="su-spin" /></div>
                <div v-else-if="!hasHistory" class="su-empty">
                    <p>{{ t('netWorthPage.evolution.empty') }}</p>
                </div>
                <NetWorthEvolutionChart v-else :points="points" :currency="currency" :locale="locale" />

                <p class="nw-evolution__note">{{ t('netWorthPage.evolution.note') }}</p>
            </section>

            <!-- ── dernier snapshot ── -->
            <section v-if="latestSnapshot" class="su-section nw-section">
                <header class="su-section__head">
                    <h2>{{ t('netWorthPage.snapshot.title') }}</h2>
                    <p>{{ t('netWorthPage.snapshot.period', { date: formatCalendarDate(latestSnapshot.periode, locale) }) }}</p>
                </header>
                <div class="su-g12 nw-snapshot">
                    <div class="su-kv nw-snapshot__row">
                        <span>{{ t('netWorthPage.snapshot.income') }}</span>
                        <span class="nw-kv__amount su-pos">+{{ money(latestSnapshot.monthlyIncome) }}</span>
                    </div>
                    <div class="su-kv nw-snapshot__row">
                        <span>{{ t('netWorthPage.snapshot.expenses') }}</span>
                        <span class="nw-kv__amount su-neg">{{ negative(latestSnapshot.monthlyExpenses) }}</span>
                    </div>
                    <div class="su-kv nw-snapshot__row">
                        <span>{{ t('netWorthPage.snapshot.savingsRate') }}</span>
                        <span class="nw-kv__amount">{{ savingsRateText }}</span>
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<style scoped>
/* Page éditoriale : aucune carte, blocs séparés par l'espace (56 px) et les filets.
   La mise en page suit la largeur réelle du corps (conteneur) : la sidebar en mange une partie. */
.nw {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
}

.nw-alert__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

/* ── en-tête : patrimoine net (5/12) | chiffres clés (7/12) ── */
.nw-top {
    align-items: end;
}

.nw-lead {
    grid-column: span 5;
    min-width: 0;
}

.nw-figs {
    grid-column: span 7;
    align-self: end;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nw-figs > .su-fig {
    box-shadow:
        -1px 0 0 var(--line),
        0 -1px 0 var(--line);
}

.nw-figs .su-fig__num {
    font-size: 26px;
    overflow-wrap: anywhere;
}

.nw-figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.nw-lead__label {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
}

.nw-lead__date {
    color: var(--gray);
}

.nw-lead__num {
    margin-top: 12px;
    font-size: clamp(44px, 9cqi, 76px);
    white-space: normal;
    overflow-wrap: anywhere;
}

.nw-lead__num small {
    margin-left: 2px;
}

.nw-lead__meta {
    margin: 12px 0 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
}

.nw-lead__meta--muted {
    color: var(--gray);
    font-weight: 400;
}

/* ── sections : titre sur filet 2 px ── */
.nw-section {
    border-top: 2px solid var(--ink);
    padding-top: 12px;
}

.nw-muted {
    margin: 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    color: var(--gray);
    font-size: 14px;
}

/* ── barre empilée carrée + légende alignée sous chaque segment ── */
.nw-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 40px;
}

.nw-stack__bar,
.nw-stack__legend {
    display: grid;
    grid-template-columns: var(--nw-columns);
    gap: 0 2px;
}

.nw-stack__bar {
    height: 14px;
}

.nw-stack__segment {
    display: block;
    height: 100%;
    min-width: 2px;
}

.nw-stack__legend {
    margin: 0;
    padding: 0;
    list-style: none;
}

.nw-stack__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 13px;
}

.nw-stack__name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    color: var(--gray);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nw-stack__share {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

/* ── trois colonnes : actifs · passifs · comptes ── */
.nw-columns {
    align-items: start;
}

.nw-column {
    grid-column: span 4;
    min-width: 0;
}

.nw-column__title {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 700;
}

.nw-kv-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.nw-kv__label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--ink);
}

.nw-kv__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nw-kv__count {
    color: var(--gray);
    font-size: 13px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.nw-kv__amount {
    font-weight: 700;
    white-space: nowrap;
}

.nw-column__links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 0;
    padding-top: 12px;
    border-top: 1px solid var(--line);
}

/* ── entre amis · dernier snapshot : lignes libellé / valeur sur 2 colonnes ── */
.nw-friends__row,
.nw-snapshot__row {
    grid-column: span 6;
}

.nw-snapshot__row {
    grid-column: span 4;
}

.nw-friends,
.nw-snapshot {
    row-gap: 0;
}

/* ── évolution ── */
.nw-evolution__head {
    align-items: center;
}

.nw-evolution__note {
    margin: 12px 0 0;
    color: var(--gray);
    font-size: 13px;
}

/* ── corps étroit : en-tête puis chiffres clés empilés, colonnes par type empilées ── */
@container (max-width: 979.98px) {
    .nw-top {
        row-gap: 32px;
    }

    .nw-lead,
    .nw-figs {
        grid-column: 1 / -1;
    }
}

@container (max-width: 759.98px) {
    .nw-column {
        grid-column: 1 / -1;
    }

    .nw-friends__row,
    .nw-snapshot__row {
        grid-column: 1 / -1;
    }
}

/* ── mobile : la légende de la barre devient une liste ── */

@media (max-width: 767.98px) {
    .nw-figs .su-fig__num {
        font-size: 18px;
        overflow: visible;
        white-space: normal;
    }

    .nw-stack__legend {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
    }

    .nw-stack__item {
        flex-direction: row;
        justify-content: space-between;
        gap: 12px;
    }

    .nw-evolution__head {
        flex-wrap: wrap;
    }
}
</style>
