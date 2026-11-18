<script setup lang="ts">
/**
 * Paiements de l'impôt : les tranches (acomptes, solde) que la personne saisit d'après sa facture, rapprochées de ses paiements.
 * Aucune date ni aucun montant n'est proposé : l'application n'en connaît pas de relu.
 */
defineOptions({ name: 'TaxInstallmentsSection' });

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { taxApi } from '@/features/tax/api';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type {
    TaxInstallment,
    TaxInstallmentCandidate,
    TaxInstallmentCompetence,
    TaxInstallmentPayload,
    TaxInstallments
} from '@/features/tax/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    publicId: string;
}>();

const emit = defineEmits<{
    changed: [];
}>();

const { t, locale } = useI18n();
const money = useTaxMoney();

const data = ref<TaxInstallments>({ items: [], planned: 0, paid: 0, remaining: 0 });
const candidates = ref<TaxInstallmentCandidate[]>([]);
const saving = ref(false);
const error = ref('');
const draft = ref({ competence: 'cantonal' as TaxInstallmentCompetence, dueDate: '', amount: '', note: '' });
const picked = ref<Record<string, string | null>>({});

const competenceItems = computed(() => [
    { title: t('taxPage.installments.competence.cantonal'), value: 'cantonal' },
    { title: t('taxPage.installments.competence.federal'), value: 'federal' }
]);

const candidateItems = computed(() =>
    candidates.value.map((item) => ({
        title: `${item.label} · ${formatDate(item.date)} · ${money(item.amount)}`,
        value: item.transactionPublicId
    }))
);

