<script setup lang="ts">
/**
 * Page « Calculateur d’intérêts composés » : valeur future d’un capital et de versements réguliers, avec rendement, frais et
 * inflation. Le résultat se met à jour pendant la saisie (calcul local, même méthode que l’API). Un calcul peut être enregistré
 * (nom + paramètres) puis repris plus tard. Hypothèse : sans impôts, ni garantie de rendement.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { compoundInterestApi } from '@/features/compound-interest/api';
import {
    computeCompoundInterest,
    compoundInputIssue,
    solveCompoundGoal,
    type CompoundGoalSolve
} from '@/features/compound-interest/calculator';
import {
    COMPOUNDINGS,
    COMPOUND_NAME_MAX,
    CONTRIBUTION_FREQUENCIES,
    type CompoundCalculation,
    type CompoundInterestRequest,
    type Compounding,
    type ContributionFrequency
} from '@/features/compound-interest/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import SavingsProjectionChart from '@/features/savings-goals/components/SavingsProjectionChart.vue';
import { parseTaxAmount } from '@/features/tax/format';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t, locale } = useI18n();
const route = useRoute();
const settings = useUserSettingsStore();

const saved = ref<CompoundCalculation[]>([]);
const loadFailed = ref(false);
const selectedId = ref('');
const name = ref('');
const busy = ref(false);
const confirmingDelete = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const initialText = ref('');
const contributionText = ref('');
const rateText = ref('');
const yearsText = ref('10');
const frequency = ref<ContributionFrequency>('monthly');
const timing = ref<'end' | 'start'>('end');
const growthText = ref('');
const compounding = ref<Compounding>('monthly');
const feeText = ref('');
const inflationText = ref('');
const targetText = ref('');
const goalNote = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const hide = computed(() => settings.current.hideSensitiveAmounts);
const selected = computed(() => saved.value.find((c) => c.publicId === selectedId.value) ?? null);
const currency = computed<Currency>(() => (selected.value?.currency ?? settings.current.defaultCurrency) as Currency);

/** Champ vide = 0, valeur illisible = NaN (refusée par `compoundInputIssue`). */
function amountOf(text: string): number {
    if (text.trim() === '') return 0;
    return parseTaxAmount(text) ?? Number.NaN;
}

const input = computed<CompoundInterestRequest>(() => ({
    initialAmount: amountOf(initialText.value),
    contributionAmount: amountOf(contributionText.value),
    annualRatePercent: amountOf(rateText.value),
    years: yearsText.value.trim() === '' ? 0 : Number(yearsText.value),
    contributionFrequency: frequency.value,
    contributionAtStart: timing.value === 'start',
    contributionGrowthPercent: amountOf(growthText.value),
    compounding: compounding.value,
    annualFeePercent: amountOf(feeText.value),
    inflationPercent: amountOf(inflationText.value)
}));

const untouched = computed(() => initialText.value.trim() === '' && contributionText.value.trim() === '');
const issue = computed(() => compoundInputIssue(input.value));
const result = computed(() => (issue.value ? null : computeCompoundInterest(input.value)));
const issueText = computed(() => {
    if (untouched.value) return null;
    if (issue.value) return t(`compoundInterest.issue.${issue.value}`);
    return result.value ? null : t('compoundInterest.issue.overflow');
});

const interestShare = computed(() => {
    const r = result.value;
    return r && r.finalValue > 0 ? Math.round((r.totalInterest / r.finalValue) * 100) : null;
});

const frequencyItems = computed(() =>
    CONTRIBUTION_FREQUENCIES.map((value) => ({ title: t(`compoundInterest.frequency.${value}`), value }))
);
const timingItems = computed(() => [
    { title: t('compoundInterest.timing.end'), value: 'end' },
    { title: t('compoundInterest.timing.start'), value: 'start' }
]);
const compoundingItems = computed(() => COMPOUNDINGS.map((value) => ({ title: t(`compoundInterest.compounding.${value}`), value })));
const savedItems = computed(() => [
    { title: t('compoundInterest.savedNone'), value: '' },
    ...saved.value.map((c) => ({ title: c.name, value: c.publicId }))
]);

function money(amount: number): string {
    if (hide.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, currency.value, locale.value);
}

const asText = (value: number): string => (value === 0 ? '' : String(value));

