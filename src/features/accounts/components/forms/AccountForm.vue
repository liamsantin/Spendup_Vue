<script setup lang="ts">
/**
 * Champs du formulaire compte. Indépendant du shell modal (dialog / sheet / fullscreen).
 * `form` est un objet réactif détenu par le parent ; la mutation des champs est intentionnelle.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'AccountForm' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ColorPickerIcon } from 'vue-tabler-icons';
import AppColorPicker from '@/components/shared/color-picker/AppColorPicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import BankPicker from '@/features/banks/components/BankPicker.vue';
import type { BankChoice } from '@/features/banks/types';
import { safeAccountColor } from '@/features/accounts/format';
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
    /** `null` = aucune banque. */
    bank: BankChoice | null;
};

/** Retour de la détection de banque depuis l’IBAN (`/api/banks/resolve`). */
export type AccountBankNotice = { tone: 'info' | 'warning'; text: string };

export type AccountFormFieldErrors = {
    name?: string | null;
    initialBalance?: string | null;
    iban?: string | null;
    bank?: string | null;
    color?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: AccountFormFields;
        isEdit: boolean;
        showPrimarySwitch: boolean;
        primarySwitchLocked: boolean;
        primarySwitchHint?: string;
        /** Verrouille type / devise / solde initial / IBAN / banque (rôle editor). */
        ownerFieldsLocked?: boolean;
        /** Nom dénormalisé — affichage editor, sans GET `/api/tiers/{id}`. */
        bankLockedName?: string | null;
        /** Banque obligatoire (compte courant ou d’épargne) : pas d’option « Aucune ». */
        bankRequired?: boolean;
        bankNotice?: AccountBankNotice | null;
        fieldErrors?: AccountFormFieldErrors;
        typeItems: { title: string; value: AccountType }[];
        currencyItems: { title: string; value: Currency }[];
    }>(),
    {
        primarySwitchHint: undefined,
        ownerFieldsLocked: false,
        bankLockedName: undefined,
        bankRequired: false,
        bankNotice: null,
        fieldErrors: () => ({})
    }
);

const { t } = useI18n();

/** Sélecteur libre (hex / HSV) replié derrière le bouton-icône ; les pastilles couvrent l'usage courant. */
const customColorOpen = ref(false);

const currentColor = computed(() => safeAccountColor(props.form.color));

/** Pastilles : les presets, plus la couleur actuelle si elle n'en fait pas partie (compte existant). */
const swatches = computed<string[]>(() => {
    const presets = ACCOUNT_COLOR_PRESETS.map((preset) => preset.toUpperCase());
    const current = currentColor.value;
    if (current && !presets.includes(current)) return [...presets, current];
    return presets;
});

function isSelectedSwatch(value: string) {
    return currentColor.value === value.toUpperCase();
}

function selectSwatch(value: string) {
    props.form.color = value;
}
</script>

