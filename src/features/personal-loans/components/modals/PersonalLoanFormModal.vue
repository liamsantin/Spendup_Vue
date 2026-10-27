<script setup lang="ts">
/**
 * Création / édition d’un prêt entre personnes (`AppModalBase`). En édition : devise figée, interrupteur « Annulé »,
 * sens et contrepartie verrouillés hors prêt `active`.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { formatPersonalLoanAmount } from '@/features/personal-loans/format';
import { usePersonalLoansStore } from '@/features/personal-loans/stores/personal-loans-store';
import {
    buildCreatePersonalLoanPayload,
    buildUpdatePersonalLoanPayload,
    emptyPersonalLoanFormFields,
    isPersonalLoanFormDirty,
    personalLoanToFormFields,
    type PersonalLoanFormFields,
    type PersonalLoanPayloadErrorCode
} from '@/features/personal-loans/payload';
import type { LoanDirection, PersonalLoan } from '@/features/personal-loans/types';
import { useUserSettingsStore } from '@/features/user-settings';
import PersonalLoanForm, { type PersonalLoanFormFieldErrors } from '@/features/personal-loans/components/forms/PersonalLoanForm.vue';

const props = defineProps<{
    modelValue: boolean;
    loan?: PersonalLoan | null;
    /** Sens présélectionné à la création (filtre courant). */
    defaultDirection?: LoanDirection | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [loan: PersonalLoan];
}>();

const { t, locale } = useI18n();
const store = usePersonalLoansStore();
const settings = useUserSettingsStore();

const isEditSession = ref(false);
const editTarget = ref<PersonalLoan | null>(null);
const isEdit = computed(() => isEditSession.value || !!props.loan);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<PersonalLoanFormFieldErrors>({});
const form = reactive<PersonalLoanFormFields>(emptyPersonalLoanFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const liveLoan = computed(() => {
    const id = editTarget.value?.publicId;
    if (!id) return editTarget.value;
    return store.findByPublicId(id) ?? editTarget.value;
});

const lockIdentity = computed(() => isEdit.value && !!editTarget.value && editTarget.value.status !== 'active');

const currencyHint = computed(() => {
    if (isEdit.value) return t('personalLoansPage.form.currencyLockedHint');
    return t('personalLoansPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const remainingHint = computed(() => {
    const current = liveLoan.value;
    if (!isEdit.value || !current) return t('personalLoansPage.form.remainingCreateHint');
    return t('personalLoansPage.form.remainingEditHint', {
        repaid: formatPersonalLoanAmount(current.repaidAmount, current.currency, locale.value)
    });
});

const canSave = computed(() => {
    if (!isEdit.value || !editTarget.value) return true;
    return isPersonalLoanFormDirty(editTarget.value, form);
});

const modalTitle = computed(() => {
    if (!isEdit.value) return t('personalLoansPage.form.createTitle');
    const current = liveLoan.value;
    return current?.label?.trim() || current?.counterpartName?.trim() || t('personalLoansPage.form.editTitle');
});

function clearFieldErrors() {
    for (const key of Object.keys(fieldErrors) as (keyof PersonalLoanFormFieldErrors)[]) fieldErrors[key] = null;
}

function applyPayloadError(code: PersonalLoanPayloadErrorCode, field?: string) {
    const message = t(`personalLoansPage.form.errors.${code}`);
    if (field) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const current = editTarget.value;
    if (current) {
        Object.assign(form, personalLoanToFormFields(current));
        return;
    }
    Object.assign(
        form,
        emptyPersonalLoanFormFields({
            direction: props.defaultDirection ?? 'pret',
            currency: settings.current.defaultCurrency,
            startDate: todayYmdInTimeZone(settings.current.timezone)
        })
    );
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEditSession.value = !!props.loan;
        editTarget.value = props.loan ?? null;
        resetForm();
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const current = editTarget.value;
    const built = isEdit.value ? buildUpdatePersonalLoanPayload(form, { current }) : buildCreatePersonalLoanPayload(form);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && current
                ? await store.updatePersonalLoan(current.publicId, form, { current })
                : await store.createPersonalLoan(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('personalLoansPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="modalTitle"
        :subtitle="t('personalLoansPage.form.subtitle')"
        :max-width="640"
        :height="800"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <PersonalLoanForm
            :form="form"
            :is-edit="isEdit"
            :lock-identity="lockIdentity"
            :field-errors="fieldErrors"
            :currency-hint="currencyHint"
            :remaining-hint="remainingHint"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
