<script setup lang="ts">
/**
 * Décision de taxation et décomptes de l'administration : la personne recopie ce que le papier indique.
 * Rien n'est calculé : l'application range les montants et les compare à ce qui a été déclaré.
 */
defineOptions({ name: 'TaxAssessmentsSection' });

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { taxApi } from '@/features/tax/api';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxAssessment, TaxAssessmentKind, TaxAssessmentPayload, TaxAssessments, TaxStatus } from '@/features/tax/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    publicId: string;
    /** La déclaration est déposée : la décision ne se saisit qu'ensuite. */
    filed: boolean;
    /** Lignes du catalogue, pour choisir celle d'un écart. */
    lines: { code: string; label: string }[];
}>();

const emit = defineEmits<{
    changed: [status: TaxStatus];
}>();

const { t, locale } = useI18n();
const money = useTaxMoney();

const data = ref<TaxAssessments>({ items: [], status: 'deposee' });
const saving = ref(false);
const error = ref('');

interface DeviationDraft {
    code: string;
    assessed: string;
}

function emptyDraft() {
    return {
        competence: 'cantonal' as 'cantonal' | 'federal',
        kind: 'assessment' as TaxAssessmentKind,
        issuedAt: '',
        taxableIncome: '',
        taxableWealth: '',
        totalTax: '',
        interest: '',
        balance: '',
        paymentDueDate: '',
        note: '',
        deviations: [] as DeviationDraft[]
    };
}

const draft = ref(emptyDraft());

const competenceItems = computed(() => [
    { title: t('taxPage.installments.competence.cantonal'), value: 'cantonal' },
    { title: t('taxPage.installments.competence.federal'), value: 'federal' }
]);
const kindItems = computed(() =>
    (['assessment', 'correction', 'intermediateStatement', 'finalStatement'] as TaxAssessmentKind[]).map((value) => ({
        title: t(`taxPage.assessments.kind.${value}`),
        value
    }))
);
const lineItems = computed(() => props.lines.map((line) => ({ title: line.label, value: line.code })));

