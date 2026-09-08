<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import {
    buildCreateTierPayload,
    buildUpdateTierPayload,
    emptyTierFormFields,
    isTierFormDirty,
    tierToFormFields,
    type TierFormFields,
    type TierPayloadErrorCode
} from '@/features/tiers/payload';
import { TIER_NATURES, type Tier, type TierNature, type TierRole } from '@/features/tiers/types';
import TierForm, { type TierFormFieldErrors } from '@/features/tiers/components/forms/TierForm.vue';

const props = defineProps<{
    modelValue: boolean;
    tier?: Tier | null;
    /** Pré-remplit le nom (création rapide depuis un sélecteur). */
    defaultName?: string | null;
    defaultNature?: TierNature | null;
    defaultRoles?: TierRole[] | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [tier: Tier];
}>();

const { t } = useI18n();
const store = useTiersStore();

const isEdit = ref(false);
const editTier = ref<Tier | null>(null);

const natureItems = computed(() => TIER_NATURES.map((value) => ({ title: t(`tiersPage.natures.${value}`), value })));

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<TierFormFieldErrors>({});

const form = reactive<TierFormFields>(emptyTierFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const natureHint = computed(() =>
    isEdit.value && editTier.value && form.nature !== editTier.value.nature ? t('tiersPage.form.natureChangeHint') : null
);

const canSave = computed(() => {
    if (!isEdit.value || !editTier.value) return true;
    return isTierFormDirty(editTier.value, form);
});

function clearFieldErrors() {
    for (const key of Object.keys(fieldErrors) as (keyof TierFormFieldErrors)[]) {
        fieldErrors[key] = null;
    }
}

function applyPayloadErrors(code: TierPayloadErrorCode, field?: string) {
    const message = t(`tiersPage.form.errors.${code}`);
    if (field) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function assignForm(next: TierFormFields) {
    form.name = next.name;
    form.nature = next.nature;
    form.email = next.email;
    form.phone = next.phone;
    form.website = next.website;
    form.notes = next.notes;
    form.roles = [...next.roles];
    form.person = { ...next.person };
    form.company = { ...next.company };
    form.organization = { ...next.organization };
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const tier = editTier.value;
    if (tier) {
        assignForm(tierToFormFields(tier));
        return;
    }
    const next = emptyTierFormFields(props.defaultNature || 'company');
    next.name = props.defaultName?.trim() || '';
    next.roles = [...(props.defaultRoles ?? [])];
    assignForm(next);
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.tier;
        editTier.value = props.tier ?? null;
        resetForm();
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const context = { knownTiers: store.allKnownItems(), excludePublicId: editTier.value?.publicId ?? null };
    const built = isEdit.value ? buildUpdateTierPayload(form, context) : buildCreateTierPayload(form, context);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved = isEdit.value && editTier.value ? await store.updateTier(editTier.value.publicId, form) : await store.createTier(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('tiersPage.errors.notFound');
            return;
        }
        if (err.status === 400 && err.code && err.code in (fieldErrors as object)) {
            applyPayloadErrors(err.code as TierPayloadErrorCode);
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('tiersPage.form.editTitle') : t('tiersPage.form.createTitle')"
        :subtitle="t('tiersPage.form.subtitle')"
        :max-width="680"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <TierForm :form="form" :is-edit="isEdit" :nature-items="natureItems" :field-errors="fieldErrors" :nature-hint="natureHint" />

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
