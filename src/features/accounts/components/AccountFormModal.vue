<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppColorPicker from '@/components/shared/AppColorPicker.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import AppSwitch from '@/components/shared/AppSwitch.vue';
import { useUserSettingsStore } from '@/features/user-settings';
import { getErrorMessage } from '@/utils/errors/app-error';
import { emptyToNull } from '../format';
import { useAccountsStore } from '../stores/accounts-store';
import { ACCOUNT_COLOR_PRESETS, ACCOUNT_TYPES, CURRENCIES, type Account, type AccountType, type Currency } from '../types';

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
    form.accountNumber = '';
    form.color = ACCOUNT_COLOR_PRESETS[0];
    form.isPrimary = false;
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
                isPrimary: form.isPrimary
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
                isPrimary: form.isPrimary
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
        :max-width="560"
        :height="640"
        scrollable
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <v-row dense>
            <v-col cols="12">
                <AppSwitch v-model="form.isPrimary" :label="t('comptesPage.form.fields.isPrimary')" :inset="false" />
            </v-col>
            <v-col cols="12">
                <v-text-field v-model="form.name" :label="t('comptesPage.form.fields.name')" variant="outlined" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6">
                <v-select
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('comptesPage.form.fields.type')"
                    variant="outlined"
                    hide-details="auto"
                />
            </v-col>
            <v-col cols="12" sm="6">
                <v-select
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('comptesPage.form.fields.currency')"
                    variant="outlined"
                    hide-details="auto"
                    :hint="isEdit ? t('comptesPage.form.currencyLockedHint') : undefined"
                    :persistent-hint="isEdit"
                />
            </v-col>
            <v-col cols="12">
                <v-text-field
                    v-model.number="form.initialBalance"
                    type="number"
                    step="0.01"
                    :label="t('comptesPage.form.fields.initialBalance')"
                    variant="outlined"
                    hide-details="auto"
                />
            </v-col>
            <v-col cols="12" sm="8">
                <v-text-field v-model="form.iban" :label="t('comptesPage.form.fields.iban')" variant="outlined" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="4">
                <v-text-field
                    v-model="form.accountNumber"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    :label="t('comptesPage.form.fields.accountNumber')"
                    variant="outlined"
                    hide-details="auto"
                />
            </v-col>
            <v-col cols="12">
                <AppColorPicker
                    v-model="form.color"
                    :colors="ACCOUNT_COLOR_PRESETS"
                    :label="t('comptesPage.form.fields.color')"
                    :clear-label="t('comptesPage.form.clearColor')"
                />
            </v-col>
        </v-row>

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
