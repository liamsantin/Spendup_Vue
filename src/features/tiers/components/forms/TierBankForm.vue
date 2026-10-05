<script setup lang="ts">
/**
 * Volet banque d’un tier (onglet « Banque » de la fiche). `form` est détenu par le parent.
 * Référentiel SIX (`bankPublicId`) ou banque hors référentiel (BIC / IID).
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TierBankForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import BankPicker from '@/features/banks/components/BankPicker.vue';
import type { BankChoice } from '@/features/banks/types';
import { TIER_NAME_MAX } from '@/features/tiers/types';
import type { TierFormFields } from '@/features/tiers/payload';

export type TierBankFormFieldErrors = {
    bank?: string | null;
    'bank.bic'?: string | null;
    'bank.iid'?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: TierFormFields;
        fieldErrors?: TierBankFormFieldErrors;
        /** Volet imposé (page Banques) : le tier est forcément une banque, pas d’interrupteur. */
        locked?: boolean;
    }>(),
    { fieldErrors: () => ({}), locked: false }
);

const { t } = useI18n();

/** Établissement du référentiel choisi pour le volet banque. */
const registryChoice = computed<BankChoice | null>({
    get: () => {
        const bank = props.form.bank;
        if (!bank.bankPublicId) return null;
        return { kind: 'registry' as const, bankPublicId: bank.bankPublicId, name: bank.bankName || bank.bankPublicId };
    },
    set: (choice) => {
        const bank = props.form.bank;
        if (choice?.kind !== 'registry') {
            bank.bankPublicId = '';
            bank.bankName = '';
            return;
        }
        bank.bankPublicId = choice.bankPublicId;
        bank.bankName = choice.name;
        if (!props.form.name.trim()) props.form.name = choice.name.slice(0, TIER_NAME_MAX);
    }
});

function setBankMode(mode: 'registry' | 'custom') {
    props.form.bank.mode = mode;
}
</script>

<template>
    <div class="tier-bank-form">
        <div v-if="locked" class="text-caption text-medium-emphasis">{{ t('tiersPage.form.bankLockedHint') }}</div>
        <v-row v-else class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tier-form-is-bank">{{ t('tiersPage.form.fields.isBank') }}</label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSwitch id="tier-form-is-bank" v-model="form.bank.enabled" />
            </v-col>
            <v-col cols="12">
                <div class="text-caption text-medium-emphasis">{{ t('tiersPage.form.bankHint') }}</div>
            </v-col>
        </v-row>
        <template v-if="form.bank.enabled">
            <v-row v-if="form.bank.mode === 'registry'" class="align-center" no-gutters>
                <v-col cols="12" sm="3" class="pr-sm-3">
                    <label class="v-label font-weight-medium" for="tier-form-bank">{{ t('tiersPage.form.fields.bank') }} *</label>
                </v-col>
                <v-col cols="12" sm="9">
                    <BankPicker
                        id="tier-form-bank"
                        v-model="registryChoice"
                        :label="t('tiersPage.form.fields.bank')"
                        :show-my-banks="false"
                        :allow-none="false"
                        :error-messages="fieldErrors.bank || undefined"
                        hide-details="auto"
                    />
                    <div class="tier-bank-form__custom mt-2">
                        <span class="text-caption text-medium-emphasis">{{ t('tiersPage.form.bankNotListed') }}</span>
                        <button type="button" class="su-btn su-btn--ghost tier-bank-form__switch-mode" @click="setBankMode('custom')">
                            {{ t('tiersPage.form.bankCustom') }}
                        </button>
                    </div>
                </v-col>
            </v-row>
            <template v-else>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-bic">{{ t('tiersPage.form.fields.bic') }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
                        <v-text-field
                            id="tier-form-bic"
                            v-model="form.bank.bic"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            maxlength="11"
                            :placeholder="t('tiersPage.form.placeholders.bic')"
                            :error="!!(fieldErrors['bank.bic'] || fieldErrors.bank)"
                            :error-messages="fieldErrors['bank.bic'] || fieldErrors.bank || undefined"
                        />
                    </v-col>
                </v-row>
                <v-row class="align-center" no-gutters>
                    <v-col cols="12" sm="3" class="pr-sm-3">
                        <label class="v-label font-weight-medium" for="tier-form-iid">{{ t('tiersPage.form.fields.iid') }}</label>
                    </v-col>
                    <v-col cols="12" sm="9">
                        <v-text-field
                            id="tier-form-iid"
                            v-model="form.bank.iid"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            inputmode="numeric"
                            maxlength="5"
                            :placeholder="t('tiersPage.form.placeholders.iid')"
                            :error="!!fieldErrors['bank.iid']"
                            :error-messages="fieldErrors['bank.iid'] || undefined"
                        />
                    </v-col>
                </v-row>
                <v-row no-gutters>
                    <v-col cols="12" sm="9" offset-sm="3">
                        <div class="tier-bank-form__custom">
                            <span class="text-caption text-medium-emphasis">{{ t('tiersPage.form.bankCustomHint') }}</span>
                            <button type="button" class="su-btn su-btn--ghost tier-bank-form__switch-mode" @click="setBankMode('registry')">
                                {{ t('tiersPage.form.bankUseRegistry') }}
                            </button>
                        </div>
                    </v-col>
                </v-row>
            </template>
        </template>
    </div>
</template>

<style scoped>
.tier-bank-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tier-bank-form__custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
}

.tier-bank-form__switch-mode {
    min-height: 34px;
    padding: 0 12px;
}

@media (max-width: 599.98px) {
    .tier-bank-form {
        gap: 12px;
    }

    .tier-bank-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
