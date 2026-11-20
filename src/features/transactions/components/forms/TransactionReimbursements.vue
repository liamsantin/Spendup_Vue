<script setup lang="ts">
/**
 * Remboursements d'une transaction existante. Une facture médicale montre ce qui lui a été remboursé et le net à
 * charge ; un remboursement (revenu) propose les factures probables et se relie en un geste. Chaque geste est
 * enregistré tout de suite, à part du formulaire : il ne touche ni les montants ni les comptes.
 */
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { transactionsApi } from '@/features/transactions/api';
import {
    suggestedLinkAmount,
    type ReimbursementCandidate,
    type ReimbursementLink,
    type TransactionReimbursements
} from '@/features/transactions/reimbursements';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TransactionType } from '@/features/transactions/types';

const props = defineProps<{
    publicId: string;
    transactionType: TransactionType;
    /** Nature fiscale effective : une facture n'est suivie ici que si c'est un frais médical. */
    effectiveNature: string | null;
    disabled?: boolean;
}>();

const { t } = useI18n();
const money = useTaxMoney();
const data = ref<TransactionReimbursements | null>(null);
const candidates = ref<ReimbursementCandidate[]>([]);
const busy = ref(false);
const failed = ref(false);

const isInvoice = () => props.transactionType === 'depense';
const isReimbursement = () => props.transactionType === 'revenu';

async function load() {
    failed.value = false;
    try {
        data.value = await transactionsApi.reimbursements(props.publicId);
        candidates.value =
            isReimbursement() && (data.value?.remaining ?? 0) > 0
                ? (await transactionsApi.reimbursementCandidates(props.publicId)).items
                : [];
    } catch {
        failed.value = true;
        data.value = null;
        candidates.value = [];
    }
}

async function link(candidate: ReimbursementCandidate) {
    if (!data.value) return;
    busy.value = true;
    try {
        await transactionsApi.linkReimbursement(props.publicId, {
            invoicePublicId: candidate.publicId,
            amount: suggestedLinkAmount(data.value.remaining, candidate)
        });
        await load();
    } catch {
        failed.value = true;
    } finally {
        busy.value = false;
    }
}

async function unlink(item: ReimbursementLink) {
    busy.value = true;
    try {
        await transactionsApi.unlinkReimbursement(item.reimbursementPublicId, item.invoicePublicId);
        await load();
    } catch {
        failed.value = true;
    } finally {
        busy.value = false;
    }
}

onMounted(load);
watch(() => [props.publicId, props.effectiveNature], load);

function visible(): boolean {
    if (!data.value) return false;
    if (isInvoice()) return props.effectiveNature === 'medicalExpense' || data.value.reimbursements.length > 0;
    return isReimbursement() && (data.value.invoices.length > 0 || candidates.value.length > 0);
}
</script>

<template>
    <section
        v-if="visible() && data"
        class="tx-reimb"
        :aria-label="t('transactionsPage.reimbursements.title')"
        data-test="tx-reimbursements"
    >
        <span class="tx-reimb__title">{{ t('transactionsPage.reimbursements.title') }}</span>

        <template v-if="isInvoice()">
            <p class="tx-reimb__line" data-test="tx-reimbursements-net">
                {{ t('transactionsPage.reimbursements.invoiceSummary', { reimbursed: money(data.reimbursed), net: money(data.net) }) }}
            </p>
            <ul v-if="data.reimbursements.length" class="tx-reimb__list">
                <li v-for="item in data.reimbursements" :key="item.reimbursementPublicId">
                    {{ item.reimbursementLabel }} · {{ money(item.amount) }}
                    <button type="button" class="su-btn su-btn--ghost su-btn--sm" :disabled="disabled || busy" @click="unlink(item)">
                        {{ t('transactionsPage.reimbursements.unlink') }}
                    </button>
                </li>
            </ul>
            <p v-else class="tx-reimb__hint">{{ t('transactionsPage.reimbursements.noneForInvoice') }}</p>
        </template>

        <template v-else>
            <p class="tx-reimb__line">
                {{
                    t('transactionsPage.reimbursements.reimbursementSummary', {
                        allocated: money(data.allocated),
                        remaining: money(data.remaining)
                    })
                }}
            </p>
            <ul v-if="data.invoices.length" class="tx-reimb__list">
                <li v-for="item in data.invoices" :key="item.invoicePublicId">
                    {{ item.invoiceLabel }} · {{ money(item.amount) }}
                    <button type="button" class="su-btn su-btn--ghost su-btn--sm" :disabled="disabled || busy" @click="unlink(item)">
                        {{ t('transactionsPage.reimbursements.unlink') }}
                    </button>
                </li>
            </ul>
            <template v-if="candidates.length">
                <p class="tx-reimb__hint">{{ t('transactionsPage.reimbursements.candidates') }}</p>
                <ul class="tx-reimb__list" data-test="tx-reimbursements-candidates">
                    <li v-for="item in candidates" :key="item.publicId">
                        {{ item.label }} · {{ money(item.remaining) }}
                        <span v-for="reason in item.reasons" :key="reason" class="tx-reimb__reason">
                            {{ t(`transactionsPage.reimbursements.reasons.${reason}`) }}
                        </span>
                        <button type="button" class="su-btn su-btn--ink su-btn--sm" :disabled="disabled || busy" @click="link(item)">
                            {{ t('transactionsPage.reimbursements.link') }}
                        </button>
                    </li>
                </ul>
            </template>
        </template>

        <p v-if="failed" class="tx-reimb__hint">{{ t('transactionsPage.reimbursements.failed') }}</p>
    </section>
</template>

<style scoped>
.tx-reimb {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
}

.tx-reimb__title {
    font-size: 14px;
    color: var(--ink);
}

.tx-reimb__line {
    margin: 0;
    font-size: 14px;
    color: var(--ink);
}

.tx-reimb__hint {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
}

.tx-reimb__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--ink);
}

.tx-reimb__reason {
    margin-left: 6px;
    font-size: 12px;
    color: var(--gray);
}
</style>
