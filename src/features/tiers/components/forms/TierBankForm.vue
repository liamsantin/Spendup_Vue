<script setup lang="ts">
/**
 * Volet banque d’un tier (onglet « Banque » de la fiche). `form` est détenu par le parent.
 * Référentiel SIX (`bankPublicId`) ou banque hors référentiel (BIC / IID).
 * Mise en page modale Swiss : libellé 170 px à gauche | champ carré à droite.
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
        <p v-if="locked" class="tier-bank-form__note">{{ t('tiersPage.form.bankLockedHint') }}</p>
        <div v-else class="tier-bank-form__row">
            <label class="tier-bank-form__label" for="tier-form-is-bank">{{ t('tiersPage.form.fields.isBank') }}</label>
            <div class="tier-bank-form__field">
                <AppSwitch id="tier-form-is-bank" v-model="form.bank.enabled" />
                <p class="tier-bank-form__note">{{ t('tiersPage.form.bankHint') }}</p>
            </div>
        </div>
        <template v-if="form.bank.enabled">
            <div v-if="form.bank.mode === 'registry'" class="tier-bank-form__row tier-bank-form__row--top">
                <label class="tier-bank-form__label" for="tier-form-bank">
                    {{ t('tiersPage.form.fields.bank') }} <span class="tier-bank-form__req" aria-hidden="true">*</span>
                </label>
                <div class="tier-bank-form__field">
                    <BankPicker
                        id="tier-form-bank"
                        v-model="registryChoice"
                        :label="t('tiersPage.form.fields.bank')"
                        :show-my-banks="false"
                        :allow-none="false"
                        :error-messages="fieldErrors.bank || undefined"
                        hide-details="auto"
                    />
                    <div class="tier-bank-form__custom">
                        <span class="tier-bank-form__note">{{ t('tiersPage.form.bankNotListed') }}</span>
                        <button type="button" class="su-btn su-btn--ghost su-btn--sm" @click="setBankMode('custom')">
                            {{ t('tiersPage.form.bankCustom') }}
                        </button>
                    </div>
                </div>
            </div>
            <template v-else>
                <div class="tier-bank-form__row">
                    <label class="tier-bank-form__label" for="tier-form-bic">{{ t('tiersPage.form.fields.bic') }}</label>
                    <div class="tier-bank-form__field">
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
                    </div>
                </div>
                <div class="tier-bank-form__row">
                    <label class="tier-bank-form__label" for="tier-form-iid">{{ t('tiersPage.form.fields.iid') }}</label>
                    <div class="tier-bank-form__field">
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
                    </div>
                </div>
                <div class="tier-bank-form__row">
                    <span class="tier-bank-form__label" aria-hidden="true" />
                    <div class="tier-bank-form__field tier-bank-form__custom">
                        <span class="tier-bank-form__note">{{ t('tiersPage.form.bankCustomHint') }}</span>
                        <button type="button" class="su-btn su-btn--ghost su-btn--sm" @click="setBankMode('registry')">
                            {{ t('tiersPage.form.bankUseRegistry') }}
                        </button>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<style scoped>
.tier-bank-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ligne libellé 170 px | champ */
.tier-bank-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.tier-bank-form__row--top {
    align-items: start;
}

.tier-bank-form__row--top .tier-bank-form__label {
    padding-top: 10px;
}

.tier-bank-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.tier-bank-form__req {
    color: var(--blue-ink);
}

.tier-bank-form__field {
    min-width: 0;
}

.tier-bank-form__note {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
    line-height: 1.4;
}

.tier-bank-form__field > .tier-bank-form__note {
    margin-top: 4px;
}

.tier-bank-form__custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

@media (max-width: 599.98px) {
    .tier-bank-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .tier-bank-form__row--top .tier-bank-form__label {
        padding-top: 0;
    }

    .tier-bank-form__label:empty {
        display: none;
    }
}
</style>
