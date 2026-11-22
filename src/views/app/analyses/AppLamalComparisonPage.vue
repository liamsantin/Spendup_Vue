<script setup lang="ts">
/**
 * Page « Comparateur LAMal » : quelle franchise coûte le moins sur l'année, d'après les primes des devis et les frais de
 * santé prévus. Le résultat se met à jour pendant la saisie (calcul local, même formule que l'API). Estimation non
 * contractuelle ; franchises et quote-part viennent de l'API (paramètres légaux de l'année).
 */
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { compareRows } from '@/features/insurance/compare';
import { lamalApi, type LamalContext } from '@/features/insurance/lamal';
import { recurrenceDetailPath } from '@/features/recurring-payments/paths';
import { parseTaxAmount } from '@/features/tax/format';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

const PRIMINFO_URL = 'https://www.priminfo.admin.ch';
/** Repères de saisie (exemples, pas des montants légaux). */
const PRESETS = [
    { id: 'presetLow', amount: 300 },
    { id: 'presetMedium', amount: 1500 },
    { id: 'presetHigh', amount: 3000 }
] as const;

const { t, locale } = useI18n();
const settings = useUserSettingsStore();

const context = shallowRef<LamalContext | null>(null);
const loading = ref(true);
const failed = ref(false);

const premiums = ref<Record<number, string>>({});
const expected = ref('');
const current = ref<number | null>(null);

const hide = computed(() => settings.current.hideSensitiveAmounts);
const insuranceLink = computed(() =>
    context.value?.insurancePublicId ? recurrenceDetailPath('expense', context.value.insurancePublicId) : null
);

const costs = computed(() => parseTaxAmount(expected.value));
const costsInvalid = computed(() => costs.value !== null && (Number.isNaN(costs.value) || costs.value < 0));

function premiumOf(franchise: number): number | null {
    return parseTaxAmount(premiums.value[franchise] ?? '');
}
function premiumInvalid(franchise: number): boolean {
    const value = premiumOf(franchise);
    return value !== null && (Number.isNaN(value) || value <= 0);
}
const anyInvalid = computed(() => costsInvalid.value || (context.value?.franchises ?? []).some(premiumInvalid));

const options = computed(() => {
    if (!context.value || costsInvalid.value) return [];
    return compareRows(
        context.value,
        context.value.franchises.map((franchise) => ({ franchise, premium: premiumInvalid(franchise) ? null : premiumOf(franchise) })),
        costs.value ?? 0,
        current.value
    );
});
const optionOf = (franchise: number) => options.value.find((o) => o.franchise === franchise);
const best = computed(() => options.value.find((o) => o.isCheapest) ?? null);
const saving = computed(() => {
    const value = best.value?.savingVsCurrent ?? null;
    return value !== null && value > 0 ? value : null;
});
const comparedAgainstCurrent = computed(() => best.value !== null && best.value.savingVsCurrent !== null);

function money(amount: number): string {
    if (hide.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, (context.value?.currency ?? 'CHF') as Currency, locale.value);
}

function franchiseLabel(franchise: number): string {
    return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(franchise);
}

async function load() {
    loading.value = true;
    failed.value = false;
    try {
        const loaded = await lamalApi.context();
        context.value = loaded;
        premiums.value = Object.fromEntries(
            loaded.franchises.map((f) => [
                f,
                f === loaded.currentFranchise && loaded.currentMonthlyPremium ? String(loaded.currentMonthlyPremium) : ''
            ])
        );
        expected.value = loaded.expectedCosts !== null ? String(loaded.expectedCosts) : '';
        current.value = loaded.currentFranchise;
    } catch {
        failed.value = true;
    } finally {
        loading.value = false;
    }
}

onMounted(() => void load());
</script>

