<script setup lang="ts">
/**
 * Création / édition d’un bail : locataire (tier), lot louable optionnel, dates, loyer, charges, dépôt,
 * revenu récurrent lié (loyer encaissé). Statut stocké modifiable en édition uniquement.
 */
defineOptions({ name: 'RealEstateRentalFormModal' });

import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import TierPicker from '@/features/tiers/components/forms/TierPicker.vue';
import { useUserSettingsStore } from '@/features/user-settings';
import { useRealEstateForm } from '@/features/real-estate/composables/useRealEstateForm';
import {
    buildCreateRentalPayload,
    buildUpdateRentalPayload,
    emptyRentalFormFields,
    isRentalFormDirty,
    rentalToFormFields,
    type RealEstateRentalFormFields
} from '@/features/real-estate/payload';
import { REAL_ESTATE_NOTES_MAX, RENTAL_STORED_STATUSES, type RealEstateRental } from '@/features/real-estate/types';
import RealEstateFormRow from '@/features/real-estate/components/forms/RealEstateFormRow.vue';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
    rental?: RealEstateRental | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [rental: RealEstateRental];
}>();

const { t } = useI18n();
const settings = useUserSettingsStore();
const { store, fieldErrors, localError, currency, units, unitItems, clearErrors, applyPayloadError, applyError, ensureUnits } =
    useRealEstateForm(() => props.assetPublicId);

const form = reactive<RealEstateRentalFormFields>(emptyRentalFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const isEdit = computed(() => !!props.rental);
const canSave = computed(() => !props.rental || isRentalFormDirty(props.rental, form));
const unitOptions = computed(() => unitItems({ rentableOnly: true, keep: props.rental?.unitPublicId ?? null }));

const statusItems = computed(() => [
    { title: t('realEstatePage.form.rental.statusAuto'), value: '' },
    ...RENTAL_STORED_STATUSES.map((value) => ({ title: t(`realEstatePage.rentalStatuses.${value}`), value }))
]);

const incomeItems = computed(() => {
    const none = { title: t('realEstatePage.form.rental.noIncome'), value: '' };
    const list = store.recurringIncomes.map((income) => ({ title: income.name, value: income.publicId }));
    const current = form.recurringIncomePublicId;
    if (current && !list.some((item) => item.value === current)) list.unshift({ title: current, value: current });
    return [none, ...list];
});

/** Contexte de validation : lots connus + lots louables (le lot déjà lié reste accepté en édition). */
const payloadContext = computed(() => {
    if (!store.isLoaded(props.assetPublicId, 'units')) return {};
    const keep = props.rental?.unitPublicId ?? null;
    return {
        unitIds: new Set(units.value.map((unit) => unit.publicId)),
        rentableUnitIds: new Set(units.value.filter((unit) => unit.isRentable || unit.publicId === keep).map((unit) => unit.publicId))
    };
});

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
        Object.assign(form, props.rental ? rentalToFormFields(props.rental) : emptyRentalFormFields({ today: today.value }));
        ensureUnits();
        void store.loadRecurringIncomes().catch(() => undefined);
    }
);

async function onSave() {
    if (!canSave.value) return;
    clearErrors();
    const built = props.rental
        ? buildUpdateRentalPayload(form, payloadContext.value)
        : buildCreateRentalPayload(form, payloadContext.value);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = props.rental
            ? await store.updateRental(props.assetPublicId, props.rental.publicId, form, payloadContext.value)
            : await store.createRental(props.assetPublicId, form, payloadContext.value);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        applyError(e, 'realEstatePage.errors.rentalNotFound');
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('realEstatePage.form.rental.editTitle') : t('realEstatePage.form.rental.createTitle')"
        :subtitle="t('realEstatePage.form.rental.subtitle')"
        :max-width="640"
        :height="800"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div class="re-form">
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.tenant')"
                required
                :error="fieldErrors.tenantTierPublicId"
                :hint="t('realEstatePage.form.rental.tenantHint')"
            >
                <TierPicker
                    v-model="form.tenantTierPublicId"
                    :label="t('realEstatePage.form.fields.tenant')"
                    :none-label="t('realEstatePage.form.rental.noTenant')"
                    :fallback-label="rental?.tenantName ?? undefined"
                    :error="!!fieldErrors.tenantTierPublicId"
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.unit')"
                :error="fieldErrors.unitPublicId"
                :hint="t('realEstatePage.form.rental.unitHint')"
            >
                <AppSelect
                    v-model="form.unitPublicId"
                    :items="unitOptions"
                    :label="t('realEstatePage.form.fields.unit')"
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.startDate')" required :error="fieldErrors.startDate">
                <AppDatePicker v-model="startModel" :label="t('realEstatePage.form.fields.startDate')" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.endDate')" :error="fieldErrors.endDate">
                <AppDatePicker
                    v-model="endModel"
                    :label="t('realEstatePage.form.fields.endDate')"
                    :min="form.startDate || undefined"
                    clearable
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.monthlyRent')"
                for-id="re-rental-rent"
                required
                :error="fieldErrors.monthlyRent"
            >
                <v-text-field
                    id="re-rental-rent"
                    v-model="form.monthlyRent"
                    type="number"
                    min="0"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="currency"
                    :error="!!fieldErrors.monthlyRent"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.monthlyCharges')"
                for-id="re-rental-charges"
                :error="fieldErrors.monthlyCharges"
            >
                <v-text-field
                    id="re-rental-charges"
                    v-model="form.monthlyCharges"
                    type="number"
                    min="0"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="currency"
                    :error="!!fieldErrors.monthlyCharges"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.deposit')" for-id="re-rental-deposit" :error="fieldErrors.deposit">
                <v-text-field
                    id="re-rental-deposit"
                    v-model="form.deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="currency"
                    :error="!!fieldErrors.deposit"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.recurringIncome')"
                :error="fieldErrors.recurringIncomePublicId"
                :hint="t('realEstatePage.form.rental.incomeHint')"
            >
                <AppSelect
                    v-model="form.recurringIncomePublicId"
                    :items="incomeItems"
                    :label="t('realEstatePage.form.fields.recurringIncome')"
                    searchable
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                v-if="isEdit"
                :label="t('realEstatePage.form.fields.status')"
                :error="fieldErrors.status"
                :hint="t('realEstatePage.form.rental.statusHint')"
            >
                <AppSelect v-model="form.status" :items="statusItems" :label="t('realEstatePage.form.fields.status')" hide-details="auto" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.notes')" for-id="re-rental-notes" :error="fieldErrors.notes">
                <v-textarea
                    id="re-rental-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :maxlength="REAL_ESTATE_NOTES_MAX"
                    :error="!!fieldErrors.notes"
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
