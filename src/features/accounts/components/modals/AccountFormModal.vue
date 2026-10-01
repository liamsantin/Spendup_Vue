<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useUserSettingsStore } from '@/features/user-settings';
import { getErrorMessage } from '@/utils/errors/app-error';
import { emptyToNull, isValidAccountColor, isValidIbanFormat, normalizeAccountColor, parseAccountAmount } from '@/features/accounts/format';
import {
    accountBankChoice,
    accountTypeRequiresBank,
    bankPayloadFields,
    buildUpdateAccountPayload,
    isAccountFormDirty,
    shouldValidateAccountIban
} from '@/features/accounts/account-form-payload';
import { canEditAccountOwnerFields } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { ACCOUNT_COLOR_PRESETS, ACCOUNT_TYPES, CURRENCIES, type Account, type AccountType, type Currency } from '@/features/accounts/types';
import AccountForm, { type AccountBankNotice, type AccountFormFieldErrors } from '@/features/accounts/components/forms/AccountForm.vue';
import { banksApi } from '@/features/banks/api';
import { bankChoiceRegistryId, isResolvableIban, preferredBankChoice, sameBankChoice } from '@/features/banks/format';
import type { Bank, BankChoice } from '@/features/banks/types';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import type { Tier } from '@/features/tiers/types';

const IBAN_RESOLVE_DEBOUNCE_MS = 300;

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
const tiersStore = useTiersStore();

/**
 * Figé à l’ouverture : le parent peut passer `account` à null dès la fermeture,
 * avant la fin de l’animation — sans ça le titre bascule en mode création.
 */
const isEdit = ref(false);
const editAccount = ref<Account | null>(null);

const isFirstOwnedAccount = computed(() => store.ownedAccounts.length === 0);
const ownerFieldsLocked = computed(() => isEdit.value && !!editAccount.value && !canEditAccountOwnerFields(editAccount.value));
const canManagePrimary = computed(() => !isEdit.value || (editAccount.value?.isOwned === true && editAccount.value.myRole === 'owner'));
const showPrimarySwitch = computed(() => {
    if (!canManagePrimary.value) return false;
    if (!isEdit.value) return true;
    return !!editAccount.value?.isPrimary;
});
const primarySwitchLocked = computed(() => {
    if (!isEdit.value) return isFirstOwnedAccount.value;
    return !!editAccount.value?.isPrimary;
});
const primarySwitchHint = computed(() => {
    if (!isEdit.value && isFirstOwnedAccount.value) return t('comptesPage.hints.primaryFirstAccount');
    if (isEdit.value && editAccount.value?.isPrimary) return t('comptesPage.hints.primaryChangeViaPromote');
    return undefined;
});
const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<AccountFormFieldErrors>({
    name: null,
    initialBalance: null,
    iban: null,
    bank: null,
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
    isPrimary: false,
    bank: null as BankChoice | null
});

/** Banque déduite de l’IBAN saisi (`null` : IBAN incomplet, étranger ou IID inconnu). */
const detectedBank = ref<Bank | null>(null);
/** Choix pré-rempli depuis l’IBAN (banque vide au moment de la détection). */
const prefilledBank = ref<BankChoice | null>(null);
let resolveTimer: ReturnType<typeof setTimeout> | null = null;
let resolveSeq = 0;
let myBanksPromise: Promise<Tier[]> | null = null;

const bankRequired = computed(() => accountTypeRequiresBank(form.type));

/** L’IBAN CH / LI désigne une autre banque que celle choisie : l’API répondrait `400`. */
const bankMismatch = computed(() => {
    const detected = detectedBank.value;
    if (!detected || !form.bank) return false;
    return bankChoiceRegistryId(form.bank) !== detected.publicId;
});

