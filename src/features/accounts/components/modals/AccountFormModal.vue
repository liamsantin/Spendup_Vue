<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useUserSettingsStore } from '@/features/user-settings';
import { getErrorMessage } from '@/utils/errors/app-error';
import { emptyToNull, isValidAccountColor, isValidIbanFormat, normalizeAccountColor, parseAccountAmount } from '@/features/accounts/format';
import { buildUpdateAccountPayload, shouldValidateAccountIban } from '@/features/accounts/account-form-payload';
import { canEditAccountOwnerFields } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { ACCOUNT_COLOR_PRESETS, ACCOUNT_TYPES, CURRENCIES, type Account, type AccountType, type Currency } from '@/features/accounts/types';
import AccountForm, { type AccountFormFieldErrors } from '@/features/accounts/components/forms/AccountForm.vue';

const props = defineProps<{
    modelValue: boolean;
    account?: Account | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [account: Account];
}>();

const { t } = useI18n();
const store = useAccountsStore();
const settings = useUserSettingsStore();

const isEdit = computed(() => !!props.account);
const isFirstOwnedAccount = computed(() => store.ownedAccounts.length === 0);
const ownerFieldsLocked = computed(() => isEdit.value && !!props.account && !canEditAccountOwnerFields(props.account));
const canManagePrimary = computed(() => !isEdit.value || (props.account?.isOwned === true && props.account.myRole === 'owner'));
const showPrimarySwitch = computed(() => {
    if (!canManagePrimary.value) return false;
    if (!isEdit.value) return true;
    return !!props.account?.isPrimary;
});
const primarySwitchLocked = computed(() => {
    if (!isEdit.value) return isFirstOwnedAccount.value;
    return !!props.account?.isPrimary;
});
const primarySwitchHint = computed(() => {
    if (!isEdit.value && isFirstOwnedAccount.value) return t('comptesPage.hints.primaryFirstAccount');
    if (isEdit.value && props.account?.isPrimary) return t('comptesPage.hints.primaryChangeViaPromote');
    return undefined;
});
const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<AccountFormFieldErrors>({
    name: null,
    initialBalance: null,
    iban: null,
    color: null
});

const form = reactive({
    name: '',
    type: 'courant' as AccountType,
    currency: 'CHF' as Currency,
    initialBalance: 0,
    iban: '',
    accountNumber: '',
    color: ACCOUNT_COLOR_PRESETS[0] as string | null,
    isPrimary: false
});

const typeItems = computed(() => ACCOUNT_TYPES.map((value) => ({ title: t(`comptesPage.types.${value}`), value })));
const currencyItems = computed(() => CURRENCIES.map((value) => ({ title: value, value })));

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.initialBalance = null;
    fieldErrors.iban = null;
    fieldErrors.color = null;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    if (props.account) {
        form.name = props.account.name;
        form.type = props.account.type;
        form.currency = props.account.currency;
        form.initialBalance = props.account.initialBalance ?? 0;
        form.iban = props.account.iban ?? '';
        form.accountNumber = props.account.accountNumber ?? '';
        form.color = props.account.color;
        form.isPrimary = props.account.isPrimary;
        return;
    }
    form.name = '';
    form.type = 'courant';
    form.currency = settings.current.defaultCurrency;
    form.initialBalance = 0;
    form.iban = '';
    const isFirstAccount = store.ownedAccounts.length === 0;
    form.accountNumber = isFirstAccount ? '1' : '';
    form.color = ACCOUNT_COLOR_PRESETS[0];
    form.isPrimary = isFirstAccount;
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) resetForm();
    }
);

async function onSave() {
    localError.message = null;
    clearFieldErrors();
    const name = form.name.trim();
    let hasFieldError = false;
    if (!name) {
        fieldErrors.name = t('comptesPage.form.errors.nameRequired');
        hasFieldError = true;
    }
    const lockOwner = !!props.account && !canEditAccountOwnerFields(props.account);
    if (shouldValidateAccountIban(props.account) && !isValidIbanFormat(form.iban)) {
        fieldErrors.iban = t('comptesPage.form.errors.ibanInvalid');
        hasFieldError = true;
    }
    if (!isValidAccountColor(form.color)) {
        fieldErrors.color = t('comptesPage.form.errors.colorInvalid');
        hasFieldError = true;
    }

    try {
        if (props.account) {
            if (lockOwner) {
                if (hasFieldError) return;
                const payload = buildUpdateAccountPayload(props.account, {
                    name,
                    type: form.type,
                    initialBalance: 0,
                    iban: form.iban,
                    accountNumber: form.accountNumber,
                    color: form.color
                });
                const updated = await store.updateAccount(props.account.publicId, payload);
                emit('saved', updated);
            } else {
                const initialBalance = parseAccountAmount(form.initialBalance);
                if (initialBalance == null) {
                    fieldErrors.initialBalance = t('comptesPage.form.errors.balanceInvalid');
                    hasFieldError = true;
                }
                if (hasFieldError || initialBalance == null) return;

                const payload = buildUpdateAccountPayload(props.account, {
                    name,
                    type: form.type,
                    initialBalance,
                    iban: form.iban,
                    accountNumber: form.accountNumber,
                    color: form.color
                });
                const updated = await store.updateAccount(props.account.publicId, payload);
                emit('saved', updated);
            }
        } else {
            const initialBalance = parseAccountAmount(form.initialBalance);
            if (initialBalance == null) {
                fieldErrors.initialBalance = t('comptesPage.form.errors.balanceInvalid');
                hasFieldError = true;
            }
            if (hasFieldError || initialBalance == null) return;

            const created = await store.createAccount({
                name,
                type: form.type,
                currency: form.currency,
                initialBalance,
                iban: emptyToNull(form.iban),
                accountNumber: emptyToNull(form.accountNumber),
                color: normalizeAccountColor(form.color),
                isPrimary: isFirstOwnedAccount.value ? true : form.isPrimary
            });
            emit('saved', created);
        }
        open.value = false;
    } catch (e: unknown) {
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('comptesPage.form.editTitle') : t('comptesPage.form.createTitle')"
        :subtitle="t('comptesPage.form.subtitle')"
        :max-width="640"
        :height="640"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" color="error" variant="tonal" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <AccountForm
            :form="form"
            :is-edit="isEdit"
            :show-primary-switch="showPrimarySwitch"
            :primary-switch-locked="primarySwitchLocked"
            :primary-switch-hint="primarySwitchHint"
            :owner-fields-locked="ownerFieldsLocked"
            :field-errors="fieldErrors"
            :type-items="typeItems"
            :currency-items="currencyItems"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
