<script setup lang="ts">
/**
 * Modèle d’import perso : création depuis un import (`save-as-template`) ou édition
 * (nom, banque, actif). Le mapping n’est pas éditable ici : il vient de l’import d’origine.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import BankPicker from '@/features/banks/components/BankPicker.vue';
import { bankChoiceFromTier } from '@/features/banks/format';
import type { BankChoice } from '@/features/banks/types';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import { IMPORT_TEMPLATE_NAME_MAX, type ImportTemplate } from '@/features/imports/types';

const props = defineProps<{
    modelValue: boolean;
    /** Édition d’un modèle perso existant. */
    template?: ImportTemplate | null;
    /** Création depuis cet import (mapping retenu). */
    importPublicId?: string | null;
    defaultName?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [template: ImportTemplate];
}>();

const { t } = useI18n();
const store = useImportsStore();
const tiersStore = useTiersStore();

const name = ref('');
/** « Mes banques » uniquement : un tier non banque → `400`. */
const bank = ref<BankChoice | null>(null);
const bankTierPublicId = computed(() => (bank.value?.kind === 'tier' ? bank.value.tierPublicId : ''));
const isActive = ref(true);
const nameError = ref<string | null>(null);
const localError = ref<string | null>(null);

const isEdit = computed(() => !!props.template);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (store.acting || !name.value.trim()) return false;
    const template = props.template;
    if (!template) return true;
    return (
        name.value.trim() !== template.name ||
        (bankTierPublicId.value || null) !== template.bankTierPublicId ||
        isActive.value !== template.isActive
    );
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        localError.value = null;
        nameError.value = null;
        name.value = props.template?.name ?? props.defaultName?.trim().slice(0, IMPORT_TEMPLATE_NAME_MAX) ?? '';
        bank.value = initialBank(props.template?.bankTierPublicId ?? null);
        isActive.value = props.template?.isActive ?? true;
    }
);

function initialBank(tierPublicId: string | null): BankChoice | null {
    if (!tierPublicId) return null;
    const tier = tiersStore.findByPublicId(tierPublicId);
    if (tier) return bankChoiceFromTier(tier);
    void tiersStore
        .fetchTier(tierPublicId)
        .then((found) => {
            if (found && bank.value?.kind === 'tier' && bank.value.tierPublicId === tierPublicId) bank.value = bankChoiceFromTier(found);
        })
        .catch(() => undefined);
    return { kind: 'tier', tierPublicId, name: '…', bankPublicId: null, bankName: null };
}

async function onSave() {
    const trimmed = name.value.trim();
    nameError.value = null;
    localError.value = null;
    if (!trimmed) {
        nameError.value = t('importsPage.templateForm.errors.nameRequired');
        return;
    }
    if (trimmed.length > IMPORT_TEMPLATE_NAME_MAX) {
        nameError.value = t('importsPage.templateForm.errors.nameTooLong', { max: IMPORT_TEMPLATE_NAME_MAX });
        return;
    }
    try {
        const bankTier = bankTierPublicId.value || null;
        let saved: ImportTemplate;
        if (props.template) {
            saved = await store.updateTemplate(props.template, { name: trimmed, bankTierPublicId: bankTier, isActive: isActive.value });
        } else if (props.importPublicId) {
            saved = await store.saveImportAsTemplate(props.importPublicId, { name: trimmed, bankTierPublicId: bankTier });
        } else {
            return;
        }
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
        :title="isEdit ? t('importsPage.templateForm.editTitle') : t('importsPage.templateForm.createTitle')"
        :subtitle="isEdit ? t('importsPage.templateForm.editSubtitle') : t('importsPage.templateForm.createSubtitle')"
        :max-width="520"
        :scrollable="false"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <div class="import-template-form">
            <v-text-field
                v-model="name"
                :label="t('importsPage.templateForm.fields.name')"
                color="primary"
                variant="outlined"
                hide-details="auto"
                :maxlength="IMPORT_TEMPLATE_NAME_MAX"
                :error="!!nameError"
                :error-messages="nameError || undefined"
                autofocus
                @keydown.enter="onSave"
            />
            <BankPicker
                v-model="bank"
                :label="t('importsPage.templateForm.fields.bank')"
                :show-registry="false"
                :none-label="t('importsPage.templateForm.noBank')"
                :hint="t('importsPage.templateForm.bankHint')"
                persistent-hint
                hide-details="auto"
            />
            <AppSwitch v-if="isEdit" v-model="isActive" :label="t('importsPage.templateForm.fields.active')" />
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canSave" @click="onSave">{{ t('common.save') }}</button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.import-template-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
</style>
