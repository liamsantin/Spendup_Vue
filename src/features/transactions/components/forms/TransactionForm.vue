<script setup lang="ts">
/**
 * Champs du formulaire transaction. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TransactionForm' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { parseAccountAmount } from '@/features/accounts/format';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import CategoryFormModal from '@/features/categories/components/modals/CategoryFormModal.vue';
import type { Category } from '@/features/categories/types';
import PaymentMethodFormModal from '@/features/payment-methods/components/modals/PaymentMethodFormModal.vue';
import { canWritePaymentMethods } from '@/features/payment-methods/rights';
import type { PaymentMethod } from '@/features/payment-methods/types';
import TierPicker from '@/features/tiers/components/forms/TierPicker.vue';
import TagPicker from '@/features/tags/components/forms/TagPicker.vue';
import {
    formatSignedAmountDelta,
    recurrenceAmountVariance,
    resolveTransactionAmountDisplay,
    todayUtcYmd
} from '@/features/transactions/format';
import { TRANSACTION_LABEL_MAX, type TransactionType } from '@/features/transactions/types';
import type { TransactionFormFields } from '@/features/transactions/payload';

export type TransactionFormFieldErrors = {
    type?: string | null;
    accountPublicId?: string | null;
    counterpartyAccountPublicId?: string | null;
    label?: string | null;
    amount?: string | null;
    operationDate?: string | null;
    valueDate?: string | null;
    paymentMethodPublicId?: string | null;
    categoryPublicId?: string | null;
    tierPublicId?: string | null;
    recurrencePublicId?: string | null;
    savingsGoalPublicId?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: TransactionFormFields;
        isEdit: boolean;
        accountItems: { title: string; value: string }[];
        counterpartyItems: { title: string; value: string }[];
        typeItems: { title: string; value: TransactionType }[];
        paymentMethodItems: { title: string; value: string }[];
        categoryItems: { title: string; value: string; indent?: number }[];
        recurrenceItems?: { title: string; value: string }[];
        savingsGoalItems?: { title: string; value: string }[];
        fieldErrors?: TransactionFormFieldErrors;
        archivedHint?: string | null;
        counterpartyHint?: string | null;
        categoryHint?: string | null;
        tierHint?: string | null;
        savingsGoalHint?: string | null;
        tagsHint?: string | null;
        recurrencePlannedAmount?: number | null;
        section?: 'operation' | 'classification' | 'all';
    }>(),
    {
        recurrenceItems: () => [],
        savingsGoalItems: () => [],
        fieldErrors: () => ({}),
        archivedHint: null,
        counterpartyHint: null,
        categoryHint: null,
        tierHint: null,
        savingsGoalHint: null,
        tagsHint: null,
        recurrencePlannedAmount: null,
        section: 'all'
    }
);

const { t, locale } = useI18n();
const accountsStore = useAccountsStore();

const isTransfer = computed(() => props.form.type === 'transfert');
const showOperation = computed(() => props.section === 'all' || props.section === 'operation');
const showClassification = computed(() => props.section === 'all' || props.section === 'classification');
const showRecurrence = computed(() => showClassification.value && !isTransfer.value);
const todayUtc = computed(() => todayUtcYmd());
const hasCounterpartyOptions = computed(() => props.counterpartyItems.length > 0);
const counterpartySelectItems = computed(() =>
    hasCounterpartyOptions.value ? props.counterpartyItems : [{ title: t('transactionsPage.form.noCounterpartyOption'), value: '' }]
);

const categoryCreateOpen = ref(false);
const categoryCreateName = ref('');
const paymentMethodCreateOpen = ref(false);
const paymentMethodCreateLabel = ref('');

const canCreatePaymentMethod = computed(() => {
    const account = accountsStore.accounts.find((item) => item.publicId === props.form.accountPublicId);
    return !!account && canWritePaymentMethods(account);
});

/** Devise affichée en suffixe gris du champ montant : celle du compte choisi (CHF par défaut). */
const amountCurrency = computed(() => {
    const account = accountsStore.accounts.find((item) => item.publicId === props.form.accountPublicId);
    return account?.currency ?? 'CHF';
});

const recurrenceAmountHint = computed(() => {
    if (props.recurrencePlannedAmount == null) return null;
    const actual = parseAccountAmount(props.form.amount);
    const variance = recurrenceAmountVariance(actual, props.recurrencePlannedAmount, props.form.type);
    if (!variance) return null;
    const currency = amountCurrency.value;
    return {
        tone: variance.tone,
        text: t('transactionsPage.form.recurrenceAmountVariance', {
            delta: formatSignedAmountDelta(variance.delta, currency, locale.value),
            planned: resolveTransactionAmountDisplay(variance.planned, currency, locale.value).text
        })
    };
});

const operationDateModel = computed({
    get: () => props.form.operationDate || null,
    set: (value: string | null) => {
        props.form.operationDate = value ?? '';
    }
});

const valueDateModel = computed({
    get: () => props.form.valueDate,
    set: (value: string | null) => {
        props.form.valueDate = value;
    }
});

