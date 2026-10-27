<script setup lang="ts">
/**
 * Création / édition d’un entretien de véhicule. Garage = `TierPicker` (tier possédé).
 * `transactionPublicId` n’a pas encore de sélecteur : il est conservé tel quel en édition, `null` en création.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { TierPicker } from '@/features/tiers';
import { useUserSettingsStore } from '@/features/user-settings';
import {
    buildSaveMaintenancePayload,
    emptyVehicleMaintenanceFormFields,
    vehicleMaintenanceToFormFields,
    type AssetPayloadErrorCode,
    type VehicleMaintenanceFormFields
} from '@/features/assets/payload';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import {
    VEHICLE_MAINTENANCE_DESCRIPTION_MAX,
    VEHICLE_MAINTENANCE_TYPES,
    type Asset,
    type VehicleMaintenance
} from '@/features/assets/types';
import AssetFormRow from '@/features/assets/components/forms/AssetFormRow.vue';
import type { AssetFieldErrors } from '@/features/assets/components/forms/asset-form-errors';

const props = defineProps<{
    modelValue: boolean;
    asset: Asset;
    maintenance?: VehicleMaintenance | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [maintenance: VehicleMaintenance];
}>();

const { t } = useI18n();
const store = useAssetsStore();
const settings = useUserSettingsStore();

const editTarget = ref<VehicleMaintenance | null>(null);
const form = reactive<VehicleMaintenanceFormFields>(emptyVehicleMaintenanceFormFields());
const fieldErrors = reactive<AssetFieldErrors>({});
const localError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const isEdit = computed(() => !!editTarget.value);
const title = computed(() => (isEdit.value ? t('assetsPage.maintenances.editTitle') : t('assetsPage.maintenances.createTitle')));
const typeItems = computed(() => VEHICLE_MAINTENANCE_TYPES.map((value) => ({ title: t(`assetsPage.maintenanceTypes.${value}`), value })));

const maintenanceDateModel = computed({
    get: () => form.maintenanceDate,
    set: (value: string | null) => {
        form.maintenanceDate = value;
    }
});

const nextDateModel = computed({
    get: () => form.nextMaintenanceDate,
    set: (value: string | null) => {
        form.nextMaintenanceDate = value;
    }
});

const err = (key: string) => fieldErrors[key] || undefined;

function clearFieldErrors() {
    for (const key of Object.keys(fieldErrors)) delete fieldErrors[key];
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        editTarget.value = props.maintenance ?? null;
        localError.value = null;
        clearFieldErrors();
        Object.assign(
            form,
            props.maintenance ? vehicleMaintenanceToFormFields(props.maintenance) : emptyVehicleMaintenanceFormFields({ date: today.value })
        );
    },
    { immediate: true }
);

function applyError(code: AssetPayloadErrorCode, field?: string) {
    const message = t(`assetsPage.form.errors.${code}`);
    if (field) fieldErrors[field] = message;
    else localError.value = message;
}

async function onSave() {
    localError.value = null;
    clearFieldErrors();
    const ctx = { today: today.value };
    const built = buildSaveMaintenancePayload(form, ctx);
    if (!built.ok) {
        applyError(built.code, built.field);
        return;
    }
    try {
        const saved = editTarget.value
            ? await store.updateMaintenance(props.asset.publicId, editTarget.value.publicId, form, ctx)
            : await store.createMaintenance(props.asset.publicId, form, ctx);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="title"
        :subtitle="t('assetsPage.maintenances.subtitle')"
        :max-width="600"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div class="maintenance-form">
            <AssetFormRow :label="t('assetsPage.maintenances.fields.maintenanceDate')" required :error="err('maintenanceDate')">
                <AppDatePicker
                    v-model="maintenanceDateModel"
                    :label="t('assetsPage.maintenances.fields.maintenanceDate')"
                    :max="today"
                    :clearable="false"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.maintenanceType')" for-id="maintenance-type" required>
                <AppSelect
                    id="maintenance-type"
                    v-model="form.maintenanceType"
                    :items="typeItems"
                    :label="t('assetsPage.maintenances.fields.maintenanceType')"
                    hide-details="auto"
                    :error="!!err('maintenanceType')"
                    :error-messages="err('maintenanceType')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.kilometrage')" for-id="maintenance-km">
                <v-text-field
                    id="maintenance-km"
                    v-model="form.kilometrage"
                    type="number"
                    step="1"
                    min="0"
                    suffix="km"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!err('kilometrage')"
                    :error-messages="err('kilometrage')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.garage')">
                <TierPicker
                    v-model="form.garageTierPublicId"
                    :label="t('assetsPage.maintenances.fields.garage')"
                    :none-label="t('assetsPage.maintenances.noGarage')"
                    :fallback-label="editTarget?.garageTierName ?? undefined"
                    hide-details="auto"
                    :error="!!err('garageTierPublicId')"
                    :error-messages="err('garageTierPublicId')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.cost', { currency: asset.currency })" for-id="maintenance-cost">
                <v-text-field
                    id="maintenance-cost"
                    v-model="form.cost"
                    type="number"
                    step="0.01"
                    min="0"
                    :suffix="asset.currency"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!err('cost')"
                    :error-messages="err('cost')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.description')" for-id="maintenance-description">
                <v-text-field
                    id="maintenance-description"
                    v-model="form.description"
                    :maxlength="VEHICLE_MAINTENANCE_DESCRIPTION_MAX"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!err('description')"
                    :error-messages="err('description')"
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.nextMaintenanceDate')" :error="err('nextMaintenanceDate')">
                <AppDatePicker
                    v-model="nextDateModel"
                    :label="t('assetsPage.maintenances.fields.nextMaintenanceDate')"
                    :min="form.maintenanceDate || undefined"
                    clearable
                />
            </AssetFormRow>
            <AssetFormRow :label="t('assetsPage.maintenances.fields.nextMaintenanceKm')" for-id="maintenance-next-km">
                <v-text-field
                    id="maintenance-next-km"
                    v-model="form.nextMaintenanceKm"
                    type="number"
                    step="1"
                    min="0"
                    suffix="km"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!err('nextMaintenanceKm')"
                    :error-messages="err('nextMaintenanceKm')"
                />
            </AssetFormRow>
            <p v-if="form.transactionPublicId" class="maintenance-form__hint">{{ t('assetsPage.maintenances.transactionHint') }}</p>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.maintenance-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.maintenance-form__hint {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}
</style>