function formatDate(iso: string): string {
    const date = new Date(`${iso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale.value);
}

function title(item: TaxInstallment): string {
    return t('taxPage.installments.title', {
        competence: t(`taxPage.installments.competence.${item.competence}`),
        sequence: item.sequence
    });
}

async function load() {
    try {
        const [list, free] = await Promise.all([taxApi.installments(props.publicId), taxApi.installmentCandidates(props.publicId)]);
        data.value = list;
        candidates.value = free;
        error.value = '';
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    }
}

/** Applique une écriture et recharge les paiements libres : un rapprochement en retire ou en libère un. */
async function run(action: () => Promise<TaxInstallments>) {
    saving.value = true;
    error.value = '';
    try {
        data.value = await action();
        emit('changed');
        candidates.value = await taxApi.installmentCandidates(props.publicId);
    } catch (e) {
        error.value = getErrorMessage(AppError.fromUnknown(e));
    } finally {
        saving.value = false;
    }
}

function parseAmount(raw: string): number {
    return Number(raw.replace(/[’'\s]/g, '').replace(',', '.'));
}

async function add() {
    const amount = parseAmount(draft.value.amount);
    if (!draft.value.dueDate || !Number.isFinite(amount) || amount <= 0) {
        error.value = t('taxPage.installments.invalid');
        return;
    }
    const body: TaxInstallmentPayload = {
        competence: draft.value.competence,
        dueDate: draft.value.dueDate,
        amount,
        note: draft.value.note.trim() || null
    };
    await run(() => taxApi.createInstallment(props.publicId, body));
    if (!error.value) draft.value = { competence: draft.value.competence, dueDate: '', amount: '', note: '' };
}

/** Payée à la main, sans transaction : la somme et la date du jour. */
const markPaid = (item: TaxInstallment) =>
    run(() =>
        taxApi.updateInstallment(props.publicId, item.publicId, { paidAmount: item.amount, paidAt: new Date().toISOString().slice(0, 10) })
    );

const clearPaid = (item: TaxInstallment) => run(() => taxApi.updateInstallment(props.publicId, item.publicId, { clearPayment: true }));

const remove = (item: TaxInstallment) => run(() => taxApi.deleteInstallment(props.publicId, item.publicId));

async function link(item: TaxInstallment) {
    const transactionPublicId = picked.value[item.publicId];
    if (!transactionPublicId) return;
    await run(() => taxApi.linkInstallmentTransaction(props.publicId, item.publicId, transactionPublicId));
    picked.value = { ...picked.value, [item.publicId]: null };
}

const unlink = (item: TaxInstallment, transactionPublicId: string) =>
    run(() => taxApi.unlinkInstallmentTransaction(props.publicId, item.publicId, transactionPublicId));

onMounted(load);
watch(() => props.publicId, load);
</script>

<template>
    <section class="tax-form" data-test="tax-installments">
        <h2 class="tax-form__legend">{{ t('taxPage.installments.heading') }}</h2>
        <p class="tax-muted">{{ t('taxPage.installments.hint') }}</p>
        <p v-if="error" class="tax-check is-toCheck" role="alert">{{ error }}</p>

        <p v-if="data.items.length" class="tax-fiche__title" data-test="tax-installments-totals">
            {{
                t('taxPage.installments.summary', {
                    planned: money(data.planned),
                    paid: money(data.paid),
                    remaining: money(data.remaining)
                })
            }}
        </p>
        <p v-else class="tax-muted">{{ t('taxPage.installments.empty') }}</p>

        <article v-for="item in data.items" :key="item.publicId" class="tax-fiche" :data-test="`tax-installment-${item.publicId}`">
            <div>
                <p class="tax-fiche__title">{{ title(item) }}</p>
                <p class="tax-fiche__detail">
                    {{ t('taxPage.installments.dueOn', { date: formatDate(item.dueDate) }) }} ·
                    <span
                        :class="['tax-check', { 'is-toCheck': item.status === 'overdue' }]"
                        :data-test="`tax-installment-status-${item.status}`"
                    >
                        {{ t(`taxPage.installments.status.${item.status}`) }}
                    </span>
                    <template v-if="item.note"> · {{ item.note }}</template>
                </p>
                <ul v-if="item.transactions.length" class="tax-pillar3a__list">
                    <li v-for="tx in item.transactions" :key="tx.publicId">
                        {{ tx.label }} · {{ formatDate(tx.date) }} · {{ money(tx.amount) }}
                        <button type="button" class="su-btn" :disabled="saving" @click="unlink(item, tx.publicId)">
                            {{ t('taxPage.installments.unlink') }}
                        </button>
                    </li>
                </ul>
                <div v-if="candidateItems.length && item.status !== 'paid'" class="tax-form__field">
                    <v-select
                        v-model="picked[item.publicId]"
                        :items="candidateItems"
                        :label="t('taxPage.installments.pick')"
                        color="primary"
                        variant="outlined"
                        hide-details
                        clearable
                    />
                    <button type="button" class="su-btn" :disabled="saving || !picked[item.publicId]" @click="link(item)">
                        {{ t('taxPage.installments.link') }}
                    </button>
                </div>
            </div>
            <p class="tax-fiche__amount">{{ money(item.paidAmount) }} / {{ money(item.amount) }}</p>
            <button
                v-if="item.status !== 'paid' && !item.transactions.length"
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="markPaid(item)"
            >
                {{ t('taxPage.installments.markPaid') }}
            </button>
            <button
                v-else-if="!item.transactions.length && item.paidAmount > 0"
                type="button"
                class="su-btn"
                :disabled="saving"
                @click="clearPaid(item)"
            >
                {{ t('taxPage.installments.clearPaid') }}
            </button>
            <button type="button" class="su-btn" :disabled="saving" @click="remove(item)">{{ t('taxPage.installments.remove') }}</button>
        </article>

        <form class="tax-form" @submit.prevent="add">
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.installments.competenceLabel') }}</label>
                <div class="tax-form__field">
                    <v-select v-model="draft.competence" :items="competenceItems" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.installments.dueLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.dueDate" type="date" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.installments.amountLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.amount" inputmode="decimal" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label">{{ t('taxPage.installments.noteLabel') }}</label>
                <div class="tax-form__field">
                    <v-text-field v-model="draft.note" maxlength="255" color="primary" variant="outlined" hide-details />
                </div>
            </div>
            <div class="tax-form__actions">
                <button type="submit" class="su-btn" :disabled="saving">{{ t('taxPage.installments.add') }}</button>
            </div>
        </form>
    </section>
</template>