function applyCalculation(publicId: string) {
    selectedId.value = publicId;
    confirmingDelete.value = false;
    message.value = null;
    const calc = saved.value.find((c) => c.publicId === publicId);
    if (!calc) {
        name.value = '';
        return;
    }
    const i = calc.input;
    name.value = calc.name;
    initialText.value = asText(i.initialAmount);
    contributionText.value = asText(i.contributionAmount);
    rateText.value = asText(i.annualRatePercent);
    yearsText.value = String(i.years);
    frequency.value = i.contributionFrequency;
    timing.value = i.contributionAtStart ? 'start' : 'end';
    growthText.value = asText(i.contributionGrowthPercent);
    compounding.value = i.compounding;
    feeText.value = asText(i.annualFeePercent);
    inflationText.value = asText(i.inflationPercent);
}

async function loadSaved() {
    try {
        saved.value = (await compoundInterestApi.list()).items;
        loadFailed.value = false;
    } catch {
        loadFailed.value = true;
    }
}

async function save() {
    message.value = null;
    const label = name.value.trim();
    if (!label) {
        message.value = { kind: 'error', text: t('compoundInterest.nameRequired') };
        return;
    }
    if (!result.value) return;
    busy.value = true;
    try {
        const body = { name: label, input: input.value, currency: currency.value };
        const wasUpdate = !!selected.value;
        const calc = selected.value
            ? await compoundInterestApi.update(selected.value.publicId, body)
            : await compoundInterestApi.create(body);
        await loadSaved();
        selectedId.value = calc.publicId;
        message.value = { kind: 'ok', text: t(wasUpdate ? 'compoundInterest.updatedOk' : 'compoundInterest.savedOk') };
    } catch (e: unknown) {
        message.value = { kind: 'error', text: getErrorMessage(e) || t('compoundInterest.saveFailed') };
    } finally {
        busy.value = false;
    }
}

async function remove() {
    if (!selected.value) return;
    if (!confirmingDelete.value) {
        confirmingDelete.value = true;
        return;
    }
    busy.value = true;
    try {
        await compoundInterestApi.remove(selected.value.publicId);
        await loadSaved();
        selectedId.value = '';
        name.value = '';
        message.value = { kind: 'ok', text: t('compoundInterest.deletedOk') };
    } catch (e: unknown) {
        message.value = { kind: 'error', text: getErrorMessage(e) || t('compoundInterest.saveFailed') };
    } finally {
        confirmingDelete.value = false;
        busy.value = false;
    }
}

/** Montant visé : le bouton calcule le versement ou la durée qui manque et remplit le champ correspondant. */
function solveGoal(mode: CompoundGoalSolve) {
    goalNote.value = null;
    const target = amountOf(targetText.value);
    if (!(target > 0)) {
        goalNote.value = { kind: 'error', text: t('compoundInterest.goalInvalid') };
        return;
    }
    const solution = solveCompoundGoal(input.value, target, mode);
    if (!solution) {
        goalNote.value = {
            kind: 'error',
            text: issue.value ? t(`compoundInterest.issue.${issue.value}`) : t('compoundInterest.goalInvalid')
        };
        return;
    }
    const targetLabel = money(target);
    if (mode === 'contribution') {
        if (solution.contribution === null) {
            goalNote.value = { kind: 'error', text: t('compoundInterest.goalUnreachable') };
        } else if (solution.contribution === 0) {
            contributionText.value = '';
            goalNote.value = { kind: 'ok', text: t('compoundInterest.goalReached', { target: targetLabel }) };
        } else {
            contributionText.value = String(solution.contribution);
            goalNote.value = {
                kind: 'ok',
                text: t('compoundInterest.goalContribution', {
                    target: targetLabel,
                    years: t('compoundInterest.years', { n: input.value.years }, input.value.years),
                    amount: money(solution.contribution)
                })
            };
        }
        return;
    }
    if (solution.months === null) {
        goalNote.value = { kind: 'error', text: t('compoundInterest.goalUnreachable') };
        return;
    }
    const wholeYears = Math.floor(solution.months / 12);
    const restMonths = solution.months % 12;
    yearsText.value = String(Math.max(1, Math.ceil(solution.months / 12)));
    const duration =
        wholeYears === 0
            ? t('compoundInterest.durationMonthsOnly', { months: restMonths })
            : restMonths === 0
              ? t('compoundInterest.years', { n: wholeYears }, wholeYears)
              : t('compoundInterest.durationMonths', {
                    years: t('compoundInterest.years', { n: wholeYears }, wholeYears),
                    months: restMonths
                });
    goalNote.value = { kind: 'ok', text: t('compoundInterest.goalYears', { target: targetLabel, duration }) };
}

