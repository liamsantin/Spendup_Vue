<script setup lang="ts">
/**
 * Positions d'un compte de placement : chiffres clés (coût, valeur, plus-value latente) puis tableau éditorial.
 * Le cours est manuel : geste « mettre à jour le cours » par ligne (propriétaire seulement).
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CurrencyDollarIcon, PencilIcon } from 'vue-tabler-icons';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import type { Account } from '@/features/accounts/types';
import {
    formatCalendarDate,
    formatGainPct,
    formatMoney,
    formatPrice,
    formatQuantity,
    formatSignedMoney,
    totalGainPct
} from '@/features/investments/format';
import type { Instrument, Position, PositionsResult } from '@/features/investments/types';

const props = withDefaults(
    defineProps<{
        result: PositionsResult | null;
        account: Pick<Account, 'publicId' | 'currency'>;
        acting?: boolean;
        canWrite?: boolean;
        loading?: boolean;
        includeClosed?: boolean;
    }>(),
    {
        acting: false,
        canWrite: false,
        loading: false,
        includeClosed: false
    }
);

const emit = defineEmits<{
    updatePrice: [instrument: Instrument];
    editInstrument: [instrument: Instrument];
    'update:includeClosed': [value: boolean];
}>();

const { t, locale } = useI18n();

const items = computed(() => props.result?.items ?? []);
const mixed = computed(() => !!props.result?.mixedCurrencies);

/** Devise des totaux : celle, unique, des positions ; sinon la devise du compte. */
const totalsCurrency = computed(() => items.value[0]?.instrument.currency ?? props.account.currency);

const showClosed = computed({
    get: () => props.includeClosed,
    set: (value: boolean) => emit('update:includeClosed', value)
});

function money(amount: number | null | undefined): string {
    if (mixed.value || amount == null) return t('common.emptyValue');
    return formatMoney(amount, totalsCurrency.value, locale.value);
}

const totalGain = computed(() => (mixed.value ? null : (props.result?.totalUnrealizedGain ?? null)));
const totalGainText = computed(() => {
    if (totalGain.value == null) return t('common.emptyValue');
    return formatSignedMoney(totalGain.value, totalsCurrency.value, locale.value);
});
const totalGainNote = computed(() => {
    if (!props.result || mixed.value) return null;
    const pct = totalGainPct(props.result);
    return pct == null ? null : formatGainPct(pct, locale.value);
});

function gainClass(value: number | null | undefined): string {
    if (value == null || value === 0) return '';
    return value > 0 ? 'su-pos' : 'su-neg';
}

function isClosed(position: Position): boolean {
    return position.quantity === 0;
}

function quoteDate(position: Position): string {
    return formatCalendarDate(position.instrument.lastPriceDate, locale.value);
}
</script>

