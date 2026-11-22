<script setup lang="ts">
/**
 * Page « Calculateur de remboursement » : durée, total remboursé et coût des intérêts pour un capital, un taux annuel et
 * une mensualité. Le résultat se met à jour pendant la saisie (calcul local, même méthode que l'API). Les champs peuvent
 * être préremplis depuis une dette (`?passif=<publicId>` ou la liste). Estimation, rien n'est enregistré.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { liabilitiesApi } from '@/features/liabilities/api';
import { simulateRepayment } from '@/features/liabilities/repayment';
import type { Liability } from '@/features/liabilities/types';
import { parseTaxAmount } from '@/features/tax/format';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

const { t, locale } = useI18n();
const route = useRoute();
const settings = useUserSettingsStore();

const debts = ref<Liability[]>([]);
const loadFailed = ref(false);
const selected = ref<string | null>(null);

const principalText = ref('');
const rateText = ref('');
const paymentText = ref('');

const hide = computed(() => settings.current.hideSensitiveAmounts);
const currency = computed<Currency>(() => (debts.value.find((d) => d.publicId === selected.value)?.currency ?? 'CHF') as Currency);

const principal = computed(() => parseTaxAmount(principalText.value));
const payment = computed(() => parseTaxAmount(paymentText.value));
/** Taux vide = 0 % (prêt sans intérêt). */
const rate = computed(() => parseTaxAmount(rateText.value) ?? 0);

const principalInvalid = computed(() => principal.value !== null && !(principal.value > 0));
const paymentInvalid = computed(() => payment.value !== null && !(payment.value > 0));
const rateInvalid = computed(() => !(rate.value >= 0 && rate.value <= 100));
const anyInvalid = computed(() => principalInvalid.value || paymentInvalid.value || rateInvalid.value);

const result = computed(() => {
    if (principal.value === null || payment.value === null || anyInvalid.value) return null;
    return simulateRepayment({ principal: principal.value, annualRatePercent: rate.value, monthlyPayment: payment.value });
});

const interestShare = computed(() => {
    const r = result.value;
    return r?.totalPaid && r.totalInterest !== null ? Math.round((r.totalInterest / r.totalPaid) * 100) : null;
});

function money(amount: number): string {
    if (hide.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, currency.value, locale.value);
}

function duration(months: number): string {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const parts: string[] = [];
    if (years > 0) parts.push(t('repaymentSimulator.years', { n: years }, years));
    if (rest > 0) parts.push(t('repaymentSimulator.months', { n: rest }, rest));
    return parts.join(' ');
}

const debtItems = computed(() => [
    { title: t('repaymentSimulator.fromDebtNone'), value: '' },
    ...debts.value.map((d) => ({ title: d.name, value: d.publicId }))
]);

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Capital restant et taux de la dette ; mensualité estimée = part de capital + intérêts du premier mois, si connue. */
function applyDebt(publicId: string | null) {
    selected.value = publicId;
    const debt = debts.value.find((d) => d.publicId === publicId);
    if (!debt) return;
    principalText.value = debt.remainingAmount > 0 ? String(debt.remainingAmount) : '';
    rateText.value = debt.interestRate !== null ? String(debt.interestRate) : '';
    const interest = (debt.remainingAmount * (debt.interestRate ?? 0)) / 1200;
    paymentText.value = debt.amortizationPerDue && debt.amortizationPerDue > 0 ? String(round2(debt.amortizationPerDue + interest)) : '';
}

async function load() {
    try {
        const list = await liabilitiesApi.list({ status: 'active' });
        debts.value = list.items.filter((d) => d.remainingAmount > 0);
        const wanted = typeof route.query.passif === 'string' ? route.query.passif : null;
        if (wanted && debts.value.some((d) => d.publicId === wanted)) applyDebt(wanted);
    } catch {
        loadFailed.value = true;
    }
}

onMounted(() => void load());
</script>