function formatDate(iso: string): string {
    const date = new Date(`${iso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale.value);
}

function labelOf(code: string): string {
    return props.lines.find((line) => line.code === code)?.label ?? code;
}

function parseAmount(raw: string): number | null {
    const text = raw.replace(/[’'\s]/g, '').replace(',', '.');
    if (!text) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
}

async function load() {
    try {
        data.value = await taxApi.assessments(props.publicId);
        error.value = '';
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    }
}

async function run(action: () => Promise<TaxAssessments>): Promise<boolean> {
    saving.value = true;
    error.value = '';
    try {
        data.value = await action();
        emit('changed', data.value.status);
        return true;
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
        return false;
    } finally {
        saving.value = false;
    }
}

async function add() {
    if (!draft.value.issuedAt) {
        error.value = t('taxPage.assessments.invalid');
        return;
    }
    const body: TaxAssessmentPayload = {
        competence: draft.value.competence,
        kind: draft.value.kind,
        issuedAt: draft.value.issuedAt,
        taxableIncome: parseAmount(draft.value.taxableIncome),
        taxableWealth: parseAmount(draft.value.taxableWealth),
        totalTax: parseAmount(draft.value.totalTax),
        interest: parseAmount(draft.value.interest),
        balance: parseAmount(draft.value.balance),
        paymentDueDate: draft.value.paymentDueDate || null,
        note: draft.value.note.trim() || null,
        deviations: draft.value.deviations
            .filter((row) => row.code && parseAmount(row.assessed) !== null)
            .map((row) => ({ code: row.code, assessed: parseAmount(row.assessed) ?? 0 }))
    };
    if (await run(() => taxApi.createAssessment(props.publicId, body))) draft.value = emptyDraft();
}

const remove = (item: TaxAssessment) => run(() => taxApi.deleteAssessment(props.publicId, item.publicId));
const setStatus = (status: 'taxee' | 'soldee' | 'contestee') => run(() => taxApi.changeAssessmentStatus(props.publicId, status));

function addDeviation() {
    draft.value.deviations.push({ code: '', assessed: '' });
}

function removeDeviation(index: number) {
    draft.value.deviations.splice(index, 1);
}

function balanceText(item: TaxAssessment): string {
    if (item.balance === null) return '';
    return item.balance >= 0
        ? t('taxPage.assessments.balanceDue', { amount: money(item.balance) })
        : t('taxPage.assessments.balanceRefund', { amount: money(Math.abs(item.balance)) });
}

onMounted(load);
watch(() => props.publicId, load);
</script>

<template>
    <section class="tax-form" data-test="tax-assessments">
        <h2 class="tax-form__legend">{{ t('taxPage.assessments.heading') }}</h2>
        <p class="tax-muted">{{ t('taxPage.assessments.hint') }}</p>
        <p v-if="error" class="tax-check is-toCheck" role="alert">{{ error }}</p>
        <p v-if="!filed" class="tax-muted" data-test="tax-assessments-not-filed">{{ t('taxPage.assessments.notFiled') }}</p>
        <p v-else-if="!data.items.length" class="tax-muted">{{ t('taxPage.assessments.empty') }}</p>

        <article v-for="item in data.items" :key="item.publicId" class="tax-fiche" :data-test="`tax-assessment-${item.publicId}`">
            <div>
                <p class="tax-fiche__title">
                    {{ t(`taxPage.assessments.kind.${item.kind}`) }} · {{ t(`taxPage.installments.competence.${item.competence}`) }}
                    {{ t('taxPage.assessments.issuedOn', { date: formatDate(item.issuedAt) }) }}
                </p>
                <ul class="tax-pillar3a__list">
                    <li v-if="item.taxableIncome !== null">
                        {{ t('taxPage.assessments.taxableIncome', { amount: money(item.taxableIncome) }) }}
                    </li>
                    <li v-if="item.taxableWealth !== null">
                        {{ t('taxPage.assessments.taxableWealth', { amount: money(item.taxableWealth) }) }}
                    </li>
                    <li v-if="item.totalTax !== null">{{ t('taxPage.assessments.totalTax', { amount: money(item.totalTax) }) }}</li>
                    <li v-if="item.installmentsPaid !== null">
                        {{ t('taxPage.assessments.installmentsPaid', { amount: money(item.installmentsPaid) }) }}
                    </li>
                    <li v-if="item.interest !== null">{{ t('taxPage.assessments.interest', { amount: money(item.interest) }) }}</li>
                    <li v-if="item.balance !== null" class="tax-fiche__title" data-test="tax-assessment-balance">
                        {{ balanceText(item) }}
                        <template v-if="item.paymentDueDate && item.balance > 0">
                            · {{ t('taxPage.assessments.dueBy', { date: formatDate(item.paymentDueDate) }) }}
                        </template>
                    </li>
                </ul>
                <template v-if="item.deviations.length">
                    <p class="tax-fiche__detail">{{ t('taxPage.assessments.deviationsTitle') }}</p>
                    <ul class="tax-pillar3a__list">
                        <li v-for="deviation in item.deviations" :key="deviation.code" data-test="tax-assessment-deviation">
                            {{
                                t('taxPage.assessments.deviation', {
                                    line: labelOf(deviation.code),
                                    declared:
                                        deviation.declared === null ? t('taxPage.assessments.notDeclared') : money(deviation.declared),
                                    assessed: money(deviation.assessed),
                                    difference: (deviation.difference > 0 ? '+' : '') + money(deviation.difference)
                                })
                            }}
                        </li>
                    </ul>
                </template>
                <p v-if="item.note" class="tax-fiche__detail">{{ item.note }}</p>
            </div>
            <button type="button" class="su-btn" :disabled="saving" @click="remove(item)">{{ t('taxPage.assessments.remove') }}</button>
        </article>

        <div v-if="data.items.length" class="tax-form__actions">
            <button v-if="data.status === 'taxee'" type="button" class="su-btn" :disabled="saving" @click="setStatus('contestee')">
                {{ t('taxPage.assessments.contest') }}
            </button>
            <button v-if="data.status === 'taxee'" type="button" class="su-btn" :disabled="saving" @click="setStatus('soldee')">
                {{ t('taxPage.assessments.settle') }}
            </button>
            <button
                v-if="data.status === 'soldee' || data.status === 'contestee'"
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="setStatus('taxee')"
            >
                {{ t('taxPage.assessments.reopen') }}
            </button>
        </div>

        <form v-if="filed" class="tax-form" @submit.prevent="add">
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.kindLabel') }}</label>
                <div class="tax-form__field">
                    <v-select v-model="draft.kind" :items="kindItems" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.competenceLabel') }}</label>
                <div class="tax-form__field">
                    <v-select v-model="draft.competence" :items="competenceItems" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.issuedLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.issuedAt" type="date" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.incomeLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.taxableIncome" inputmode="decimal" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.wealthLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.taxableWealth" inputmode="decimal" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.totalTaxLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.totalTax" inputmode="decimal" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.interestLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.interest" inputmode="decimal" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.balanceLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        v-model="draft.balance"
                        inputmode="decimal"
                        :hint="t('taxPage.assessments.balanceHint')"
                        persistent-hint
                        color="primary"
                        variant="outlined"
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.dueLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.paymentDueDate" type="date" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.noteLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.note" maxlength="255" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div v-for="(row, index) in draft.deviations" :key="index" class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.assessments.deviationLine') }}</label>
                <div class="tax-form__field">
                    <v-select v-model="row.code" :items="lineItems" color="primary" variant="outlined" hide-details />
                    <v-text-field
                        v-model="row.assessed"
                        :label="t('taxPage.assessments.deviationAssessed')"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details
                    />
                    <button type="button" class="su-btn" @click="removeDeviation(index)">
                        {{ t('taxPage.assessments.removeDeviation') }}
                    </button>
                </div>
            </div>
            <div class="tax-form__actions">
                <button type="button" class="su-btn" :disabled="saving" @click="addDeviation">
                    {{ t('taxPage.assessments.addDeviation') }}
                </button>
                <button type="submit" class="su-btn" :disabled="saving">{{ t('taxPage.assessments.add') }}</button>
            </div>
        </form>
    </section>
</template>
