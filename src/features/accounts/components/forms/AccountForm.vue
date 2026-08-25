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

withDefaults(
    defineProps<{
        form: AccountFormFields;
        isEdit: boolean;
        showPrimarySwitch: boolean;
        primarySwitchLocked: boolean;
        primarySwitchHint?: string;
        /** Verrouille type / devise / solde initial / IBAN (rôle editor). */
        ownerFieldsLocked?: boolean;
        typeItems: { title: string; value: AccountType }[];
        currencyItems: { title: string; value: Currency }[];
    }>(),
    {
        primarySwitchHint: undefined,
        ownerFieldsLocked: false
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
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.isPrimary') }}</v-label>
            </v-col>
            <v-col cols="auto" sm="9">
                <AppSwitch v-model="form.isPrimary" :inset="false" :disabled="primarySwitchLocked" />
            </v-col>
            <v-col v-if="primarySwitchHint" cols="12">
                <div class="text-caption text-medium-emphasis">{{ primarySwitchHint }}</div>
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.name') }} *</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field v-model="form.name" color="primary" variant="outlined" hide-details required />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.type') }} *</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
                    v-model="form.type"
                    :items="typeItems"
                    color="primary"
                    variant="outlined"
                    hide-details
                    required
                    :disabled="ownerFieldsLocked"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.currency') }} *</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-select
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
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.initialBalance') }} *</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    v-model.number="form.initialBalance"
                    type="number"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details
                    required
                    :disabled="ownerFieldsLocked"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.iban') }}</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    v-model="form.iban"
                    color="primary"
                    variant="outlined"
                    hide-details
                    :disabled="ownerFieldsLocked"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.accountNumber') }}</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    v-model="form.accountNumber"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    color="primary"
                    variant="outlined"
                    hide-details
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <v-label class="font-weight-medium">{{ t('comptesPage.form.fields.color') }}</v-label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppColorPicker
                    v-model="form.color"
                    :colors="ACCOUNT_COLOR_PRESETS"
                    :label="t('comptesPage.form.fields.color')"
                    :clear-label="t('comptesPage.form.clearColor')"
                    hide-label
                />
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