function onAmountInput(value: string) {
    props.form.amount = value.replace(/[^\d.,]/g, '');
}

function onCategoryCreated(category: Category) {
    props.form.categoryPublicId = category.publicId;
}

function onPaymentMethodCreated(method: PaymentMethod) {
    if (method.accountPublicId !== props.form.accountPublicId) return;
    props.form.paymentMethodPublicId = method.publicId;
}

function openCategoryCreate(name: string) {
    categoryCreateName.value = name;
    categoryCreateOpen.value = true;
}

function openPaymentMethodCreate(name: string) {
    paymentMethodCreateLabel.value = name;
    paymentMethodCreateOpen.value = true;
}
</script>

<template>
    <div class="transaction-form">
        <p v-if="showOperation && archivedHint" class="tx-form__hint is-warn">{{ archivedHint }}</p>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-type">
                {{ t('transactionsPage.form.fields.type') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :disabled="isEdit"
                    :label="t('transactionsPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </div>
        </div>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-account">
                {{ isTransfer ? t('transactionsPage.form.fields.sourceAccount') : t('transactionsPage.form.fields.account') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-account"
                    v-model="form.accountPublicId"
                    :items="accountItems"
                    :disabled="isEdit"
                    :label="t('transactionsPage.form.fields.account')"
                    hide-details="auto"
                    :error="!!fieldErrors.accountPublicId"
                    :error-messages="fieldErrors.accountPublicId || undefined"
                />
            </div>
        </div>
        <div v-if="showOperation && isTransfer" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-counterparty">
                {{ t('transactionsPage.form.fields.counterpartyAccount') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-counterparty"
                    v-model="form.counterpartyAccountPublicId"
                    :items="counterpartySelectItems"
                    :disabled="isEdit || !hasCounterpartyOptions"
                    :label="t('transactionsPage.form.fields.counterpartyAccount')"
                    hide-details="auto"
                    :error="!!fieldErrors.counterpartyAccountPublicId || !!counterpartyHint"
                    :error-messages="fieldErrors.counterpartyAccountPublicId || counterpartyHint || undefined"
                />
            </div>
        </div>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-label">
                {{ t('transactionsPage.form.fields.label') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <v-text-field
                    id="tx-form-label"
                    v-model="form.label"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="TRANSACTION_LABEL_MAX"
                    :error="!!fieldErrors.label"
                    :error-messages="fieldErrors.label || undefined"
                />
            </div>
        </div>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-amount">
                {{ t('transactionsPage.form.fields.amount') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <v-text-field
                    id="tx-form-amount"
                    :model-value="form.amount"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    inputmode="decimal"
                    autocomplete="off"
                    :placeholder="t('transactionsPage.form.amountPlaceholder')"
                    :suffix="amountCurrency"
                    :error="!!fieldErrors.amount"
                    :error-messages="fieldErrors.amount || undefined"
                    @update:model-value="onAmountInput"
                />
                <p v-if="recurrenceAmountHint" class="tx-form__hint" :class="`is-${recurrenceAmountHint.tone}`">
                    {{ recurrenceAmountHint.text }}
                </p>
            </div>
        </div>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label">
                {{ t('transactionsPage.form.fields.operationDate') }}
                <span class="tx-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tx-form__field">
                <AppDatePicker
                    v-model="operationDateModel"
                    color="primary"
                    hide-details="auto"
                    :max="todayUtc"
                    :placeholder="t('transactionsPage.form.operationDatePlaceholder')"
                />
                <p v-if="fieldErrors.operationDate" class="tx-form__hint is-error">{{ fieldErrors.operationDate }}</p>
            </div>
        </div>
        <div v-if="showOperation" class="tx-form__row">
            <label class="tx-form__label">
                {{ t('transactionsPage.form.fields.valueDate') }}
            </label>
            <div class="tx-form__field">
                <AppDatePicker
                    v-model="valueDateModel"
                    color="primary"
                    hide-details="auto"
                    :min="form.operationDate || undefined"
                    :placeholder="t('transactionsPage.form.valueDatePlaceholder')"
                />
                <p v-if="fieldErrors.valueDate" class="tx-form__hint is-error">{{ fieldErrors.valueDate }}</p>
            </div>
        </div>
        <div v-if="showRecurrence" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-recurrence">
                {{ t('transactionsPage.form.fields.recurrence') }}
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-recurrence"
                    v-model="form.recurrencePublicId"
                    :items="recurrenceItems"
                    :label="t('transactionsPage.form.fields.recurrence')"
                    hide-details="auto"
                    :error="!!fieldErrors.recurrencePublicId"
                    :error-messages="fieldErrors.recurrencePublicId || undefined"
                    searchable
                    :search-placeholder="t('transactionsPage.form.recurrenceSearchPlaceholder')"
                    :no-results-label="t('transactionsPage.form.recurrenceNoResults')"
                />
            </div>
        </div>
        <div v-if="showClassification" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-payment-method">
                {{ t('transactionsPage.form.fields.paymentMethod') }}
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-payment-method"
                    v-model="form.paymentMethodPublicId"
                    :items="paymentMethodItems"
                    :label="t('transactionsPage.form.fields.paymentMethod')"
                    hide-details="auto"
                    :error="!!fieldErrors.paymentMethodPublicId"
                    :error-messages="fieldErrors.paymentMethodPublicId || undefined"
                    searchable
                    :search-placeholder="t('transactionsPage.form.paymentMethodSearchPlaceholder')"
                    :no-results-label="t('transactionsPage.form.paymentMethodNoResults')"
                    :create-label="canCreatePaymentMethod ? t('transactionsPage.form.paymentMethodCreateNew') : undefined"
                    :create-named-label="
                        canCreatePaymentMethod ? t('transactionsPage.form.paymentMethodCreate', { name: '{name}' }) : undefined
                    "
                    @create="openPaymentMethodCreate"
                />
            </div>
        </div>
        <div v-if="showClassification" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-category">
                {{ t('transactionsPage.form.fields.category') }}
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-category"
                    v-model="form.categoryPublicId"
                    :items="categoryItems"
                    :label="t('transactionsPage.form.fields.category')"
                    hide-details="auto"
                    :error="!!fieldErrors.categoryPublicId"
                    :error-messages="fieldErrors.categoryPublicId || undefined"
                    :hint="categoryHint || undefined"
                    :persistent-hint="!!categoryHint"
                    searchable
                    :search-placeholder="t('transactionsPage.form.categorySearchPlaceholder')"
                    :no-results-label="t('transactionsPage.form.categoryNoResults')"
                    :create-label="t('transactionsPage.form.categoryCreateNew')"
                    :create-named-label="t('transactionsPage.form.categoryCreate', { name: '{name}' })"
                    @create="openCategoryCreate"
                />
            </div>
        </div>
        <div v-if="showClassification" class="tx-form__row">
            <label class="tx-form__label">
                {{ t('transactionsPage.form.fields.tags') }}
            </label>
            <div class="tx-form__field">
                <TagPicker v-model="form.tagPublicIds" :hint="tagsHint" />
            </div>
        </div>
        <div v-if="showClassification" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-tier">
                {{ t('transactionsPage.form.fields.tier') }}
            </label>
            <div class="tx-form__field">
                <TierPicker
                    id="tx-form-tier"
                    v-model="form.tierPublicId"
                    :label="t('transactionsPage.form.fields.tier')"
                    hide-details="auto"
                    :error="!!fieldErrors.tierPublicId"
                    :error-messages="fieldErrors.tierPublicId || undefined"
                    :hint="tierHint || undefined"
                    :persistent-hint="!!tierHint"
                />
            </div>
        </div>
        <div v-if="showClassification" class="tx-form__row">
            <label class="tx-form__label" for="tx-form-savings-goal">
                {{ t('transactionsPage.form.fields.savingsGoal') }}
            </label>
            <div class="tx-form__field">
                <AppSelect
                    id="tx-form-savings-goal"
                    v-model="form.savingsGoalPublicId"
                    :items="savingsGoalItems"
                    :label="t('transactionsPage.form.fields.savingsGoal')"
                    hide-details="auto"
                    :error="!!fieldErrors.savingsGoalPublicId"
                    :error-messages="fieldErrors.savingsGoalPublicId || undefined"
                    :hint="savingsGoalHint || undefined"
                    :persistent-hint="!!savingsGoalHint"
                    searchable
                    :search-placeholder="t('transactionsPage.form.savingsGoalSearchPlaceholder')"
                    :no-results-label="t('transactionsPage.form.savingsGoalNoResults')"
                />
            </div>
        </div>

        <CategoryFormModal
            v-if="showClassification"
            v-model="categoryCreateOpen"
            :default-type="form.type"
            :default-name="categoryCreateName"
            @saved="onCategoryCreated"
        />
        <PaymentMethodFormModal
            v-if="showClassification"
            v-model="paymentMethodCreateOpen"
            :default-account-public-id="form.accountPublicId"
            :default-label="paymentMethodCreateLabel"
            lock-account
            @saved="onPaymentMethodCreated"
        />
    </div>
</template>

<style scoped>
/* ── lignes libellé (170 px) | champ, sans section en boîte ── */
.transaction-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.tx-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.tx-form__label {
    display: block;
    min-width: 0;
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.35;
}

/* astérisque de champ obligatoire en bleu */
.tx-form__req {
    color: var(--blue-ink);
    margin-left: 2px;
}

.tx-form__field {
    min-width: 0;
}

/* suffixe d'unité (« CHF ») en gris dans le champ */
.tx-form__field :deep(.v-text-field__suffix) {
    color: var(--gray);
    font-size: 13px;
    opacity: 1;
}

.tx-form__hint {
    margin: 6px 0 0;
    color: var(--gray);
    font-size: 12.5px;
    line-height: 1.4;
}

.tx-form__hint.is-error {
    color: var(--danger);
}

.tx-form__hint.is-warn,
.tx-form__hint.is-unfavorable {
    color: var(--violet-ink);
}

.tx-form__hint.is-favorable {
    color: var(--blue-ink);
}

@media (max-width: 599.98px) {
    /* mobile : libellé au-dessus du champ */
    .tx-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
