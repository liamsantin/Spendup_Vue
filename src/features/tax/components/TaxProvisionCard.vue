<script setup lang="ts">
/**
 * Provision d'impôt mensuelle : « combien mettre de côté chaque mois ». Une estimation fondée sur la dernière décision de
 * taxation, ou sur un montant annuel saisi quand il n'y en a pas. L'application ne calcule aucun impôt.
 */
defineOptions({ name: 'TaxProvisionCard' });

import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import { DASHBOARD_MASKED_AMOUNT } from '@/features/dashboard/format';
import { parseTaxAmount } from '@/features/tax/format';
import { hasProvision, paidShare, taxProvisionApi, type TaxProvision } from '@/features/tax/provision';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

const props = withDefaults(defineProps<{ showHead?: boolean }>(), { showHead: true });

const { t, locale } = useI18n();
const settings = useUserSettingsStore();

const provision = shallowRef<TaxProvision | null>(null);
const loading = ref(true);
const failed = ref(false);
const saving = ref(false);
const draft = ref('');
const draftError = ref(false);

const hide = computed(() => settings.current.hideSensitiveAmounts);
const withDecision = computed(() => provision.value?.source === 'decision');

function money(amount: number): string {
    if (hide.value) return DASHBOARD_MASKED_AMOUNT;
    return formatAccountBalance(amount, (provision.value?.currency ?? 'CHF') as Currency, locale.value);
}

async function load() {
    loading.value = true;
    failed.value = false;
    try {
        provision.value = await taxProvisionApi.get();
        draft.value = provision.value.reference ? String(provision.value.reference) : '';
    } catch {
        failed.value = true;
    } finally {
        loading.value = false;
    }
}

async function save(amount: number | null) {
    saving.value = true;
    failed.value = false;
    try {
        provision.value = await taxProvisionApi.setReference(amount);
        draft.value = provision.value.reference ? String(provision.value.reference) : '';
    } catch {
        failed.value = true;
    } finally {
        saving.value = false;
    }
}

function submit() {
    const amount = parseTaxAmount(draft.value);
    draftError.value = Number.isNaN(amount) || (amount !== null && amount < 0);
    if (draftError.value) return;
    void save(amount);
}

onMounted(() => void load());
</script>

<template>
    <section class="provision su-box" :aria-label="t('taxProvision.title')">
        <header v-if="props.showHead" class="provision__head">
            <h2>{{ t('taxProvision.title') }}</h2>
            <p>{{ t('taxProvision.subtitle') }}</p>
        </header>

        <div v-if="loading" class="su-loading"><span class="su-spin" /></div>
        <p v-else-if="failed && !provision" class="provision__muted">
            {{ t('taxProvision.loadFailed') }}
            <button type="button" class="su-link" @click="load()">{{ t('common.retry') }}</button>
        </p>
        <template v-else-if="provision">
            <template v-if="hasProvision(provision)">
                <p class="provision__monthly">
                    <span class="su-fig__num">{{ money(provision.monthlyAmount ?? 0) }}</span>
                    <span class="provision__muted">{{ t('taxProvision.perMonth') }}</span>
                </p>
                <p class="provision__muted">
                    {{
                        withDecision
                            ? t('taxProvision.basisDecision', { year: provision.referenceYear, amount: money(provision.annualAmount ?? 0) })
                            : t('taxProvision.basisTyped', { amount: money(provision.annualAmount ?? 0) })
                    }}
                </p>
                <template v-if="withDecision">
                    <div
                        class="su-gauge"
                        role="progressbar"
                        :aria-label="t('taxProvision.paid')"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :aria-valuenow="Math.round(paidShare(provision) * 100)"
                    >
                        <span
                            class="su-gauge__fill su-gauge__fill--blue"
                            :style="{ width: `${Math.round(paidShare(provision) * 100)}%` }"
                        />
                    </div>
                    <p class="provision__muted">
                        {{ t('taxProvision.paidRemaining', { paid: money(provision.paid), remaining: money(provision.remaining) }) }}
                    </p>
                </template>
            </template>
            <p v-else class="provision__muted">{{ t('taxProvision.none') }}</p>

            <form v-if="!withDecision" class="provision__form" @submit.prevent="submit">
                <label for="tax-provision-reference" class="su-field__label">{{ t('taxProvision.referenceLabel') }}</label>
                <div class="provision__row">
                    <v-text-field
                        id="tax-provision-reference"
                        v-model="draft"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                        :error="draftError"
                        :placeholder="t('taxProvision.referencePlaceholder')"
                    />
                    <button type="submit" class="su-btn" :disabled="saving">{{ t('taxProvision.save') }}</button>
                    <button v-if="provision.reference" type="button" class="su-btn" :disabled="saving" @click="save(null)">
                        {{ t('taxProvision.clear') }}
                    </button>
                </div>
                <p v-if="draftError" class="provision__error" role="alert">{{ t('taxProvision.invalid') }}</p>
            </form>
            <p v-if="failed" class="provision__error" role="alert">{{ t('taxProvision.saveFailed') }}</p>

            <p class="provision__muted">{{ t('taxProvision.estimateNote') }}</p>
        </template>
    </section>
</template>

<style scoped>
.provision {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
}

.provision__head h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.provision__head p,
.provision__muted {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.provision__monthly {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin: 0;
}

.provision__monthly .su-fig__num {
    margin: 0;
}

.provision__form {
    display: grid;
    gap: 8px;
}

.provision__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.provision__row :deep(.v-input) {
    flex: 1 1 10rem;
    max-width: 16rem;
}

.provision__error {
    margin: 0;
    color: var(--danger);
    font-size: 13px;
}
</style>