const bankNotice = computed<AccountBankNotice | null>(() => {
    const detected = detectedBank.value;
    if (!detected) return null;
    if (bankMismatch.value) return { tone: 'warning', text: t('comptesPage.form.bankIbanMismatch', { bank: detected.name }) };
    if (prefilledBank.value && sameBankChoice(prefilledBank.value, form.bank)) {
        return { tone: 'info', text: t('comptesPage.form.bankDetected', { bank: detected.name }) };
    }
    // « Aucune » avec un IBAN CH / LI : le serveur déduit la banque de l’IBAN.
    if (!form.bank) return { tone: 'info', text: t('comptesPage.form.bankFromIban', { bank: detected.name }) };
    return null;
});

const typeItems = computed(() => ACCOUNT_TYPES.map((value) => ({ title: t(`comptesPage.types.${value}`), value })));
const currencyItems = computed(() => CURRENCIES.map((value) => ({ title: value, value })));

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

/** En édition : Enregistrer seulement s’il y a un changement. */
const canSave = computed(() => {
    if (!isEdit.value || !editAccount.value) return true;
    return isAccountFormDirty(editAccount.value, {
        name: form.name,
        type: form.type,
        initialBalance: form.initialBalance,
        iban: form.iban,
        accountNumber: form.accountNumber,
        color: form.color,
        bank: form.bank
    });
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.initialBalance = null;
    fieldErrors.iban = null;
    fieldErrors.bank = null;
    fieldErrors.color = null;
}

function resetBankDetection() {
    if (resolveTimer) clearTimeout(resolveTimer);
    resolveTimer = null;
    resolveSeq += 1;
    detectedBank.value = null;
    prefilledBank.value = null;
    myBanksPromise = null;
}

/** « Mes banques », chargées une fois par ouverture : préférer mon tier banque à l’établissement du référentiel. */
function loadMyBanks(): Promise<Tier[]> {
    myBanksPromise ??= tiersStore.searchForPicker('', { isBank: true }).catch(() => [] as Tier[]);
    return myBanksPromise;
}

async function resolveIban(iban: string) {
    const requestId = ++resolveSeq;
    try {
        const result = await banksApi.resolve(iban);
        if (requestId !== resolveSeq) return;
        detectedBank.value = result.bank;
        if (form.bank) return;
        const choice = preferredBankChoice(result.bank, await loadMyBanks());
        if (requestId !== resolveSeq || form.bank) return;
        form.bank = choice;
        prefilledBank.value = choice;
    } catch {
        // 400 (IBAN invalide / étranger) ou 404 (IID inconnu) : rien à afficher, choix manuel.
        if (requestId === resolveSeq) detectedBank.value = null;
    }
}

/** Appelle `/api/banks/resolve` dès que l’IBAN CH / LI est complet (owner / création seulement). */
function scheduleIbanResolve(value: string) {
    if (resolveTimer) clearTimeout(resolveTimer);
    resolveTimer = null;
    resolveSeq += 1;
    detectedBank.value = null;
    if (!open.value || ownerFieldsLocked.value) return;
    if (!isResolvableIban(value) || !isValidIbanFormat(value)) return;
    resolveTimer = setTimeout(() => {
        resolveTimer = null;
        void resolveIban(value);
    }, IBAN_RESOLVE_DEBOUNCE_MS);
}

watch(() => form.iban, scheduleIbanResolve);

watch(
    () => form.bank,
    () => {
        fieldErrors.bank = null;
    }
);

onUnmounted(() => {
    if (resolveTimer) clearTimeout(resolveTimer);
});

/**
 * Un tier banque a pu être créé côté serveur (`bankPublicId`, ou banque déduite de l’IBAN),
 * ou un tier homonyme a pu recevoir le volet banque : on le recharge pour les sélecteurs et la page Banques.
 */
function syncBankTier(account: Account) {
    const tierPublicId = account.bank?.tierPublicId;
    if (!tierPublicId || !account.isOwned) return;
    if (form.bank?.kind === 'tier' && form.bank.tierPublicId === tierPublicId && tiersStore.findByPublicId(tierPublicId)?.bank) return;
    void tiersStore.fetchTier(tierPublicId).catch(() => undefined);
}

/** Banque manquante (courant / épargne sans IBAN suisse) ou contredite par l’IBAN. */
function validateBank(): boolean {
    if (bankMismatch.value && detectedBank.value) {
        fieldErrors.bank = t('comptesPage.form.bankIbanMismatch', { bank: detectedBank.value.name });
        return false;
    }
    if (bankRequired.value && !form.bank && !isResolvableIban(form.iban)) {
        fieldErrors.bank = t('comptesPage.form.errors.bankRequired');
        return false;
    }
    return true;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    resetBankDetection();
    const account = editAccount.value;
    if (account) {
        form.name = account.name;
        form.type = account.type;
        form.currency = account.currency;
        form.initialBalance = account.initialBalance ?? 0;
        form.iban = account.iban ?? '';
        form.accountNumber = account.accountNumber ?? '';
        form.color = account.color;
        form.isPrimary = account.isPrimary;
        form.bank = accountBankChoice(account);
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
    form.bank = null;
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.account;
        editAccount.value = props.account ?? null;
        resetForm();
        // IBAN identique à la dernière ouverture : le watch ne se redéclenche pas.
        scheduleIbanResolve(form.iban);
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const name = form.name.trim();
    let hasFieldError = false;
    if (!name) {
        fieldErrors.name = t('comptesPage.form.errors.nameRequired');
        hasFieldError = true;
    }
    const account = editAccount.value;
    const lockOwner = !!account && !canEditAccountOwnerFields(account);
    if (shouldValidateAccountIban(account) && !isValidIbanFormat(form.iban)) {
        fieldErrors.iban = t('comptesPage.form.errors.ibanInvalid');
        hasFieldError = true;
    }
    if (!isValidAccountColor(form.color)) {
        fieldErrors.color = t('comptesPage.form.errors.colorInvalid');
        hasFieldError = true;
    }
    if (!lockOwner && !validateBank()) hasFieldError = true;

    try {
        if (account) {
            if (lockOwner) {
                if (hasFieldError) return;
                const payload = buildUpdateAccountPayload(account, {
                    name,
                    type: form.type,
                    initialBalance: 0,
                    iban: form.iban,
                    accountNumber: form.accountNumber,
                    color: form.color,
                    bank: form.bank
                });
                const updated = await store.updateAccount(account.publicId, payload);
                emit('saved', updated);
            } else {
                const initialBalance = parseAccountAmount(form.initialBalance);
                if (initialBalance == null) {
                    fieldErrors.initialBalance = t('comptesPage.form.errors.balanceInvalid');
                    hasFieldError = true;
                }
                if (hasFieldError || initialBalance == null) return;

                const payload = buildUpdateAccountPayload(account, {
                    name,
                    type: form.type,
                    initialBalance,
                    iban: form.iban,
                    accountNumber: form.accountNumber,
                    color: form.color,
                    bank: form.bank
                });
                const updated = await store.updateAccount(account.publicId, payload);
                syncBankTier(updated);
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
                isPrimary: isFirstOwnedAccount.value ? true : form.isPrimary,
                ...bankPayloadFields(form.bank)
            });
            syncBankTier(created);
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
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <AccountForm
            :form="form"
            :is-edit="isEdit"
            :show-primary-switch="showPrimarySwitch"
            :primary-switch-locked="primarySwitchLocked"
            :primary-switch-hint="primarySwitchHint"
            :owner-fields-locked="ownerFieldsLocked"
            :bank-locked-name="editAccount?.bank?.name ?? editAccount?.institutionName"
            :bank-required="bankRequired"
            :bank-notice="bankNotice"
            :field-errors="fieldErrors"
            :type-items="typeItems"
            :currency-items="currencyItems"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
