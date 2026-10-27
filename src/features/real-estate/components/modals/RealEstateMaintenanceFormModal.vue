<script setup lang="ts">
/** Création / édition de travaux sur le bien (date non future). */
defineOptions({ name: 'RealEstateMaintenanceFormModal' });

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
    buildMaintenancePayload,
    emptyMaintenanceFormFields,
    isMaintenanceFormDirty,
    maintenanceToFormFields,
    type RealEstateMaintenanceFormFields
} from '@/features/real-estate/payload';
import { REAL_ESTATE_DESCRIPTION_MAX, REAL_ESTATE_MAINTENANCE_TYPES, type RealEstateMaintenance } from '@/features/real-estate/types';
import RealEstateFormRow from '@/features/real-estate/components/forms/RealEstateFormRow.vue';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
    maintenance?: RealEstateMaintenance | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [maintenance: RealEstateMaintenance];
}>();

const { t } = useI18n();
const settings = useUserSettingsStore();
const { store, fieldErrors, localError, currency, unitItems, clearErrors, applyPayloadError, applyError, ensureUnits } = useRealEstateForm(
    () => props.assetPublicId
);

const form = reactive<RealEstateMaintenanceFormFields>(emptyMaintenanceFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const isEdit = computed(() => !!props.maintenance);
const canSave = computed(() => !props.maintenance || isMaintenanceFormDirty(props.maintenance, form));
const typeItems = computed(() =>
    REAL_ESTATE_MAINTENANCE_TYPES.map((value) => ({ title: t(`realEstatePage.maintenanceTypes.${value}`), value }))
);
const units = computed(() => unitItems());

const dateModel = computed({
    get: () => form.maintenanceDate,
    set: (value: string | null) => {
        form.maintenanceDate = value;
    }
});
const nextModel = computed({
    get: () => form.nextMaintenanceDate,
    set: (value: string | null) => {
        form.nextMaintenanceDate = value;
    }
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        clearErrors();
        Object.assign(
            form,
            props.maintenance ? maintenanceToFormFields(props.maintenance) : emptyMaintenanceFormFields({ today: today.value })
        );
        ensureUnits();
    }
);

async function onSave() {
    if (!canSave.value) return;
    clearErrors();
    const built = buildMaintenancePayload(form, { today: today.value });
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = props.maintenance
            ? await store.updateMaintenance(props.assetPublicId, props.maintenance.publicId, form)
            : await store.createMaintenance(props.assetPublicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        applyError(e, 'realEstatePage.errors.maintenanceNotFound');
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('realEstatePage.form.maintenance.editTitle') : t('realEstatePage.form.maintenance.createTitle')"
        :subtitle="t('realEstatePage.form.maintenance.subtitle')"
        :max-width="640"
        :height="740"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div class="re-form">
            <RealEstateFormRow :label="t('realEstatePage.form.fields.maintenanceDate')" required :error="fieldErrors.maintenanceDate">
                <AppDatePicker v-model="dateModel" :label="t('realEstatePage.form.fields.maintenanceDate')" :max="today" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.maintenanceType')" required :error="fieldErrors.maintenanceType">
                <AppSelect
                    v-model="form.maintenanceType"
                    :items="typeItems"
                    :label="t('realEstatePage.form.fields.maintenanceType')"
                    searchable
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.description')" for-id="re-maint-desc" :error="fieldErrors.description">
                <v-text-field
                    id="re-maint-desc"
                    v-model="form.description"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="REAL_ESTATE_DESCRIPTION_MAX"
                    :error="!!fieldErrors.description"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.cost')" for-id="re-maint-cost" :error="fieldErrors.cost">
                <v-text-field
                    id="re-maint-cost"
                    v-model="form.cost"
                    type="number"
                    min="0"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="currency"
                    :error="!!fieldErrors.cost"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.nextMaintenanceDate')" :error="fieldErrors.nextMaintenanceDate">
                <AppDatePicker
                    v-model="nextModel"
                    :label="t('realEstatePage.form.fields.nextMaintenanceDate')"
                    :min="form.maintenanceDate || undefined"
                    clearable
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.unit')" :error="fieldErrors.unitPublicId">
                <AppSelect v-model="form.unitPublicId" :items="units" :label="t('realEstatePage.form.fields.unit')" hide-details="auto" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.provider')" :error="fieldErrors.providerTierPublicId">
                <TierPicker
                    v-model="form.providerTierPublicId"
                    :label="t('realEstatePage.form.fields.provider')"
                    :none-label="t('realEstatePage.form.noTier')"
                    :fallback-label="maintenance?.providerTierName ?? undefined"
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
