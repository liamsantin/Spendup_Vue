<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { parseAccountAmount } from '@/features/accounts/format';
import { formatSavingsGoalAmount } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    modelValue: boolean;
    savingsGoal?: SavingsGoal | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [goal: SavingsGoal];
}>();

const { t, locale } = useI18n();
const store = useSavingsGoalsStore();

const depositAmount = ref('');
const localError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const goal = computed(() => props.savingsGoal ?? null);

const parsedDeposit = computed(() => parseAccountAmount(depositAmount.value));

const nextCurrent = computed(() => {
    if (!goal.value || parsedDeposit.value == null) return null;
    return Number((goal.value.currentAmount + parsedDeposit.value).toFixed(2));
});

const canSave = computed(() => {
    if (!goal.value) return false;
    if (parsedDeposit.value == null || parsedDeposit.value <= 0) return false;
    return nextCurrent.value != null && nextCurrent.value >= 0;
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        depositAmount.value = '';
        localError.value = null;
    }
);

async function onSave() {
    if (!goal.value || !canSave.value || nextCurrent.value == null) return;
    localError.value = null;
    try {
        const saved = await store.depositSavingsGoal(goal.value.publicId, nextCurrent.value);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('savingsGoalsPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('savingsGoalsPage.deposit.title')"
        :subtitle="t('savingsGoalsPage.deposit.subtitle')"
        :max-width="480"
        :height="420"
        scrollable
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <p v-if="goal" class="text-body-2 text-medium-emphasis mb-4">
            {{
                t('savingsGoalsPage.deposit.currentOf', {
                    current: formatSavingsGoalAmount(goal.currentAmount, goal.currency, locale),
                    target: formatSavingsGoalAmount(goal.targetAmount, goal.currency, locale)
                })
            }}
        </p>

        <v-text-field
            v-model="depositAmount"
            type="number"
            step="0.01"
            min="0"
            color="primary"
            variant="outlined"
            hide-details="auto"
            :label="t('savingsGoalsPage.deposit.amount')"
        />

        <p
            v-if="goal && nextCurrent != null && parsedDeposit != null && parsedDeposit > 0"
            class="text-caption text-medium-emphasis mt-3 mb-0"
        >
            {{
                t('savingsGoalsPage.deposit.nextCurrent', {
                    amount: formatSavingsGoalAmount(nextCurrent, goal.currency, locale)
                })
            }}
        </p>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('savingsGoalsPage.actions.deposit') }}
            </button>
        </template>
    </AppModalBase>
</template>