<template>
    <AppPageShell :title="t('lamalComparison.title')" :subtitle="t('lamalComparison.subtitle')">
        <div class="lamal">
            <div v-if="loading" class="su-loading"><span class="su-spin" /></div>
            <p v-else-if="failed || !context" class="lamal__muted">
                {{ t('lamalComparison.loadFailed') }}
                <button type="button" class="su-link" @click="load()">{{ t('common.retry') }}</button>
            </p>
            <template v-else>
                <p class="lamal__intro">
                    {{ t('lamalComparison.intro') }}
                    <a :href="PRIMINFO_URL" target="_blank" rel="noopener noreferrer" class="su-link">{{
                        t('lamalComparison.priminfoLink')
                    }}</a>
                </p>
                <p v-if="context.isFallback" class="lamal__muted">{{ t('lamalComparison.fallback', { year: context.legalYear }) }}</p>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('lamalComparison.stepCosts') }}</h2>
                    </header>
                    <div class="lamal__field">
                        <label for="lamal-expected">{{ t('lamalComparison.expectedLabel') }}</label>
                        <v-text-field
                            id="lamal-expected"
                            v-model="expected"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :error="costsInvalid"
                            :placeholder="t('lamalComparison.expectedPlaceholder')"
                        />
                    </div>
                    <div class="lamal__presets" role="group" :aria-label="t('lamalComparison.presetsLabel')">
                        <button
                            v-for="preset in PRESETS"
                            :key="preset.id"
                            type="button"
                            class="su-btn lamal__preset"
                            :class="{ 'is-on': costs === preset.amount }"
                            :aria-pressed="costs === preset.amount"
                            @click="expected = String(preset.amount)"
                        >
                            {{ t(`lamalComparison.${preset.id}`) }} · {{ franchiseLabel(preset.amount) }}
                        </button>
                    </div>
                    <p class="lamal__muted">
                        {{
                            context.expectedCostsYear
                                ? t('lamalComparison.expectedHint', { year: context.expectedCostsYear })
                                : t('lamalComparison.expectedHintNone')
                        }}
                    </p>
                </section>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('lamalComparison.stepPremiums') }}</h2>
                    </header>
                    <p class="lamal__muted">{{ t('lamalComparison.quotesHint') }}</p>
                    <p v-if="context.insuranceName" class="lamal__muted">
                        {{ t('lamalComparison.fromInsurance', { name: context.insuranceName }) }}
                        <RouterLink v-if="insuranceLink" :to="insuranceLink" class="su-link">{{
                            t('lamalComparison.seeInsurance')
                        }}</RouterLink>
                    </p>
                    <p v-else class="lamal__muted">{{ t('lamalComparison.noInsurance') }}</p>

                    <div class="lamal__table-wrap">
                        <table class="lamal__table">
                            <thead>
                                <tr>
                                    <th scope="col">{{ t('lamalComparison.colMine') }}</th>
                                    <th scope="col">{{ t('lamalComparison.colFranchise') }}</th>
                                    <th scope="col">{{ t('lamalComparison.colPremiumInput') }}</th>
                                    <th scope="col">{{ t('lamalComparison.colCost') }}</th>
                                    <th scope="col">{{ t('lamalComparison.colMax') }}</th>
                                    <th scope="col">{{ t('lamalComparison.colSaving') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="franchise in context.franchises"
                                    :key="franchise"
                                    :class="{ 'is-best': optionOf(franchise)?.isCheapest }"
                                >
                                    <td class="lamal__center">
                                        <input
                                            v-model="current"
                                            type="radio"
                                            name="lamal-current"
                                            :value="franchise"
                                            :aria-label="
                                                t('lamalComparison.franchise', { amount: franchiseLabel(franchise) }) +
                                                ' — ' +
                                                t('lamalComparison.colMine')
                                            "
                                        />
                                    </td>
                                    <th scope="row">
                                        {{ franchiseLabel(franchise) }}
                                        <span v-if="optionOf(franchise)?.isCheapest" class="lamal__tag is-best">{{
                                            t('lamalComparison.cheapestTag')
                                        }}</span>
                                    </th>
                                    <td class="lamal__input">
                                        <v-text-field
                                            v-model="premiums[franchise]"
                                            inputmode="decimal"
                                            color="primary"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            :error="premiumInvalid(franchise)"
                                            :aria-label="t('lamalComparison.premiumFor', { amount: franchiseLabel(franchise) })"
                                            :placeholder="t('lamalComparison.premiumPlaceholder')"
                                        />
                                    </td>
                                    <td>{{ optionOf(franchise) ? money(optionOf(franchise)!.expectedCost) : '—' }}</td>
                                    <td>{{ optionOf(franchise) ? money(optionOf(franchise)!.maxCost) : '—' }}</td>
                                    <td>
                                        {{
                                            optionOf(franchise)?.savingVsCurrent != null
                                                ? money(optionOf(franchise)!.savingVsCurrent!)
                                                : '—'
                                        }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <label class="lamal__none">
                        <input v-model="current" type="radio" name="lamal-current" :value="null" />
                        {{ t('lamalComparison.currentNone') }}
                    </label>
                    <p v-if="anyInvalid" class="lamal__error" role="alert">{{ t('lamalComparison.invalid') }}</p>
                </section>

                <section class="su-section" aria-live="polite">
                    <header class="su-section__head">
                        <h2>{{ t('lamalComparison.stepResult') }}</h2>
                    </header>
                    <p v-if="!best" class="lamal__muted">{{ t('lamalComparison.waiting') }}</p>
                    <template v-else>
                        <p class="lamal__reco">
                            <strong>{{ t('lamalComparison.recommended', { amount: franchiseLabel(best.franchise) }) }}</strong>
                            <span v-if="saving !== null"> — {{ t('lamalComparison.saving', { amount: money(saving) }) }}</span>
                            <span v-else-if="comparedAgainstCurrent"> — {{ t('lamalComparison.alreadyBest') }}</span>
                        </p>
                        <p class="lamal__muted">{{ t('lamalComparison.worstCase', { amount: money(best.maxCost) }) }}</p>
                        <p v-if="options.length < 2" class="lamal__muted">{{ t('lamalComparison.incomplete') }}</p>
                    </template>
                    <p class="lamal__muted">
                        {{ t('lamalComparison.formula', { rate: context.quotePartRate, max: money(context.quotePartMax) }) }}
                    </p>
                </section>

                <section class="su-section">
                    <header class="su-section__head">
                        <h2>{{ t('lamalComparison.howTitle') }}</h2>
                    </header>
                    <ul class="lamal__how">
                        <li>{{ t('lamalComparison.howCost') }}</li>
                        <li>{{ t('lamalComparison.howNotCounted') }}</li>
                        <li>{{ t('lamalComparison.howQuotes') }}</li>
                        <li>{{ t('lamalComparison.howChange') }}</li>
                    </ul>
                    <p class="lamal__muted">{{ t('lamalComparison.estimateNote') }}</p>
                </section>
            </template>
        </div>
    </AppPageShell>
</template>

<style scoped>
.lamal {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

.lamal__intro {
    margin: 0;
    max-width: 44rem;
}

.lamal__muted {
    margin: 0;
    color: var(--gray);
    font-size: 0.875rem;
}

.lamal__field {
    display: grid;
    gap: 4px;
    max-width: 24rem;
    margin-bottom: 8px;
    font-size: 0.875rem;
}

.lamal__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

.lamal__preset.is-on {
    border-color: var(--blue);
    color: var(--blue);
}

.lamal__tag {
    margin-left: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--t-gray-bg);
    color: var(--gray);
    font-size: 0.75rem;
    font-weight: 400;
}

.lamal__tag.is-best {
    background: var(--blue);
    color: #fff;
}

.lamal__reco {
    margin: 0 0 4px;
}

.lamal__table-wrap {
    overflow-x: auto;
}

.lamal__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
}

.lamal__table th,
.lamal__table td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    text-align: right;
    white-space: nowrap;
}

.lamal__table th:first-child,
.lamal__table .lamal__center {
    text-align: center;
}

.lamal__table th[scope='row'],
.lamal__table th[scope='col']:nth-child(2) {
    text-align: left;
}

.lamal__table tr.is-best {
    background: var(--t-gray-bg);
}

.lamal__input {
    min-width: 8rem;
}

.lamal__none {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: var(--gray);
    font-size: 0.875rem;
}

.lamal__how {
    display: grid;
    gap: 8px;
    margin: 0 0 8px;
    padding-left: 1.25rem;
    color: var(--gray);
    font-size: 0.875rem;
}

.lamal__error {
    margin: 8px 0 0;
    color: var(--red, #c0392b);
    font-size: 0.875rem;
}
</style>
