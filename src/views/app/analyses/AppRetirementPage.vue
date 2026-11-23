<script setup lang="ts">
/**
 * Page « Simulateur retraite » : compare les rentes connues (extrait AVS, certificat LPP, avoirs 3a) au train de vie actuel.
 * Le calcul est fait par l’API (`POST /api/retirement/simulate`) à chaque modification ; la saisie peut être enregistrée (un
 * profil par utilisateur). Estimation sans valeur légale : les caisses AVS et LPP font foi.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { legalParametersApi as legalApi } from '@/features/aids/api';
import { retirementApi } from '@/features/retirement/api';
import { retirementInputIssue } from '@/features/retirement/calculator';
import {
    RETIREMENT_DEFAULT_SPREAD_YEARS,
    RETIREMENT_GENDERS,
    type RetirementGender,
    type RetirementInput,
    type RetirementResult
} from '@/features/retirement/types';
import { parseTaxAmount } from '@/features/tax/format';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t, locale } = useI18n();
const settings = useUserSettingsStore();

const birthYearText = ref('');
const gender = ref<RetirementGender>('male');
const avsText = ref('');
const lppMode = ref<'pension' | 'capital'>('pension');
const lppPensionText = ref('');
const lppCapitalText = ref('');
const lppRateText = ref('');
const lppRatePlaceholder = ref('');
const pillar3aText = ref('');
/** Solde des comptes 3a, connu s'il y en a au moins un en CHF. */
const pillar3aBalance = ref<{ total: number; accountCount: number; otherCurrencyCount: number } | null>(null);
const spreadText = ref(String(RETIREMENT_DEFAULT_SPREAD_YEARS));
const expensesText = ref('');
const returnText = ref('');

const result = ref<RetirementResult | null>(null);
const apiError = ref<string | null>(null);
const hasProfile = ref(false);
const busy = ref(false);
const confirmingDelete = ref(false);
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null);

const hide = computed(() => settings.current.hideSensitiveAmounts);
const currency = computed<Currency>(() => (result.value?.currency ?? settings.current.defaultCurrency) as Currency);

/** Champ vide = 0, valeur illisible = NaN (refusée par la validation). */
function amountOf(text: string): number {
    if (text.trim() === '') return 0;
    return parseTaxAmount(text) ?? Number.NaN;
}

const input = computed<RetirementInput>(() => ({
    birthYear: birthYearText.value.trim() === '' ? 0 : Number(birthYearText.value),
    gender: gender.value,
    avsMonthlyPension: amountOf(avsText.value),
    lppAnnualPension: lppMode.value === 'pension' ? amountOf(lppPensionText.value) : 0,
    lppCapital: lppMode.value === 'capital' ? amountOf(lppCapitalText.value) : 0,
    lppConversionRatePercent: lppMode.value === 'capital' ? amountOf(lppRateText.value) : 0,
    pillar3aCapital: amountOf(pillar3aText.value),
    pillar3aSpreadYears: spreadText.value.trim() === '' ? null : Number(spreadText.value),
    monthlyExpensesOverride: expensesText.value.trim() === '' ? null : amountOf(expensesText.value),
    expectedReturnPercent: amountOf(returnText.value)
}));

const untouched = computed(() => birthYearText.value.trim() === '');
const hasIssue = computed(() => !untouched.value && retirementInputIssue(input.value, new Date()) !== null);

const genderItems = computed(() => RETIREMENT_GENDERS.map((value) => ({ title: t(`retirement.gender.${value}`), value })));
const lppModeItems = computed(() => [
    { title: t('retirement.lppMode.pension'), value: 'pension' },
    { title: t('retirement.lppMode.capital'), value: 'capital' }
]);

function money(amount: number): string {
    if (hide.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, currency.value, locale.value);
}

const asText = (value: number): string => (value === 0 ? '' : String(value));