<template>
    <section class="su-section positions">
        <header class="su-section__head positions__head">
            <h2>{{ t('investmentsPage.positions.title') }}</h2>
            <label class="positions__closed" :class="{ 'is-active': includeClosed }">
                <AppSwitch v-model="showClosed" :aria-label="t('investmentsPage.positions.showClosed')" />
                <span>{{ t('investmentsPage.positions.showClosed') }}</span>
            </label>
        </header>

        <div class="su-figs positions__figs" role="group" :aria-label="t('investmentsPage.positions.figsLabel')">
            <div class="su-fig">
                <p class="su-fig__label">{{ t('investmentsPage.positions.costBasis') }}</p>
                <p class="su-fig__num">{{ money(result?.totalCostBasis) }}</p>
            </div>
            <div class="su-fig">
                <p class="su-fig__label">{{ t('investmentsPage.positions.marketValue') }}</p>
                <p class="su-fig__num">{{ money(result?.totalMarketValue) }}</p>
            </div>
            <div class="su-fig">
                <p class="su-fig__label">{{ t('investmentsPage.positions.unrealizedGain') }}</p>
                <p class="su-fig__num" :class="gainClass(totalGain)">{{ totalGainText }}</p>
                <p v-if="totalGainNote" class="su-fig__note">{{ totalGainNote }}</p>
            </div>
        </div>
        <p v-if="mixed" class="positions__mixed">{{ t('investmentsPage.positions.mixedCurrencies') }}</p>

        <div v-if="loading && !result" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!items.length" class="su-empty">
            <p>{{ includeClosed ? t('investmentsPage.positions.emptyAll') : t('investmentsPage.positions.empty') }}</p>
        </div>
        <div v-else class="su-table-wrap positions__wrap">
            <table class="su-table positions__table">
                <thead>
                    <tr>
                        <th scope="col">{{ t('investmentsPage.positions.columns.instrument') }}</th>
                        <th scope="col" class="is-num">{{ t('investmentsPage.positions.columns.quantity') }}</th>
                        <th scope="col" class="is-num">{{ t('investmentsPage.positions.columns.averagePrice') }}</th>
                        <th scope="col" class="is-num">{{ t('investmentsPage.positions.columns.lastPrice') }}</th>
                        <th scope="col" class="is-num">{{ t('investmentsPage.positions.columns.marketValue') }}</th>
                        <th scope="col" class="is-num">{{ t('investmentsPage.positions.columns.gain') }}</th>
                        <th v-if="canWrite" scope="col" class="positions__actions-col">
                            <span class="positions__sr">{{ t('investmentsPage.positions.columns.actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="position in items" :key="position.instrument.publicId" :class="{ 'is-closed': isClosed(position) }">
                        <td>
                            <div class="positions__instrument">
                                <span class="positions__symbol">{{ position.instrument.symbol }}</span>
                                <span class="positions__name">{{ position.instrument.name }}</span>
                                <span class="positions__type">{{ t(`investmentsPage.instrumentTypes.${position.instrument.type}`) }}</span>
                            </div>
                        </td>
                        <td class="is-num">{{ formatQuantity(position.quantity, locale) }}</td>
                        <td class="is-num">{{ formatPrice(position.averagePrice, position.instrument.currency, locale) }}</td>
                        <td class="is-num">
                            <template v-if="position.hasQuote && position.instrument.lastPrice != null">
                                <span class="positions__price">{{
                                    formatPrice(position.instrument.lastPrice, position.instrument.currency, locale)
                                }}</span>
                                <span v-if="quoteDate(position)" class="positions__sub">{{ quoteDate(position) }}</span>
                            </template>
                            <span v-else class="positions__sub positions__noquote">{{ t('investmentsPage.positions.noQuote') }}</span>
                        </td>
                        <td class="is-num positions__strong">
                            {{ formatMoney(position.marketValue, position.instrument.currency, locale) }}
                        </td>
                        <td class="is-num">
                            <span class="positions__strong" :class="gainClass(position.unrealizedGain)">
                                {{ formatSignedMoney(position.unrealizedGain, position.instrument.currency, locale) }}
                            </span>
                            <span class="positions__sub">{{ formatGainPct(position.unrealizedGainPct, locale) }}</span>
                        </td>
                        <td v-if="canWrite">
                            <div class="positions__actions">
                                <button
                                    type="button"
                                    class="su-orb"
                                    :disabled="acting"
                                    :aria-label="t('investmentsPage.positions.updatePrice', { symbol: position.instrument.symbol })"
                                    :title="t('investmentsPage.positions.updatePrice', { symbol: position.instrument.symbol })"
                                    @click="emit('updatePrice', position.instrument)"
                                >
                                    <CurrencyDollarIcon :size="18" stroke-width="1.6" />
                                </button>
                                <button
                                    type="button"
                                    class="su-orb"
                                    :disabled="acting"
                                    :aria-label="t('investmentsPage.positions.editInstrument', { symbol: position.instrument.symbol })"
                                    :title="t('investmentsPage.positions.editInstrument', { symbol: position.instrument.symbol })"
                                    @click="emit('editInstrument', position.instrument)"
                                >
                                    <PencilIcon :size="18" stroke-width="1.6" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</template>

<style scoped>
.positions__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

/* interrupteur « positions soldées » : texte gris, 700 quand actif */
.positions__closed {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    color: var(--gray);
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    cursor: pointer;
}

.positions__closed.is-active {
    color: var(--ink);
    font-weight: 700;
}

.positions__closed :deep(.app-switch) {
    flex: none;
    transform: scale(0.82);
}

.positions__figs {
    margin-bottom: 8px;
}

/* devises mixtes : avertissement violet (alerte) */
.positions__mixed {
    margin: 8px 0 0;
    color: var(--violet-ink);
    font-size: 13px;
}

.positions__wrap {
    margin-top: 24px;
}

.positions__table td {
    white-space: nowrap;
}

.positions__instrument {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 160px;
    white-space: normal;
}

.positions__symbol {
    font-weight: 700;
}

.positions__name,
.positions__type,
.positions__sub {
    color: var(--gray);
    font-size: 13px;
}

.positions__sub {
    display: block;
}

.positions__noquote {
    white-space: normal;
}

.positions__price,
.positions__strong {
    font-weight: 700;
}

.positions__table tr.is-closed td {
    color: var(--gray);
}

.positions__actions-col {
    width: 1%;
}

.positions__actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
}

.positions__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

@media (max-width: 767px) {
    .positions__head {
        flex-wrap: wrap;
    }
}
</style>
