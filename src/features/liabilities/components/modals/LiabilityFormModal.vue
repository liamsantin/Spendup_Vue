<script setup lang="ts">
/**
 * Création / édition d’un passif (`AppModalBase`). En édition : devise figée, interrupteur « Annulé ».
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useAssetsStore } from '@/features/assets';
import { formatLiabilityAmount } from '@/features/liabilities/format';
import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';
import {
    buildCreateLiabilityPayload,
    buildUpdateLiabilityPayload,
    emptyLiabilityFormFields,
    isLiabilityFormDirty,
    liabilityToFormFields,
    type LiabilityFormFields,
    type LiabilityPayloadErrorCode
} from '@/features/liabilities/payload';
import type { Liability } from '@/features/liabilities/types';
import { useUserSettingsStore } from '@/features/user-settings';
import LiabilityForm, { type LiabilityFormFieldErrors } from '@/features/liabilities/components/forms/LiabilityForm.vue';

const props = defineProps<{
    modelValue: boolean;
    liability?: Liability | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [liability: Liability];
}>();

const { t, locale } = useI18n();
const store = useLiabilitiesStore();
const assetsStore = useAssetsStore();
const settings = useUserSettingsStore();

const isEditSession = ref(false);
const editTarget = ref<Liability | null>(null);
const isEdit = computed(() => isEditSession.value || !!props.liability);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<LiabilityFormFieldErrors>({});
const form = reactive<LiabilityFormFields>(emptyLiabilityFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const liveLiability = computed(() => {
    const id = editTarget.value?.publicId;
    if (!id) return editTarget.value;
    return store.findByPublicId(id) ?? editTarget.value;
});

/** Actifs actifs du user (+ l’actif déjà lié, même vendu) : « nom · type ». */
const assetItems = computed(() => {
    const none = [{ title: t('liabilitiesPage.form.noAsset'), value: '' }];
    const currentId = form.assetPublicId;
    const items = assetsStore
        .allKnownItems()
        .filter((asset) => asset.isActive || asset.publicId === currentId)
        .map((asset) => ({ title: `${asset.name} · ${t(`assetsPage.types.${asset.type}`)}`, value: asset.publicId }));
    return [...none, ...items];
});

const currencyHint = computed(() => {
    if (isEdit.value) return t('liabilitiesPage.form.currencyLockedHint');
    return t('liabilitiesPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const remainingHint = computed(() => {
    const current = liveLiability.value;
    if (!isEdit.value || !current) return t('liabilitiesPage.form.remainingCreateHint');
    return t('liabilitiesPage.form.remainingEditHint', {
        repaid: formatLiabilityAmount(current.repaidAmount, current.currency, locale.value)
    });
});

const canSave = computed(() => {
    if (!isEdit.value || !editTarget.value) return true;
    return isLiabilityFormDirty(editTarget.value, form);
});

const modalTitle = computed(() => {
    if (!isEdit.value) return t('liabilitiesPage.form.createTitle');
    return liveLiability.value?.name || t('liabilitiesPage.form.editTitle');
});

function clearFieldErrors() {
    for (const key of Object.keys(fieldErrors) as (keyof LiabilityFormFieldErrors)[]) fieldErrors[key] = null;
}

function applyPayloadError(code: LiabilityPayloadErrorCode, field?: string) {
    const message = t(`liabilitiesPage.form.errors.${code}`);
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
        Object.assign(form, liabilityToFormFields(current));
        return;
    }
    Object.assign(
        form,
        emptyLiabilityFormFields({
            currency: settings.current.defaultCurrency,
            startDate: todayYmdInTimeZone(settings.current.timezone)
        })
    );
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEditSession.value = !!props.liability;
        editTarget.value = props.liability ?? null;
        resetForm();
        if (!assetsStore.initialized) {
            void assetsStore.loadList({ active: true }).catch(() => undefined);
        }
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const built = isEdit.value
        ? buildUpdateLiabilityPayload(form, { lockedCurrency: editTarget.value?.currency ?? null })
        : buildCreateLiabilityPayload(form);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && editTarget.value
                ? await store.updateLiability(editTarget.value.publicId, form, { lockedCurrency: editTarget.value.currency })
                : await store.createLiability(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('liabilitiesPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="modalTitle"
        :subtitle="t('liabilitiesPage.form.subtitle')"
        :max-width="640"
        :height="800"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <LiabilityForm
            :form="form"
            :is-edit="isEdit"
            :asset-items="assetItems"
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