function applyInput(i: RetirementInput) {
    birthYearText.value = String(i.birthYear);
    gender.value = i.gender;
    avsText.value = asText(i.avsMonthlyPension);
    if (i.lppAnnualPension === 0 && i.lppCapital > 0) {
        lppMode.value = 'capital';
        lppCapitalText.value = asText(i.lppCapital);
        lppRateText.value = asText(i.lppConversionRatePercent);
        lppPensionText.value = '';
    } else {
        lppMode.value = 'pension';
        lppPensionText.value = asText(i.lppAnnualPension);
        lppCapitalText.value = '';
        lppRateText.value = '';
    }
    pillar3aText.value = asText(i.pillar3aCapital);
    spreadText.value = i.pillar3aSpreadYears === null ? '' : String(i.pillar3aSpreadYears);
    expensesText.value = i.monthlyExpensesOverride === null ? '' : String(i.monthlyExpensesOverride);
    returnText.value = asText(i.expectedReturnPercent);
}

/* ── Calcul : on attend la fin de la frappe, et on ignore les réponses périmées ── */
let timer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;

async function simulate() {
    const mine = ++sequence;
    try {
        const next = await retirementApi.simulate(input.value);
        if (mine !== sequence) return;
        result.value = next;
        apiError.value = null;
    } catch (e: unknown) {
        if (mine !== sequence) return;
        result.value = null;
        apiError.value = getErrorMessage(e) || t('retirement.simulateFailed');
    }
}

watch(
    input,
    () => {
        clearTimeout(timer);
        sequence++;
        if (untouched.value || hasIssue.value) {
            result.value = null;
            apiError.value = null;
            return;
        }
        timer = setTimeout(() => void simulate(), 350);
    },
    { deep: true }
);

onBeforeUnmount(() => clearTimeout(timer));

function usePillar3aBalance() {
    if (pillar3aBalance.value) pillar3aText.value = asText(pillar3aBalance.value.total);
}

onMounted(async () => {
    retirementApi
        .pillar3aBalance()
        .then((balance) => {
            pillar3aBalance.value = balance.accountCount > 0 ? balance : null;
        })
        .catch(() => {
            /* Sans solde, le champ reste une saisie libre. */
        });
    /* Taux minimal légal LPP (M0) affiché en exemple dans le champ : jamais écrit en dur. */
    legalApi
        .get()
        .then((legal) => {
            const rate = legal.items.find((item) => item.key === 'lppMinConversionRate')?.value;
            lppRatePlaceholder.value = rate == null ? '' : String(rate);
        })
        .catch(() => {
            /* Sans paramètres légaux, le champ n'a pas d'exemple. */
        });
    try {
        const profile = await retirementApi.getProfile();
        if (profile.input) {
            hasProfile.value = true;
            applyInput(profile.input);
        }
    } catch {
        /* Profil illisible : la page reste utilisable avec une saisie vide. */
    }
});

async function save() {
    message.value = null;
    if (untouched.value || hasIssue.value) return;
    busy.value = true;
    try {
        await retirementApi.saveProfile(input.value);
        hasProfile.value = true;
        message.value = { kind: 'ok', text: t('retirement.savedOk') };
    } catch (e: unknown) {
        message.value = { kind: 'error', text: getErrorMessage(e) || t('retirement.saveFailed') };
    } finally {
        busy.value = false;
    }
}

async function remove() {
    if (!confirmingDelete.value) {
        confirmingDelete.value = true;
        return;
    }
    busy.value = true;
    try {
        await retirementApi.removeProfile();
        hasProfile.value = false;
        message.value = { kind: 'ok', text: t('retirement.deletedOk') };
    } catch (e: unknown) {
        message.value = { kind: 'error', text: getErrorMessage(e) || t('retirement.saveFailed') };
    } finally {
        confirmingDelete.value = false;
        busy.value = false;
    }
}

const coveragePercent = computed(() => {
    const rate = result.value?.coverageRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
});

const ageText = computed(() => {
    const age = result.value?.referenceAge;
    if (!age) return '';
    return age.extraMonths > 0
        ? t('retirement.ageWithMonths', { years: age.years, months: age.extraMonths })
        : t('retirement.ageYears', { years: age.years });
});
</script>