<template>
    <AppPageShell :title="t('repaymentSimulator.title')" :subtitle="t('repaymentSimulator.subtitle')">
        <div class="repay">
            <p class="repay__intro">{{ t('repaymentSimulator.intro') }}</p>

            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('repaymentSimulator.stepInputs') }}</h2>
                </header>

                <div v-if="debts.length" class="su-field repay__field">
                    <label for="repay-debt" class="su-field__label">{{ t('repaymentSimulator.fromDebt') }}</label>
                    <AppSelect
                        id="repay-debt"
                        :model-value="selected ?? ''"
                        :items="debtItems"
                        hide-details
                        @update:model-value="(value: string) => applyDebt(value || null)"
                    />
                    <p class="repay__muted">{{ t('repaymentSimulator.fromDebtHint') }}</p>
                </div>
                <p v-else-if="loadFailed" class="repay__muted">{{ t('repaymentSimulator.loadFailed') }}</p>

                <div class="su-field repay__field">
                    <label for="repay-principal" class="su-field__label">{{ t('repaymentSimulator.principalLabel') }}</label>
                    <v-text-field
                        id="repay-principal"
                        v-model="principalText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :error="principalInvalid"
                    />
                </div>
                <div class="su-field repay__field">
                    <label for="repay-rate" class="su-field__label">{{ t('repaymentSimulator.rateLabel') }}</label>
                    <v-text-field
                        id="repay-rate"
                        v-model="rateText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        placeholder="0"
                        :error="rateInvalid"
                    />
                    <p class="repay__muted">{{ t('repaymentSimulator.rateHint') }}</p>
                </div>
                <div class="su-field repay__field">
                    <label for="repay-payment" class="su-field__label">{{ t('repaymentSimulator.paymentLabel') }}</label>
                    <v-text-field
                        id="repay-payment"
                        v-model="paymentText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :error="paymentInvalid"
                    />
                </div>
                <p v-if="anyInvalid" class="repay__error" role="alert">{{ t('repaymentSimulator.invalid') }}</p>
            </section>

            <section class="su-section" aria-live="polite">
                <header class="su-section__head">
                    <h2>{{ t('repaymentSimulator.stepResult') }}</h2>
                </header>
                <p v-if="!result" class="repay__muted">{{ t('repaymentSimulator.waiting') }}</p>
                <div v-else-if="result.status === 'neverRepaid'" class="su-box su-box--soft repay__box">
                    <p>
                        <strong>{{ t('repaymentSimulator.neverRepaid', { interest: money(result.firstMonthInterest) }) }}</strong>
                    </p>
                    <p class="repay__muted">{{ t('repaymentSimulator.neverRepaidHint', { minimum: money(result.minimumPayment) }) }}</p>
                </div>
                <div v-else-if="result.status === 'tooLong'" class="su-box su-box--soft repay__box">
                    <p>
                        <strong>{{ t('repaymentSimulator.tooLong') }}</strong>
                    </p>
                    <p class="repay__muted">{{ t('repaymentSimulator.neverRepaidHint', { minimum: money(result.minimumPayment) }) }}</p>
                </div>
                <template v-else>
                    <div class="su-box su-box--soft repay__box">
                        <p>
                            <strong>{{ t('repaymentSimulator.duration', { duration: duration(result.months ?? 0) }) }}</strong>
                        </p>
                    </div>
                    <div class="su-figs repay__figs">
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('repaymentSimulator.totalPaid') }}</p>
                            <p class="su-fig__num">{{ money(result.totalPaid ?? 0) }}</p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('repaymentSimulator.totalInterest') }}</p>
                            <p class="su-fig__num">{{ money(result.totalInterest ?? 0) }}</p>
                            <p v-if="interestShare !== null" class="su-fig__note">
                                {{ t('repaymentSimulator.interestShare', { share: interestShare }) }}
                            </p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('repaymentSimulator.lastPayment') }}</p>
                            <p class="su-fig__num">{{ money(result.lastPayment ?? 0) }}</p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('repaymentSimulator.firstInterest') }}</p>
                            <p class="su-fig__num">{{ money(result.firstMonthInterest) }}</p>
                        </div>
                    </div>
                </template>
            </section>

            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('repaymentSimulator.howTitle') }}</h2>
                </header>
                <ul class="repay__how">
                    <li>{{ t('repaymentSimulator.howMonthly') }}</li>
                    <li>{{ t('repaymentSimulator.howLast') }}</li>
                    <li>{{ t('repaymentSimulator.howNotCounted') }}</li>
                </ul>
                <p class="repay__muted">{{ t('repaymentSimulator.estimateNote') }}</p>
            </section>
        </div>
    </AppPageShell>
</template>

<style scoped>
.repay {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
}

.repay__intro {
    margin: 0;
    max-width: 44rem;
    font-size: 14px;
    line-height: 1.5;
}

.repay__muted {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.repay__field {
    max-width: 24rem;
    margin-bottom: 12px;
}

.repay__box {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
}

.repay__box p {
    margin: 0;
}

.repay__figs {
    margin-bottom: 12px;
}

.repay__how {
    display: grid;
    gap: 8px;
    margin: 0 0 12px;
    padding-left: 1.25rem;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.repay__error {
    margin: 8px 0 0;
    color: var(--danger);
    font-size: 13px;
}
</style>
