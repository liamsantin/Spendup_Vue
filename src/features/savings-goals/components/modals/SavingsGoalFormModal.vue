<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canLinkSavingsGoalAccount } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import {
    buildCreateSavingsGoalPayload,
    buildUpdateSavingsGoalPayload,
    emptySavingsGoalFormFields,
    isSavingsGoalFormDirty,
    savingsGoalToFormFields,
    type SavingsGoalFormFields,
    type SavingsGoalPayloadErrorCode
} from '@/features/savings-goals/payload';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { useUserSettingsStore } from '@/features/user-settings';
import SavingsGoalForm, { type SavingsGoalFormFieldErrors } from '@/features/savings-goals/components/forms/SavingsGoalForm.vue';

const props = defineProps<{
    modelValue: boolean;
    savingsGoal?: SavingsGoal | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [goal: SavingsGoal];
}>();

const { t } = useI18n();
const store = useSavingsGoalsStore();
const accountsStore = useAccountsStore();
const settings = useUserSettingsStore();

const isEdit = ref(false);
const editGoal = ref<SavingsGoal | null>(null);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<SavingsGoalFormFieldErrors>({});
const form = reactive<SavingsGoalFormFields>(emptySavingsGoalFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const linkableAccounts = computed(() => accountsStore.accounts.filter((item) => canLinkSavingsGoalAccount(item)));

const allowedAccountIds = computed(() => {
    const ids = new Set(linkableAccounts.value.map((item) => item.publicId));
    const currentId = editGoal.value?.accountPublicId;
    if (currentId) ids.add(currentId);
    return ids;
});

const accountItems = computed(() => {
    const none = [{ title: t('savingsGoalsPage.form.noAccount'), value: '' }];
    const items = linkableAccounts.value.map((item) => ({ title: item.name, value: item.publicId }));
    const currentId = form.accountPublicId;
    if (currentId && !items.some((item) => item.value === currentId)) {
        const current = accountsStore.accounts.find((item) => item.publicId === currentId);
        if (current) items.unshift({ title: current.name, value: current.publicId });
    }
    return [...none, ...items];
});

const currencyHint = computed(() => {
    if (isEdit.value) return t('savingsGoalsPage.form.currencyLockedHint');
    return t('savingsGoalsPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const canSave = computed(() => {
    if (!isEdit.value || !editGoal.value) return true;
    return isSavingsGoalFormDirty(editGoal.value, form);
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.targetAmount = null;
    fieldErrors.currentAmount = null;
    fieldErrors.targetDate = null;
    fieldErrors.accountPublicId = null;
    fieldErrors.currency = null;
}

function payloadErrorText(code: SavingsGoalPayloadErrorCode): string {
    return t(`savingsGoalsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: SavingsGoalPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const goal = editGoal.value;
    if (goal) {
        Object.assign(form, savingsGoalToFormFields(goal));
        return;
    }
    Object.assign(
        form,
        emptySavingsGoalFormFields({
            currency: settings.current.defaultCurrency
        })
    );
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.savingsGoal;
        editGoal.value = props.savingsGoal ?? null;
        resetForm();
        if (!accountsStore.initialized) {
            void accountsStore.loadAccounts().catch(() => undefined);
        }
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const ctx = {
        lockedCurrency: editGoal.value?.currency ?? null,
        allowedAccountIds: allowedAccountIds.value
    };
    const built = isEdit.value ? buildUpdateSavingsGoalPayload(form, ctx) : buildCreateSavingsGoalPayload(form, ctx);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && editGoal.value
                ? await store.updateSavingsGoal(editGoal.value.publicId, form, {
                      lockedCurrency: editGoal.value.currency,
                      allowedAccountIds: allowedAccountIds.value
                  })
                : await store.createSavingsGoal(form, { allowedAccountIds: allowedAccountIds.value });
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('savingsGoalsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('savingsGoalsPage.form.editTitle') : t('savingsGoalsPage.form.createTitle')"
        :subtitle="t('savingsGoalsPage.form.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <SavingsGoalForm
            :form="form"
            :is-edit="isEdit"
            :account-items="accountItems"
            :field-errors="fieldErrors"
            :currency-hint="currencyHint"
            :account-hint="t('savingsGoalsPage.form.accountHint')"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
