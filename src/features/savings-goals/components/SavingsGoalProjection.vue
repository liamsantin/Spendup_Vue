<script setup lang="ts">
/**
 * Projection d’épargne sur la fiche d’un objectif : montant de départ (déjà épargné), versement mensuel (rythme des trois
 * derniers mois, modifiable) et rendement annuel supposé (celui de l’objectif, modifiable). Le résultat se met à jour pendant
 * la saisie (calcul local, même méthode que l’API). Hypothèse : sans frais, impôts ni inflation. Rien n’est enregistré ici.
 */
defineOptions({ name: 'SavingsGoalProjection' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { parseAccountAmount } from '@/features/accounts/format';
import { COMPOUND_INTEREST_PATH } from '@/features/compound-interest/types';
import { savingsGoalsApi } from '@/features/savings-goals/api';
import SavingsProjectionChart from '@/features/savings-goals/components/SavingsProjectionChart.vue';
import { formatSavingsGoalAmount } from '@/features/savings-goals/format';
import {
    SAVINGS_PROJECTION_AMOUNT_MAX,
    SAVINGS_PROJECTION_MAX_YEARS,
    SAVINGS_PROJECTION_RATE_MAX,
    SAVINGS_PROJECTION_RATE_MIN,
    computeSavingsProjection
} from '@/features/savings-goals/projection';
import type { SavingsGoal } from '@/features/savings-goals/types';

const props = defineProps<{ goal: SavingsGoal }>();

const { t, locale } = useI18n();

const loaded = ref(false);
const loadFailed = ref(false);
const startAmount = ref(0);
const fromHistory = ref(true);
const monthlyText = ref('');
const rateText = ref('');
const years = ref(String(SAVINGS_PROJECTION_MAX_YEARS));

const yearItems = [1, 3, 5, 10].map((n) => ({ title: t('savingsGoalsPage.projection.yearsOption', { n }, n), value: String(n) }));

const monthly = computed(() => (monthlyText.value.trim() === '' ? 0 : parseAccountAmount(monthlyText.value)));
const rate = computed(() => (rateText.value.trim() === '' ? 0 : parseAccountAmount(rateText.value)));

const monthlyInvalid = computed(() => monthly.value === null || monthly.value < 0 || monthly.value > SAVINGS_PROJECTION_AMOUNT_MAX);
const rateInvalid = computed(
    () => rate.value === null || rate.value < SAVINGS_PROJECTION_RATE_MIN || rate.value > SAVINGS_PROJECTION_RATE_MAX
);
const anyInvalid = computed(() => monthlyInvalid.value || rateInvalid.value);

const points = computed(() => {
    if (anyInvalid.value || monthly.value === null || rate.value === null) return [];
    return computeSavingsProjection(startAmount.value, monthly.value, rate.value, Number(years.value));
});

const final = computed(() => points.value[points.value.length - 1] ?? null);

/** Calculateur d’intérêts composés avec les chiffres de la projection (versements mensuels, durée choisie, objectif). */
const calculatorLink = computed(() => {
    const query: Record<string, string> = { years: years.value, target: String(props.goal.targetAmount) };
    if (startAmount.value > 0) query.initial = String(startAmount.value);
    if (monthly.value !== null && monthly.value > 0) query.contribution = String(monthly.value);
    if (rate.value !== null && rate.value > 0) query.rate = String(rate.value);
    return { path: COMPOUND_INTEREST_PATH, query };
});
const money = (amount: number) => formatSavingsGoalAmount(amount, props.goal.currency, locale.value);

async function load() {
    loaded.value = false;
    loadFailed.value = false;
    try {
        const result = await savingsGoalsApi.projection(props.goal.publicId, { years: SAVINGS_PROJECTION_MAX_YEARS });
        startAmount.value = result.startAmount;
        fromHistory.value = result.monthlyFromHistory;
        monthlyText.value = String(result.monthlyContribution);
        rateText.value = props.goal.expectedReturnRate === null ? '' : String(result.annualRatePercent);
        loaded.value = true;
    } catch {
        loadFailed.value = true;
    }
}

watch(
    () => props.goal.publicId,
    () => void load(),
    { immediate: true }
);
</script>

<template>
    <section class="su-section sg-proj">
        <p v-if="loadFailed" class="sg-proj__muted">{{ t('savingsGoalsPage.projection.loadFailed') }}</p>

        <template v-else-if="loaded">
            <p class="sg-proj__muted">{{ t('savingsGoalsPage.projection.intro', { start: money(startAmount) }) }}</p>

            <div class="sg-proj__inputs">
                <div class="su-field">
                    <label for="sg-proj-monthly" class="su-field__label">{{ t('savingsGoalsPage.projection.monthlyLabel') }}</label>
                    <v-text-field
                        id="sg-proj-monthly"
                        v-model="monthlyText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :error="monthlyInvalid"
                    />
                    <p class="sg-proj__muted">
                        {{
                            fromHistory ? t('savingsGoalsPage.projection.monthlyHintHistory') : t('savingsGoalsPage.projection.monthlyHint')
                        }}
                    </p>
                </div>
                <div class="su-field">
                    <label for="sg-proj-rate" class="su-field__label">{{ t('savingsGoalsPage.projection.rateLabel') }}</label>
                    <v-text-field
                        id="sg-proj-rate"
                        v-model="rateText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        placeholder="0"
                        :error="rateInvalid"
                    />
                    <p class="sg-proj__muted">{{ t('savingsGoalsPage.projection.rateHint') }}</p>
                </div>
                <div class="su-field">
                    <label for="sg-proj-years" class="su-field__label">{{ t('savingsGoalsPage.projection.yearsLabel') }}</label>
                    <AppSelect id="sg-proj-years" v-model="years" :items="yearItems" hide-details />
                </div>
            </div>

            <p v-if="anyInvalid" class="sg-proj__error" role="alert">{{ t('savingsGoalsPage.projection.invalid') }}</p>

            <template v-else-if="final">
                <div class="su-figs sg-proj__figs">
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('savingsGoalsPage.projection.valueAfter', { n: final.year }, final.year) }}</p>
                        <p class="su-fig__num su-pos">{{ money(final.value) }}</p>
                    </div>
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('savingsGoalsPage.projection.contributed') }}</p>
                        <p class="su-fig__num">{{ money(final.contributed) }}</p>
                    </div>
                    <div class="su-fig">
                        <p class="su-fig__label">{{ t('savingsGoalsPage.projection.interest') }}</p>
                        <p class="su-fig__num">{{ money(final.interest) }}</p>
                    </div>
                </div>

                <SavingsProjectionChart :start-amount="startAmount" :points="points" :currency="goal.currency" :locale="locale" />
            </template>

            <RouterLink class="su-link" :to="calculatorLink">{{ t('savingsGoalsPage.projection.openCalculator') }}</RouterLink>

            <p class="sg-proj__muted">{{ t('savingsGoalsPage.projection.disclaimer') }}</p>
        </template>
    </section>
</template>

<style scoped>
.sg-proj {
    display: grid;
    gap: 16px;
    min-width: 0;
}

.sg-proj__muted {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.sg-proj__inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    align-items: start;
    gap: 16px;
}

.sg-proj__error {
    margin: 0;
    color: var(--danger);
    font-size: 13px;
}

.sg-proj__figs {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
</style>