<template>
    <AppPageShell :title="t('retirement.title')" :subtitle="t('retirement.subtitle')">
        <div class="retire">
            <p class="retire__intro">{{ t('retirement.intro') }}</p>
            <p class="retire__notice" role="note">{{ t('retirement.estimateNote') }}</p>

            <!-- ── 1. Votre situation ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('retirement.stepPerson') }}</h2>
                </header>
                <div class="retire__grid">
                    <div class="su-field">
                        <label for="retire-birth" class="su-field__label">{{ t('retirement.birthYearLabel') }}</label>
                        <v-text-field
                            id="retire-birth"
                            v-model="birthYearText"
                            inputmode="numeric"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="1970"
                        />
                    </div>
                    <div class="su-field">
                        <label for="retire-gender" class="su-field__label">{{ t('retirement.genderLabel') }}</label>
                        <AppSelect id="retire-gender" v-model="gender" :items="genderItems" hide-details />
                        <p class="retire__muted">{{ t('retirement.genderHint') }}</p>
                    </div>
                </div>
            </section>

            <!-- ── 2. Vos rentes connues ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('retirement.stepPensions') }}</h2>
                </header>
                <div class="retire__grid">
                    <div class="su-field">
                        <label for="retire-avs" class="su-field__label">{{ t('retirement.avsLabel') }}</label>
                        <v-text-field
                            id="retire-avs"
                            v-model="avsText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                        />
                        <p class="retire__muted">{{ t('retirement.avsHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="retire-lpp-mode" class="su-field__label">{{ t('retirement.lppModeLabel') }}</label>
                        <AppSelect id="retire-lpp-mode" v-model="lppMode" :items="lppModeItems" hide-details />
                    </div>
                    <div v-if="lppMode === 'pension'" class="su-field">
                        <label for="retire-lpp-pension" class="su-field__label">{{ t('retirement.lppPensionLabel') }}</label>
                        <v-text-field
                            id="retire-lpp-pension"
                            v-model="lppPensionText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                        />
                        <p class="retire__muted">{{ t('retirement.lppPensionHint') }}</p>
                    </div>
                    <template v-else>
                        <div class="su-field">
                            <label for="retire-lpp-capital" class="su-field__label">{{ t('retirement.lppCapitalLabel') }}</label>
                            <v-text-field
                                id="retire-lpp-capital"
                                v-model="lppCapitalText"
                                inputmode="decimal"
                                color="primary"
                                variant="outlined"
                                hide-details
                                :suffix="currency"
                            />
                            <p class="retire__muted">{{ t('retirement.lppCapitalHint') }}</p>
                        </div>
                        <div class="su-field">
                            <label for="retire-lpp-rate" class="su-field__label">{{ t('retirement.lppRateLabel') }}</label>
                            <v-text-field
                                id="retire-lpp-rate"
                                v-model="lppRateText"
                                inputmode="decimal"
                                color="primary"
                                variant="outlined"
                                hide-details
                                :placeholder="lppRatePlaceholder"
                            />
                            <p class="retire__muted">{{ t('retirement.lppRateHint') }}</p>
                        </div>
                    </template>
                    <div class="su-field">
                        <label for="retire-3a" class="su-field__label">{{ t('retirement.pillar3aLabel') }}</label>
                        <v-text-field
                            id="retire-3a"
                            v-model="pillar3aText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                        />
                        <p class="retire__muted">{{ t('retirement.pillar3aHint') }}</p>
                        <p v-if="pillar3aBalance" class="retire__muted">
                            <button type="button" class="su-link" @click="usePillar3aBalance()">
                                {{ t('retirement.pillar3aUseBalance', { amount: money(pillar3aBalance.total) }) }}
                            </button>
                            <template v-if="pillar3aBalance.otherCurrencyCount > 0">
                                {{
                                    t(
                                        'retirement.pillar3aOtherCurrency',
                                        { count: pillar3aBalance.otherCurrencyCount },
                                        pillar3aBalance.otherCurrencyCount
                                    )
                                }}
                            </template>
                        </p>
                    </div>
                    <div class="su-field">
                        <label for="retire-spread" class="su-field__label">{{ t('retirement.spreadLabel') }}</label>
                        <v-text-field
                            id="retire-spread"
                            v-model="spreadText"
                            inputmode="numeric"
                            color="primary"
                            variant="outlined"
                            hide-details
                        />
                        <p class="retire__muted">{{ t('retirement.spreadHint') }}</p>
                    </div>
                </div>

                <h3 class="retire__subhead">{{ t('retirement.optionsTitle') }}</h3>
                <div class="retire__grid">
                    <div class="su-field">
                        <label for="retire-expenses" class="su-field__label">{{ t('retirement.expensesLabel') }}</label>
                        <v-text-field
                            id="retire-expenses"
                            v-model="expensesText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :suffix="currency"
                            :placeholder="t('retirement.expensesPlaceholder')"
                        />
                        <p class="retire__muted">{{ t('retirement.expensesHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="retire-return" class="su-field__label">{{ t('retirement.returnLabel') }}</label>
                        <v-text-field
                            id="retire-return"
                            v-model="returnText"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            placeholder="0"
                        />
                        <p class="retire__muted">{{ t('retirement.returnHint') }}</p>
                    </div>
                </div>

                <p v-if="hasIssue" class="retire__error" role="alert">{{ t('retirement.issue') }}</p>
                <p v-else-if="apiError" class="retire__error" role="alert">{{ apiError }}</p>
            </section>

            <!-- ── 3. Le résultat ── -->
            <section class="su-section" aria-live="polite">
                <header class="su-section__head">
                    <h2>{{ t('retirement.stepResult') }}</h2>
                </header>

                <p v-if="!result" class="retire__muted">{{ t('retirement.waiting') }}</p>

                <template v-else>
                    <p class="retire__muted">
                        {{ t('retirement.referenceAge', { age: ageText }) }}
                        <template v-if="result.alreadyRetired"> {{ t('retirement.alreadyRetired') }}</template>
                    </p>

                    <ul v-if="result.warnings.length" class="retire__warnings">
                        <li v-for="code in result.warnings" :key="code">
                            {{
                                t(`retirement.warning.${code}`, {
                                    min: money(result.avsPensionMin),
                                    max: money(result.avsPensionMax),
                                    rate: result.lppMinConversionRatePercent
                                })
                            }}
                        </li>
                    </ul>

                    <div class="su-figs retire__figs">
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('retirement.totalMonthly') }}</p>
                            <p class="su-fig__num su-pos">{{ money(result.totalMonthly) }}</p>
                            <p class="su-fig__note">{{ t('retirement.totalNote') }}</p>
                        </div>
                        <div class="su-fig">
                            <p class="su-fig__label">{{ t('retirement.monthlyExpenses') }}</p>
                            <p class="su-fig__num">{{ money(result.monthlyExpenses) }}</p>
                            <p class="su-fig__note">
                                {{ t(`retirement.expensesSource.${result.expensesSource}`, { months: result.expensesMonthsUsed }) }}
                            </p>
                        </div>
                        <div v-if="result.monthlyExpenses > 0" class="su-fig">
                            <p class="su-fig__label">{{ result.gap > 0 ? t('retirement.shortfall') : t('retirement.surplus') }}</p>
                            <p class="su-fig__num" :class="result.gap > 0 ? 'su-neg' : 'su-pos'">{{ money(Math.abs(result.gap)) }}</p>
                            <p v-if="coveragePercent !== null" class="su-fig__note">
                                {{ t('retirement.coverage', { share: coveragePercent }) }}
                            </p>
                        </div>
                    </div>

                    <h3 class="retire__subhead">{{ t('retirement.breakdownTitle') }}</h3>
                    <div class="su-table-wrap">
                        <table class="su-table">
                            <tbody>
                                <tr>
                                    <td>{{ t('retirement.rowAvs') }}</td>
                                    <td class="is-num">{{ money(result.avsMonthly) }}</td>
                                </tr>
                                <tr>
                                    <td>{{ t('retirement.rowLpp') }}</td>
                                    <td class="is-num">{{ money(result.lppMonthly) }}</td>
                                </tr>
                                <tr>
                                    <td>{{ t('retirement.rowPillar3a', { years: result.input.pillar3aSpreadYears }) }}</td>
                                    <td class="is-num">{{ money(result.pillar3aMonthly) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <template v-if="result.savings">
                        <h3 class="retire__subhead">{{ t('retirement.savingsTitle') }}</h3>
                        <p class="retire__text">
                            {{
                                t('retirement.savingsCapital', {
                                    capital: money(result.savings.requiredCapital),
                                    years: result.input.pillar3aSpreadYears
                                })
                            }}
                        </p>
                        <p v-if="result.savings.monthlySavings !== null" class="retire__text">
                            {{
                                t('retirement.savingsMonthly', {
                                    amount: money(result.savings.monthlySavings),
                                    months: result.savings.monthsToRetirement,
                                    rate: result.savings.returnPercent
                                })
                            }}
                        </p>
                    </template>
                </template>
            </section>

            <!-- ── 4. Enregistrer ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('retirement.stepSave') }}</h2>
                </header>
                <p class="retire__muted">{{ t('retirement.saveHint') }}</p>
                <div class="retire__actions">
                    <button type="button" class="su-btn su-btn--ink" :disabled="busy || untouched || hasIssue" @click="save">
                        {{ hasProfile ? t('retirement.update') : t('retirement.save') }}
                    </button>
                    <template v-if="hasProfile">
                        <button type="button" class="su-btn su-btn--danger" :disabled="busy" @click="remove">
                            {{ confirmingDelete ? t('retirement.deleteConfirm') : t('retirement.delete') }}
                        </button>
                        <button v-if="confirmingDelete" type="button" class="su-link" @click="confirmingDelete = false">
                            {{ t('retirement.cancel') }}
                        </button>
                    </template>
                </div>
                <p v-if="message" :class="message.kind === 'error' ? 'retire__error' : 'retire__ok'" role="status">
                    {{ message.text }}
                </p>
            </section>

            <!-- ── Méthode ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('retirement.howTitle') }}</h2>
                </header>
                <ul class="retire__how">
                    <li>{{ t('retirement.howTotal') }}</li>
                    <li>{{ t('retirement.howExpenses') }}</li>
                    <li>{{ t('retirement.howSavings') }}</li>
                    <li>{{ t('retirement.howNotCounted') }}</li>
                </ul>
                <p class="retire__muted">{{ t('retirement.estimateNote') }}</p>
            </section>
        </div>
    </AppPageShell>
</template>

<style scoped>
.retire {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
}

.retire__intro {
    margin: 0;
    max-width: 44rem;
    font-size: 14px;
    line-height: 1.5;
}

.retire__notice {
    margin: 0;
    max-width: 44rem;
    padding: 10px 14px;
    border-left: 3px solid var(--gray);
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.retire__muted {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.retire__text {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.5;
}

.retire__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
    gap: 16px;
    margin-bottom: 16px;
}

.retire__subhead {
    margin: 24px 0 12px;
    font-size: 14px;
    font-weight: 700;
}

.retire__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    margin-bottom: 16px;
}

.retire__warnings {
    display: grid;
    gap: 6px;
    margin: 0 0 16px;
    padding-left: 1.25rem;
    color: var(--ink);
    font-size: 13px;
    line-height: 1.4;
}

.retire__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
}

.retire__how {
    display: grid;
    gap: 8px;
    margin: 0 0 12px;
    padding-left: 1.25rem;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.retire__error {
    margin: 8px 0 0;
    color: var(--danger);
    font-size: 13px;
}

.retire__ok {
    margin: 8px 0 0;
    color: var(--ink);
    font-size: 13px;
}
</style>