/** Lien depuis l’onglet Projection d’un objectif d’épargne : `?initial=&contribution=&rate=&years=&target=`. */
function applyQuery() {
    const read = (key: string): string => {
        const raw = route.query[key];
        const value = Array.isArray(raw) ? raw[0] : raw;
        return typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) ? value.trim() : '';
    };
    initialText.value = read('initial');
    contributionText.value = read('contribution');
    rateText.value = read('rate');
    targetText.value = read('target');
    const years = read('years');
    if (years && Number.isInteger(Number(years)) && Number(years) >= 1 && Number(years) <= 50) yearsText.value = years;
}

onMounted(() => {
    applyQuery();
    void loadSaved();
});
</script>

<template>
    <AppPageShell :title="t('compoundInterest.title')" :subtitle="t('compoundInterest.subtitle')">
        <div class="compound">
            <p class="compound__intro">{{ t('compoundInterest.intro') }}</p>

            <!-- ── 1. Paramètres ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('compoundInterest.stepInputs') }}</h2>
                </header>

                <div v-if="saved.length" class="su-field compound__field">
                    <label for="compound-saved" class="su-field__label">{{ t('compoundInterest.savedPick') }}</label>
                    <AppSelect
                        id="compound-saved"
                        :model-value="selectedId"
                        :items="savedItems"
                        hide-details
                        @update:model-value="(value: string) => applyCalculation(value)"
                    />
                    <p class="compound__muted">{{ t('compoundInterest.savedHint') }}</p>
                </div>
                <p v-else-if="loadFailed" class="compound__muted">{{ t('compoundInterest.loadFailed') }}</p>

                <div class="compound__grid">
                    <div class="su-field">
                        <label for="compound-initial" class="su-field__label">{{ t('compoundInterest.initialLabel') }}</label>
                        <v-text-field
                            id="compound-initial"
                            v-model="initialText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                        />
                    </div>
                    <div class="su-field">
                        <label for="compound-contribution" class="su-field__label">{{ t('compoundInterest.contributionLabel') }}</label>
                        <v-text-field
                            id="compound-contribution"
                            v-model="contributionText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                        />
                    </div>
                    <div class="su-field">
                        <label for="compound-frequency" class="su-field__label">{{ t('compoundInterest.frequencyLabel') }}</label>
                        <AppSelect id="compound-frequency" v-model="frequency" :items="frequencyItems" hide-details />
                    </div>
                    <div class="su-field">
                        <label for="compound-timing" class="su-field__label">{{ t('compoundInterest.timingLabel') }}</label>
                        <AppSelect id="compound-timing" v-model="timing" :items="timingItems" hide-details />
                    </div>
                    <div class="su-field">
                        <label for="compound-rate" class="su-field__label">{{ t('compoundInterest.rateLabel') }}</label>
                        <v-text-field
                            id="compound-rate"
                            v-model="rateText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="0"
                        />
                        <p class="compound__muted">{{ t('compoundInterest.rateHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="compound-years" class="su-field__label">{{ t('compoundInterest.yearsLabel') }}</label>
                        <v-text-field
                            id="compound-years"
                            v-model="yearsText"
                            inputmode="numeric"
                            color="primary"
                            variant="outlined"
                            hide-details
                        />
                        <p class="compound__muted">{{ t('compoundInterest.yearsHint') }}</p>
                    </div>
                </div>

                <h3 class="compound__subhead">{{ t('compoundInterest.goalTitle') }}</h3>
                <div class="su-field compound__field">
                    <label for="compound-target" class="su-field__label">{{ t('compoundInterest.goalLabel') }}</label>
                    <v-text-field
                        id="compound-target"
                        v-model="targetText"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :suffix="currency"
                    />
                    <p class="compound__muted">{{ t('compoundInterest.goalHint') }}</p>
                </div>
                <div class="compound__actions">
                    <button type="button" class="su-btn" @click="solveGoal('contribution')">
                        {{ t('compoundInterest.goalSolveContribution') }}
                    </button>
                    <button type="button" class="su-btn" @click="solveGoal('years')">
                        {{ t('compoundInterest.goalSolveYears') }}
                    </button>
                </div>
                <p v-if="goalNote" :class="goalNote.kind === 'error' ? 'compound__error' : 'compound__ok'" role="status">
                    {{ goalNote.text }}
                </p>

                <h3 class="compound__subhead">{{ t('compoundInterest.optionsTitle') }}</h3>
                <div class="compound__grid">
                    <div class="su-field">
                        <label for="compound-fee" class="su-field__label">{{ t('compoundInterest.feeLabel') }}</label>
                        <v-text-field
                            id="compound-fee"
                            v-model="feeText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="0"
                        />
                        <p class="compound__muted">{{ t('compoundInterest.feeHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="compound-inflation" class="su-field__label">{{ t('compoundInterest.inflationLabel') }}</label>
                        <v-text-field
                            id="compound-inflation"
                            v-model="inflationText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="0"
                        />
                        <p class="compound__muted">{{ t('compoundInterest.inflationHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="compound-growth" class="su-field__label">{{ t('compoundInterest.growthLabel') }}</label>
                        <v-text-field
                            id="compound-growth"
                            v-model="growthText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="0"
                        />
                        <p class="compound__muted">{{ t('compoundInterest.growthHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="compound-compounding" class="su-field__label">{{ t('compoundInterest.compoundingLabel') }}</label>
                        <AppSelect id="compound-compounding" v-model="compounding" :items="compoundingItems" hide-details />
                    </div>
                </div>

                <p v-if="issueText" class="compound__error" role="alert">{{ issueText }}</p>
            </section>

            <!-- ── 2. Résultat ── -->
            <section class="su-section" aria-live="polite">
                <header class="su-section__head">
                    <h2>{{ t('compoundInterest.stepResult') }}</h2>
                </header>

                <p v-if="!result" class="compound__muted">{{ t('compoundInterest.waiting') }}</p>

                <template v-else>
                    <div class="su-figs compound__figs">
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('compoundInterest.finalValue') }}</p>
                            <p class="su-fig__num su-pos">{{ money(result.finalValue) }}</p>
                            <p class="su-fig__note">
                                {{
                                    t('compoundInterest.finalValueNote', {
                                        years: t('compoundInterest.years', { n: input.years }, input.years)
                                    })
                                }}
                            </p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('compoundInterest.totalContributed') }}</p>
                            <p class="su-fig__num">{{ money(result.totalContributed) }}</p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('compoundInterest.totalInterest') }}</p>
                            <p class="su-fig__num">{{ money(result.totalInterest) }}</p>
                            <p v-if="interestShare !== null" class="su-fig__note">
                                {{ t('compoundInterest.interestShare', { share: interestShare }) }}
                            </p>
                        </div>
                        <div v-if="input.inflationPercent > 0" class="su-fig">
                            <p class="su-fig__label">{{ t('compoundInterest.realValue') }}</p>
                            <p class="su-fig__num">{{ money(result.finalRealValue) }}</p>
                            <p class="su-fig__note">{{ t('compoundInterest.realValueNote', { inflation: input.inflationPercent }) }}</p>
                        </div>
                        <div v-if="input.annualFeePercent > 0" class="su-fig">
                            <p class="su-fig__label">{{ t('compoundInterest.feeCost') }}</p>
                            <p class="su-fig__num">{{ money(result.feeCost) }}</p>
                            <p class="su-fig__note">{{ t('compoundInterest.feeCostNote') }}</p>
                        </div>
                    </div>

                    <SavingsProjectionChart
                        :start-amount="input.initialAmount"
                        :points="result.points"
                        :currency="currency"
                        :locale="locale"
                    />

                    <h3 class="compound__subhead">{{ t('compoundInterest.scenariosTitle') }}</h3>
                    <div class="su-table-wrap">
                        <table class="su-table">
                            <thead>
                                <tr>
                                    <th>{{ t('compoundInterest.scenarioRate') }}</th>
                                    <th class="is-num">{{ t('compoundInterest.scenarioFinal') }}</th>
                                    <th class="is-num">{{ t('compoundInterest.scenarioInterest') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="scenario in result.scenarios" :key="scenario.annualRatePercent">
                                    <td>
                                        {{ scenario.annualRatePercent }} %
                                        <span v-if="scenario.annualRatePercent === input.annualRatePercent" class="compound__muted">
                                            ({{ t('compoundInterest.scenarioCurrent') }})
                                        </span>
                                    </td>
                                    <td class="is-num">{{ money(scenario.finalValue) }}</td>
                                    <td class="is-num">{{ money(scenario.totalInterest) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 class="compound__subhead">{{ t('compoundInterest.tableTitle') }}</h3>
                    <div class="su-table-wrap">
                        <table class="su-table">
                            <thead>
                                <tr>
                                    <th>{{ t('compoundInterest.colYear') }}</th>
                                    <th class="is-num">{{ t('compoundInterest.colContributed') }}</th>
                                    <th class="is-num">{{ t('compoundInterest.colYearInterest') }}</th>
                                    <th class="is-num">{{ t('compoundInterest.colValue') }}</th>
                                    <th v-if="input.inflationPercent > 0" class="is-num">{{ t('compoundInterest.colReal') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="point in result.points" :key="point.year">
                                    <td>{{ point.year }}</td>
                                    <td class="is-num">{{ money(point.contributed) }}</td>
                                    <td class="is-num">{{ money(point.yearInterest) }}</td>
                                    <td class="is-num">{{ money(point.value) }}</td>
                                    <td v-if="input.inflationPercent > 0" class="is-num">{{ money(point.realValue) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </section>

            <!-- ── 3. Enregistrer ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('compoundInterest.stepSave') }}</h2>
                </header>
                <div class="su-field compound__field">
                    <label for="compound-name" class="su-field__label">{{ t('compoundInterest.nameLabel') }}</label>
                    <v-text-field
                        id="compound-name"
                        v-model="name"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :maxlength="COMPOUND_NAME_MAX"
                        :placeholder="t('compoundInterest.namePlaceholder')"
                    />
                    <p class="compound__muted">{{ t('compoundInterest.saveHint') }}</p>
                </div>
                <div class="compound__actions">
                    <button type="button" class="su-btn su-btn--ink" :disabled="busy || !result" @click="save">
                        {{ selected ? t('compoundInterest.update') : t('compoundInterest.save') }}
                    </button>
                    <template v-if="selected">
                        <button type="button" class="su-btn su-btn--danger" :disabled="busy" @click="remove">
                            {{ confirmingDelete ? t('compoundInterest.deleteConfirm') : t('compoundInterest.delete') }}
                        </button>
                        <button v-if="confirmingDelete" type="button" class="su-link" @click="confirmingDelete = false">
                            {{ t('compoundInterest.cancel') }}
                        </button>
                    </template>
                </div>
                <p v-if="message" :class="message.kind === 'error' ? 'compound__error' : 'compound__ok'" role="status">
                    {{ message.text }}
                </p>
            </section>

            <!-- ── Méthode ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('compoundInterest.howTitle') }}</h2>
                </header>
                <ul class="compound__how">
                    <li>{{ t('compoundInterest.howMonthly') }}</li>
                    <li>{{ t('compoundInterest.howContribution') }}</li>
                    <li>{{ t('compoundInterest.howNotCounted') }}</li>
                </ul>
                <p class="compound__muted">{{ t('compoundInterest.estimateNote') }}</p>
            </section>
        </div>
    </AppPageShell>
</template>

<style scoped>
.compound {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
}

.compound__intro {
    margin: 0;
    max-width: 44rem;
    font-size: 14px;
    line-height: 1.5;
}

.compound__muted {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.compound__field {
    max-width: 24rem;
    margin-bottom: 16px;
}

.compound__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
    gap: 16px;
    margin-bottom: 16px;
}

.compound__subhead {
    margin: 24px 0 12px;
    font-size: 14px;
    font-weight: 700;
}

.compound__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    margin-bottom: 16px;
}

.compound__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

.compound__how {
    display: grid;
    gap: 8px;
    margin: 0 0 12px;
    padding-left: 1.25rem;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.compound__error {
    margin: 8px 0 0;
    color: var(--danger);
    font-size: 13px;
}

.compound__ok {
    margin: 8px 0 0;
    color: var(--ink);
    font-size: 13px;
}
</style>
