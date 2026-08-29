<script setup lang="ts">
/**
 * Champs du formulaire compte. Indépendant du shell modal (dialog / sheet / fullscreen).
 * `form` est un objet réactif détenu par le parent ; la mutation des champs est intentionnelle.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'AccountForm' });

import { useI18n } from 'vue-i18n';
import AppColorPicker from '@/components/shared/color-picker/AppColorPicker.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { ACCOUNT_COLOR_PRESETS, type AccountType, type Currency } from '@/features/accounts/types';

export type AccountFormFields = {
    name: string;
    type: AccountType;
    currency: Currency;
    initialBalance: number;
    iban: string;
    accountNumber: string;
    color: string | null;
    isPrimary: boolean;
};

export type AccountFormFieldErrors = {
    name?: string | null;
    initialBalance?: string | null;
    iban?: string | null;
    color?: string | null;
};

withDefaults(
    defineProps<{
        form: AccountFormFields;
        isEdit: boolean;
        showPrimarySwitch: boolean;
        primarySwitchLocked: boolean;
        primarySwitchHint?: string;
        /** Verrouille type / devise / solde initial / IBAN (rôle editor). */
        ownerFieldsLocked?: boolean;
        fieldErrors?: AccountFormFieldErrors;
        typeItems: { title: string; value: AccountType }[];
        currencyItems: { title: string; value: Currency }[];
    }>(),
    {
        primarySwitchHint: undefined,
        ownerFieldsLocked: false,
        fieldErrors: () => ({})
    }
);

const { t } = useI18n();
</script>

<template>
    <div class="account-form">
        <div v-if="ownerFieldsLocked" class="text-caption text-medium-emphasis mb-1">
            {{ t('comptesPage.form.ownerFieldsLockedHint') }}
        </div>
        <v-row v-if="showPrimarySwitch" class="align-center" no-gutters>
            <v-col cols="auto" sm="3" class="pr-3">
                <label class="v-label font-weight-medium" for="account-form-is-primary">
                    {{ t('comptesPage.form.fields.isPrimary') }}
                </label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch id="account-form-is-primary" v-model="form.isPrimary" :inset="false" :disabled="primarySwitchLocked" />
            </v-col>
            <v-col v-if="primarySwitchHint" cols="12">
                <div class="text-caption text-medium-emphasis">{{ primarySwitchHint }}</div>
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-name"> {{ t('comptesPage.form.fields.name') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="account-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    required
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-type"> {{ t('comptesPage.form.fields.type') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
                    id="account-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    required
                    :disabled="ownerFieldsLocked"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-currency">
                    {{ t('comptesPage.form.fields.currency') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
                    id="account-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    required
                    :disabled="isEdit || ownerFieldsLocked"
                    :hint="isEdit ? t('comptesPage.form.currencyLockedHint') : undefined"
                    :persistent-hint="isEdit"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-initial-balance">
                    {{ t('comptesPage.form.fields.initialBalance') }} *
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="account-form-initial-balance"
                    v-model.number="form.initialBalance"
                    type="number"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    required
                    :disabled="ownerFieldsLocked"
                    :error="!!fieldErrors.initialBalance"
                    :error-messages="fieldErrors.initialBalance || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-iban">
                    {{ t('comptesPage.form.fields.iban') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="account-form-iban"
                    v-model="form.iban"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :disabled="ownerFieldsLocked"
                    :error="!!fieldErrors.iban"
                    :error-messages="fieldErrors.iban || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="account-form-account-number">
                    {{ t('comptesPage.form.fields.accountNumber') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="account-form-account-number"
                    v-model="form.accountNumber"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <span class="v-label font-weight-medium" id="account-form-color-label">
                    {{ t('comptesPage.form.fields.color') }}
                </span>
            </v-col>
            <v-col cols="12" sm="9">
                <AppColorPicker
                    v-model="form.color"
                    :colors="ACCOUNT_COLOR_PRESETS"
                    :label="t('comptesPage.form.fields.color')"
                    :clear-label="t('comptesPage.form.clearColor')"
                    hide-label
                />
                <div v-if="fieldErrors.color" class="text-caption text-error mt-1">{{ fieldErrors.color }}</div>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.account-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .account-form {
        gap: 12px;
    }

    .account-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
