<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useUserSettingsStore } from '@/features/user-settings';
import { getErrorMessage } from '@/utils/errors/app-error';
import { emptyToNull } from '../../format';
import { useAccountsStore } from '../../stores/accounts-store';
import { ACCOUNT_COLOR_PRESETS, ACCOUNT_TYPES, CURRENCIES, type Account, type AccountType, type Currency } from '../../types';
import AccountForm from '../forms/AccountForm.vue';

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

function resetForm() {
    localError.message = null;
    if (props.account) {
        form.name = props.account.name;
        form.type = props.account.type;
        form.currency = props.account.currency;
        form.initialBalance = props.account.initialBalance;
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
    const name = form.name.trim();
    if (!name) {
        localError.message = t('comptesPage.form.errors.nameRequired');
        return;
    }

    try {
        if (props.account) {
            const updated = await store.updateAccount(props.account.publicId, {
                name,
                type: form.type,
                currency: form.currency,
                initialBalance: Number(form.initialBalance) || 0,
                iban: emptyToNull(form.iban),
                accountNumber: emptyToNull(form.accountNumber),
                color: emptyToNull(form.color),
                isPrimary: props.account.isPrimary
            });
            emit('saved', updated);
        } else {
            const created = await store.createAccount({
                name,
                type: form.type,
                currency: form.currency,
                initialBalance: Number(form.initialBalance) || 0,
                iban: emptyToNull(form.iban),
                accountNumber: emptyToNull(form.accountNumber),
                color: emptyToNull(form.color),
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
        :mobile-layout="isEdit ? 'sheet' : 'fullscreen'"
    >
        <AppAlert
            v-if="localError.message"
            color="error"
            variant="tonal"
            class="mb-4"
            closable
            :dismiss-ms="3000"
            @dismiss="localError.message = null"
        >
            {{ localError.message }}
        </AppAlert>

        <AccountForm
            :form="form"
            :is-edit="isEdit"
            :show-primary-switch="showPrimarySwitch"
            :primary-switch-locked="primarySwitchLocked"
            :primary-switch-hint="primarySwitchHint"
            :type-items="typeItems"
            :currency-items="currencyItems"
        />

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting" @click="onSave">
                {{ t('common.save') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