<template>
    <div class="account-form">
        <p v-if="ownerFieldsLocked" class="account-form__hint">
            {{ t('comptesPage.form.ownerFieldsLockedHint') }}
        </p>

        <!-- Compte principal : titre + explication grise, interrupteur à droite -->
        <div v-if="showPrimarySwitch" class="account-form__switch">
            <div class="account-form__switch-copy">
                <label class="account-form__switch-title" for="account-form-is-primary">
                    {{ t('comptesPage.form.fields.isPrimary') }}
                </label>
                <p v-if="primarySwitchHint" class="account-form__switch-hint">{{ primarySwitchHint }}</p>
            </div>
            <AppSwitch id="account-form-is-primary" v-model="form.isPrimary" :disabled="primarySwitchLocked" />
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-name">
                {{ t('comptesPage.form.fields.name') }} <span class="account-form__required" aria-hidden="true">*</span>
            </label>
            <div class="account-form__field">
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
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-type">
                {{ t('comptesPage.form.fields.type') }} <span class="account-form__required" aria-hidden="true">*</span>
            </label>
            <div class="account-form__field">
                <AppSelect
                    id="account-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('comptesPage.form.fields.type')"
                    :disabled="ownerFieldsLocked"
                    hide-details="auto"
                    required
                />
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-currency">
                {{ t('comptesPage.form.fields.currency') }} <span class="account-form__required" aria-hidden="true">*</span>
            </label>
            <div class="account-form__field">
                <AppSelect
                    id="account-form-currency"
                    v-model="form.currency"
                    :items="currencyItems"
                    :label="t('comptesPage.form.fields.currency')"
                    hide-details="auto"
                    required
                    :disabled="isEdit || ownerFieldsLocked"
                    :hint="isEdit ? t('comptesPage.form.currencyLockedHint') : undefined"
                    :persistent-hint="isEdit"
                />
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-initial-balance">
                {{ t('comptesPage.form.fields.initialBalance') }} <span class="account-form__required" aria-hidden="true">*</span>
            </label>
            <div class="account-form__field">
                <v-text-field
                    id="account-form-initial-balance"
                    v-model.number="form.initialBalance"
                    type="number"
                    step="0.01"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    required
                    class="account-form__amount"
                    :suffix="form.currency"
                    :disabled="ownerFieldsLocked"
                    :error="!!fieldErrors.initialBalance"
                    :error-messages="fieldErrors.initialBalance || undefined"
                />
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-iban">{{ t('comptesPage.form.fields.iban') }}</label>
            <div class="account-form__field">
                <v-text-field
                    id="account-form-iban"
                    v-model="form.iban"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    class="account-form__mono"
                    :disabled="ownerFieldsLocked"
                    :error="!!fieldErrors.iban"
                    :error-messages="fieldErrors.iban || undefined"
                />
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-account-number">{{ t('comptesPage.form.fields.accountNumber') }}</label>
            <div class="account-form__field">
                <v-text-field
                    id="account-form-account-number"
                    v-model="form.accountNumber"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                />
            </div>
        </div>

        <div class="account-form__row">
            <label class="account-form__label" for="account-form-bank">
                {{ t('comptesPage.form.fields.bank')
                }}<template v-if="bankRequired && !ownerFieldsLocked">
                    <span class="account-form__required" aria-hidden="true">*</span></template
                >
            </label>
            <div class="account-form__field">
                <v-text-field
                    v-if="ownerFieldsLocked"
                    id="account-form-bank"
                    :model-value="bankLockedName || t('comptesPage.form.noBank')"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    disabled
                    readonly
                />
                <BankPicker
                    v-else
                    id="account-form-bank"
                    v-model="form.bank"
                    :label="t('comptesPage.form.fields.bank')"
                    :allow-none="!bankRequired"
                    :none-label="t('comptesPage.form.noBank')"
                    :placeholder="t('comptesPage.form.bankPlaceholder')"
                    :error-messages="fieldErrors.bank || undefined"
                    :hint="bankRequired ? t('comptesPage.form.bankRequiredHint') : undefined"
                    :persistent-hint="bankRequired"
                    hide-details="auto"
                />
                <AppAlert v-if="bankNotice && !ownerFieldsLocked" :type="bankNotice.tone" class="mt-2">{{ bankNotice.text }}</AppAlert>
            </div>
        </div>

        <!-- Couleur : pastilles rondes 32 px, la sélectionnée cerclée de noir, valeur hex grise -->
        <div class="account-form__row account-form__row--color">
            <span id="account-form-color-label" class="account-form__label">{{ t('comptesPage.form.fields.color') }}</span>
            <div class="account-form__field">
                <div class="account-form__swatches" role="radiogroup" aria-labelledby="account-form-color-label">
                    <button
                        v-for="swatch in swatches"
                        :key="swatch"
                        type="button"
                        role="radio"
                        class="account-form__swatch"
                        :class="{ 'is-selected': isSelectedSwatch(swatch) }"
                        :style="{ '--swatch': swatch }"
                        :aria-checked="isSelectedSwatch(swatch)"
                        :aria-label="swatch"
                        @click="selectSwatch(swatch)"
                    />
                    <span class="account-form__hex">{{ currentColor ?? t('comptesPage.form.clearColor') }}</span>
                    <button
                        type="button"
                        class="su-orb account-form__custom"
                        :class="{ 'is-open': customColorOpen }"
                        :aria-label="t('comptesPage.form.fields.color')"
                        :aria-expanded="customColorOpen"
                        @click="customColorOpen = !customColorOpen"
                    >
                        <ColorPickerIcon :size="18" stroke-width="1.6" />
                    </button>
                </div>
                <AppColorPicker
                    v-if="customColorOpen"
                    v-model="form.color"
                    class="account-form__picker"
                    :colors="ACCOUNT_COLOR_PRESETS"
                    :label="t('comptesPage.form.fields.color')"
                    :clear-label="t('comptesPage.form.clearColor')"
                    hide-label
                />
                <p v-if="fieldErrors.color" class="account-form__error">{{ fieldErrors.color }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Lignes libellé (170 px, étoile bleue) | champ carré ; sur mobile le libellé passe au-dessus. */
.account-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.account-form__hint {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
}

.account-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.account-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.account-form__required {
    color: var(--blue-ink);
}

.account-form__field {
    min-width: 0;
}

.account-form__amount :deep(.v-text-field__suffix) {
    color: var(--gray);
    font-size: 14px;
    padding-right: 12px;
}

.account-form__mono :deep(input) {
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
}

/* interrupteur principal : titre + explication, bouton rond à droite */
.account-form__switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--line);
}

.account-form__switch-copy {
    min-width: 0;
}

.account-form__switch-title {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
}

.account-form__switch-hint {
    margin: 4px 0 0;
    max-width: 44ch;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.account-form__row--color {
    align-items: start;
}

.account-form__row--color .account-form__label {
    padding-top: 7px;
}

.account-form__swatches {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    min-height: 32px;
}

/* pastille ronde (seule forme ronde autorisée avec photo / interrupteur) */
.account-form__swatch {
    appearance: none;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 50%;
    background: var(--swatch);
    background-clip: padding-box;
    cursor: pointer;
    transition: box-shadow 0.15s var(--ease);
}

.account-form__swatch.is-selected {
    box-shadow: 0 0 0 2px var(--ink);
}

.account-form__swatch:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.account-form__hex {
    margin-left: 6px;
    color: var(--gray);
    font-family: var(--font-mono);
    font-size: 13px;
}

.account-form__custom {
    width: 32px;
    height: 32px;
}

.account-form__custom.is-open {
    color: var(--ink);
    background: var(--soft);
}

.account-form__picker {
    margin-top: 12px;
}

.account-form__error {
    margin: 6px 0 0;
    color: var(--danger);
    font-size: 12.5px;
}

@media (max-width: 599.98px) {
    .account-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .account-form__row--color .account-form__label {
        padding-top: 0;
    }
}
</style>
