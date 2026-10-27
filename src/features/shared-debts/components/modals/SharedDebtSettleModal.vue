<script setup lang="ts">
/**
 * Remboursement (partiel ou total) d’une dette entre amis, côté créancier.
 * Montant prérempli = reste dû, date = aujourd’hui (fuseau des settings).
 */
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatSharedDebtAmount } from '@/features/shared-debts/format';
import {
    buildSettlePayload,
    emptySharedDebtSettleFields,
    type SharedDebtPayloadErrorCode,
    type SharedDebtSettleFields
} from '@/features/shared-debts/payload';
import { useSharedDebtsStore } from '@/features/shared-debts/stores/shared-debts-store';
import type { SharedDebt } from '@/features/shared-debts/types';

const props = defineProps<{
    modelValue: boolean;
    sharedDebt?: SharedDebt | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    settled: [debt: SharedDebt];
}>();

const { t, locale } = useI18n();
const store = useSharedDebtsStore();
const settings = useUserSettingsStore();

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<{ amount: string | null; date: string | null }>({ amount: null, date: null });
const form = reactive<SharedDebtSettleFields>({ amount: '', date: null });

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));

const liveDebt = computed(() => {
    const id = props.sharedDebt?.publicId;
    if (!id) return props.sharedDebt ?? null;
    return store.findByPublicId(id) ?? props.sharedDebt ?? null;
});

const remainingText = computed(() => {
    const debt = liveDebt.value;
    return debt ? formatSharedDebtAmount(debt.remainingAmount, debt.currency, locale.value) : '';
});

const dateModel = computed({
    get: () => form.date,
    set: (value: string | null) => {
        form.date = value;
    }
});

function clearErrors() {
    localError.message = null;
    fieldErrors.amount = null;
    fieldErrors.date = null;
}

function applyPayloadError(code: SharedDebtPayloadErrorCode, field?: string) {
    const message = t(`sharedDebtsPage.form.errors.${code}`);
    if (field === 'amount' || field === 'date') {
        fieldErrors[field] = message;
        return;
    }
    localError.message = message;
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        clearErrors();
        const debt = liveDebt.value;
        Object.assign(form, debt ? emptySharedDebtSettleFields(debt, today.value) : { amount: '', date: today.value });
    }
);

async function onSettle() {
    const debt = liveDebt.value;
    if (!debt) return;
    clearErrors();
    const context = { remainingAmount: debt.remainingAmount, today: today.value };
    const built = buildSettlePayload(form, context);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const settled = await store.settleSharedDebt(debt.publicId, form, context);
        emit('settled', settled);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('sharedDebtsPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('sharedDebtsPage.settle.title')"
        :subtitle="liveDebt ? t('sharedDebtsPage.settle.subtitle', { label: liveDebt.label, remaining: remainingText }) : undefined"
        :max-width="520"
        :scrollable="false"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <div class="shared-debt-settle">
            <div class="shared-debt-settle__row">
                <label class="shared-debt-settle__label" for="shared-debt-settle-amount">{{
                    t('sharedDebtsPage.settle.fields.amount')
                }}</label>
                <div class="shared-debt-settle__field">
                    <v-text-field
                        id="shared-debt-settle-amount"
                        v-model="form.amount"
                        type="number"
                        step="0.01"
                        min="0"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        :error="!!fieldErrors.amount"
                        :error-messages="fieldErrors.amount || undefined"
                    />
                    <p class="shared-debt-settle__hint">{{ t('sharedDebtsPage.settle.amountHint', { remaining: remainingText }) }}</p>
                </div>
            </div>
            <div class="shared-debt-settle__row">
                <label class="shared-debt-settle__label">{{ t('sharedDebtsPage.settle.fields.date') }}</label>
                <div class="shared-debt-settle__field">
                    <AppDatePicker v-model="dateModel" :label="t('sharedDebtsPage.settle.fields.date')" :max="today" />
                    <p v-if="fieldErrors.date" class="shared-debt-settle__hint shared-debt-settle__hint--error">{{ fieldErrors.date }}</p>
                </div>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !liveDebt" @click="onSettle">
                {{ t('sharedDebtsPage.settle.confirm') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.shared-debt-settle {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.shared-debt-settle__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.shared-debt-settle__label {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.3;
}

.shared-debt-settle__field {
    min-width: 0;
}

.shared-debt-settle__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.shared-debt-settle__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.shared-debt-settle__hint {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.shared-debt-settle__hint--error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .shared-debt-settle__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
