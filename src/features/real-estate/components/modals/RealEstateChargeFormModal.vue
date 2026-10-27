<script setup lang="ts">
/** Création / édition d’une charge du bien (`transactionPublicId` non saisi : conservé tel quel en édition). */
defineOptions({ name: 'RealEstateChargeFormModal' });

import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import TierPicker from '@/features/tiers/components/forms/TierPicker.vue';
import { useRealEstateForm } from '@/features/real-estate/composables/useRealEstateForm';
import {
    buildChargePayload,
    chargeToFormFields,
    emptyChargeFormFields,
    isChargeFormDirty,
    type RealEstateChargeFormFields
} from '@/features/real-estate/payload';
import { CHARGE_PERIODICITIES, CHARGE_TYPES, REAL_ESTATE_NAME_MAX, type RealEstateCharge } from '@/features/real-estate/types';
import RealEstateFormRow from '@/features/real-estate/components/forms/RealEstateFormRow.vue';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
    charge?: RealEstateCharge | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [charge: RealEstateCharge];
}>();

const { t } = useI18n();
const { store, fieldErrors, localError, currency, unitItems, clearErrors, applyPayloadError, applyError, ensureUnits } = useRealEstateForm(
    () => props.assetPublicId
);

const form = reactive<RealEstateChargeFormFields>(emptyChargeFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.charge);
const canSave = computed(() => !props.charge || isChargeFormDirty(props.charge, form));
const typeItems = computed(() => CHARGE_TYPES.map((value) => ({ title: t(`realEstatePage.chargeTypes.${value}`), value })));
const periodicityItems = computed(() =>
    CHARGE_PERIODICITIES.map((value) => ({ title: t(`realEstatePage.periodicities.${value}`), value }))
);
const units = computed(() => unitItems());

const startModel = computed({
    get: () => form.startDate,
    set: (value: string | null) => {
        form.startDate = value;
    }
});
const endModel = computed({
    get: () => form.endDate,
    set: (value: string | null) => {
        form.endDate = value;
    }
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        clearErrors();
        Object.assign(form, props.charge ? chargeToFormFields(props.charge) : emptyChargeFormFields());
        ensureUnits();
    }
);

async function onSave() {
    if (!canSave.value) return;
    clearErrors();
    const built = buildChargePayload(form);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = props.charge
            ? await store.updateCharge(props.assetPublicId, props.charge.publicId, form)
            : await store.createCharge(props.assetPublicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        applyError(e, 'realEstatePage.errors.chargeNotFound');
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('realEstatePage.form.charge.editTitle') : t('realEstatePage.form.charge.createTitle')"
        :subtitle="t('realEstatePage.form.charge.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div class="re-form">
            <RealEstateFormRow :label="t('realEstatePage.form.fields.name')" for-id="re-charge-name" required :error="fieldErrors.name">
                <v-text-field
                    id="re-charge-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="REAL_ESTATE_NAME_MAX"
                    :error="!!fieldErrors.name"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.chargeType')" required :error="fieldErrors.chargeType">
                <AppSelect
                    v-model="form.chargeType"
                    :items="typeItems"
                    :label="t('realEstatePage.form.fields.chargeType')"
                    searchable
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.amount')"
                for-id="re-charge-amount"
                required
                :error="fieldErrors.amount"
            >
                <v-text-field
                    id="re-charge-amount"
                    v-model="form.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="currency"
                    :error="!!fieldErrors.amount"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.periodicity')" required :error="fieldErrors.periodicity">
                <AppSelect
                    v-model="form.periodicity"
                    :items="periodicityItems"
                    :label="t('realEstatePage.form.fields.periodicity')"
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.startDate')" :error="fieldErrors.startDate">
                <AppDatePicker v-model="startModel" :label="t('realEstatePage.form.fields.startDate')" clearable />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.endDate')"
                :error="fieldErrors.endDate"
                :hint="t('realEstatePage.form.charge.periodHint')"
            >
                <AppDatePicker
                    v-model="endModel"
                    :label="t('realEstatePage.form.fields.endDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.unit')" :error="fieldErrors.unitPublicId">
                <AppSelect v-model="form.unitPublicId" :items="units" :label="t('realEstatePage.form.fields.unit')" hide-details="auto" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.chargeTier')" :error="fieldErrors.tierPublicId">
                <TierPicker
                    v-model="form.tierPublicId"
                    :label="t('realEstatePage.form.fields.chargeTier')"
                    :none-label="t('realEstatePage.form.noTier')"
                    :fallback-label="charge?.tierName ?? undefined"
                    hide-details="auto"
                />
            </RealEstateFormRow>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.re-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
</style>
