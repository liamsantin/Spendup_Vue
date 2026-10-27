<script setup lang="ts">
/**
 * Création (ami, transaction optionnelle, montant, libellé, devise, échéance)
 * ou édition (libellé, montant, échéance — tant que rien n’est remboursé) d’une dette entre amis.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { getFriendDisplayNameFromItem, useFriendsStore } from '@/features/friends';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatCalendarDate, formatSharedDebtAmount, isSharedDebtCurrency } from '@/features/shared-debts/format';
import {
    buildCreateSharedDebtPayload,
    buildUpdateSharedDebtPayload,
    emptySharedDebtFormFields,
    isSharedDebtFormDirty,
    sharedDebtToFormFields,
    type SharedDebtFormFields,
    type SharedDebtPayloadErrorCode
} from '@/features/shared-debts/payload';
import { useSharedDebtsStore } from '@/features/shared-debts/stores/shared-debts-store';
import type { SharedDebt, SharedDebtCurrency } from '@/features/shared-debts/types';
import SharedDebtForm, { type SharedDebtFormFieldErrors } from '@/features/shared-debts/components/forms/SharedDebtForm.vue';

const props = defineProps<{
    modelValue: boolean;
    /** Dette à éditer ; absent = création. */
    sharedDebt?: SharedDebt | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [debt: SharedDebt];
}>();

const { t, locale } = useI18n();
const store = useSharedDebtsStore();
const friendsStore = useFriendsStore();
const settings = useUserSettingsStore();

const editDebt = ref<SharedDebt | null>(null);
const isEdit = computed(() => !!editDebt.value);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<SharedDebtFormFieldErrors>({});
const form = reactive<SharedDebtFormFields>(emptySharedDebtFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const friendItems = computed(() =>
    friendsStore.friends.map((friend) => ({ title: getFriendDisplayNameFromItem(friend), value: friend.user.publicId }))
);

const transactionItems = computed(() =>
    store.expenseCandidates.map((tx) => ({
        title: [
            tx.label,
            formatCalendarDate(tx.operationDate, locale.value),
            tx.amount != null ? formatSharedDebtAmount(tx.amount, tx.currency) : null
        ]
            .filter(Boolean)
            .join(' · '),
        value: tx.publicId
    }))
);

const selectedTransaction = computed(() => {
    const id = form.transactionPublicId.trim();
    if (!id) return null;
    return store.expenseCandidates.find((tx) => tx.publicId === id) ?? null;
});

const transactionCurrency = computed<SharedDebtCurrency | null>(() => {
    const currency = selectedTransaction.value?.currency;
    return isSharedDebtCurrency(currency) ? currency : null;
});

const currencyHint = computed(() => {
    if (isEdit.value) return t('sharedDebtsPage.form.currencyLockedHint');
    if (selectedTransaction.value) return t('sharedDebtsPage.form.currencyFromTransactionHint');
    return t('sharedDebtsPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const canSave = computed(() => {
    if (!isEdit.value || !editDebt.value) return true;
    return isSharedDebtFormDirty(editDebt.value, form);
});

const modalTitle = computed(() => (isEdit.value ? t('sharedDebtsPage.form.editTitle') : t('sharedDebtsPage.form.createTitle')));

function clearFieldErrors() {
    fieldErrors.debtorUserPublicId = null;
    fieldErrors.transactionPublicId = null;
    fieldErrors.label = null;
    fieldErrors.amount = null;
    fieldErrors.currency = null;
    fieldErrors.dueDate = null;
}

function applyPayloadError(code: SharedDebtPayloadErrorCode, field?: string) {
    const message = t(`sharedDebtsPage.form.errors.${code}`);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    if (editDebt.value) {
        Object.assign(form, sharedDebtToFormFields(editDebt.value));
        return;
    }
    Object.assign(form, emptySharedDebtFormFields({ currency: settings.current.defaultCurrency }));
}

/** Libellé prérempli depuis la transaction (remplacé uniquement s’il est vide ou encore égal au précédent). */
let lastTransactionLabel: string | null = null;

watch(selectedTransaction, (tx) => {
    if (isEdit.value) return;
    if (tx) {
        if (isSharedDebtCurrency(tx.currency)) form.currency = tx.currency;
        if (!form.label.trim() || form.label === lastTransactionLabel) form.label = tx.label;
        lastTransactionLabel = tx.label;
        return;
    }
    if (lastTransactionLabel && form.label === lastTransactionLabel) form.label = '';
    lastTransactionLabel = null;
    form.currency = settings.current.defaultCurrency;
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        editDebt.value = props.sharedDebt ?? null;
        lastTransactionLabel = null;
        resetForm();
        if (isEdit.value) return;
        if (!friendsStore.initialized || !friendsStore.friends.length) {
            void friendsStore.loadFriends().catch(() => undefined);
        }
        void store.loadExpenseCandidates().catch(() => undefined);
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const built = isEdit.value
        ? buildUpdateSharedDebtPayload(form)
        : buildCreateSharedDebtPayload(form, { transactionCurrency: transactionCurrency.value });
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = editDebt.value
            ? await store.updateSharedDebt(editDebt.value.publicId, form)
            : await store.createSharedDebt(form, { transactionCurrency: transactionCurrency.value });
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('sharedDebtsPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="modalTitle"
        :subtitle="isEdit ? t('sharedDebtsPage.form.editSubtitle') : t('sharedDebtsPage.form.createSubtitle')"
        :max-width="640"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <SharedDebtForm
            :form="form"
            :is-edit="isEdit"
            :friend-items="friendItems"
            :transaction-items="transactionItems"
            :friends-loading="friendsStore.loadingFriends"
            :transactions-loading="store.expenseCandidatesLoading"
            :currency-locked="!!selectedTransaction"
            :field-errors="fieldErrors"
            :currency-hint="currencyHint"
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
