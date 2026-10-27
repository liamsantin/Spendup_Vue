<script setup lang="ts">
/** Création / édition d’un lot du bien. */
defineOptions({ name: 'RealEstateUnitFormModal' });

import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { useRealEstateForm } from '@/features/real-estate/composables/useRealEstateForm';
import {
    buildUnitPayload,
    emptyUnitFormFields,
    isUnitFormDirty,
    unitToFormFields,
    type RealEstateUnitFormFields
} from '@/features/real-estate/payload';
import { REAL_ESTATE_NAME_MAX, REAL_ESTATE_NOTES_MAX, UNIT_TYPES, type RealEstateUnit } from '@/features/real-estate/types';
import RealEstateFormRow from '@/features/real-estate/components/forms/RealEstateFormRow.vue';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
    unit?: RealEstateUnit | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [unit: RealEstateUnit];
}>();

const { t } = useI18n();
const { store, fieldErrors, localError, clearErrors, applyPayloadError, applyError } = useRealEstateForm(() => props.assetPublicId);

const form = reactive<RealEstateUnitFormFields>(emptyUnitFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.unit);
const canSave = computed(() => !props.unit || isUnitFormDirty(props.unit, form));
const typeItems = computed(() => UNIT_TYPES.map((value) => ({ title: t(`realEstatePage.unitTypes.${value}`), value })));

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        clearErrors();
        Object.assign(form, props.unit ? unitToFormFields(props.unit) : emptyUnitFormFields());
    }
);

async function onSave() {
    if (!canSave.value) return;
    clearErrors();
    const built = buildUnitPayload(form);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = props.unit
            ? await store.updateUnit(props.assetPublicId, props.unit.publicId, form)
            : await store.createUnit(props.assetPublicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        applyError(e, 'realEstatePage.errors.unitNotFound');
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('realEstatePage.form.unit.editTitle') : t('realEstatePage.form.unit.createTitle')"
        :subtitle="t('realEstatePage.form.unit.subtitle')"
        :max-width="640"
        :height="680"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div class="re-form">
            <RealEstateFormRow :label="t('realEstatePage.form.fields.name')" for-id="re-unit-name" required :error="fieldErrors.name">
                <v-text-field
                    id="re-unit-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="REAL_ESTATE_NAME_MAX"
                    :error="!!fieldErrors.name"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.unitType')" required :error="fieldErrors.unitType">
                <AppSelect
                    v-model="form.unitType"
                    :items="typeItems"
                    :label="t('realEstatePage.form.fields.unitType')"
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.surfaceM2')" for-id="re-unit-surface" :error="fieldErrors.surfaceM2">
                <v-text-field
                    id="re-unit-surface"
                    v-model="form.surfaceM2"
                    type="number"
                    min="0"
                    step="0.1"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    suffix="m²"
                    :error="!!fieldErrors.surfaceM2"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.rooms')" for-id="re-unit-rooms" :error="fieldErrors.rooms">
                <v-text-field
                    id="re-unit-rooms"
                    v-model="form.rooms"
                    type="number"
                    min="0"
                    step="0.5"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.rooms"
                />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.floor')" for-id="re-unit-floor" :error="fieldErrors.floor">
                <v-text-field
                    id="re-unit-floor"
                    v-model="form.floor"
                    type="number"
                    step="1"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.floor"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.isRentable')"
                for-id="re-unit-rentable"
                :hint="t('realEstatePage.form.unit.rentableHint')"
            >
                <AppSwitch id="re-unit-rentable" v-model="form.isRentable" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.notes')" for-id="re-unit-notes" :error="fieldErrors.notes">
                <v-textarea
                    id="re-unit-notes"
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
