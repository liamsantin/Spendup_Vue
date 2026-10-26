<script setup lang="ts">
/**
 * Sélecteur « Banque » à deux groupes :
 * - « Mes banques » : `GET /api/tiers?isBank=true` → choix `tier` (`institutionTierPublicId`) ;
 * - « Toutes les banques » : `GET /api/banks?q=` → choix `registry` (`bankPublicId`).
 * Un établissement déjà présent dans « Mes banques » n’est affiché qu’une fois, côté « Mes banques ».
 */
defineOptions({ name: 'BankPicker', inheritAttrs: false });

import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { sortTiers } from '@/features/tiers/format';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import type { Tier } from '@/features/tiers/types';
import { listRegistryBanks } from '@/features/banks/registry-cache';
import { bankChoiceFromRegistry, bankChoiceFromTier, dedupeRegistryBanks, sameBankChoice } from '@/features/banks/format';
import {
    BANK_COUNTRIES,
    BANK_COUNTRY_DEFAULT,
    BANK_SEARCH_MAX,
    type Bank,
    type BankChoice,
    type BankCountry
} from '@/features/banks/types';

const SEARCH_DEBOUNCE_MS = 250;
const REGISTRY_PAGE_SIZE = 30;

const props = withDefaults(
    defineProps<{
        modelValue: BankChoice | null;
        label?: string;
        disabled?: boolean;
        error?: boolean;
        errorMessages?: string | string[] | null;
        hint?: string;
        persistentHint?: boolean;
        hideDetails?: boolean | 'auto';
        /** Groupe « Mes banques » (tiers banque). */
        showMyBanks?: boolean;
        /** Groupe « Toutes les banques » (référentiel). */
        showRegistry?: boolean;
        /** Option « Aucune » (banque facultative). */
        allowNone?: boolean;
        noneLabel?: string;
        placeholder?: string;
    }>(),
    {
        label: undefined,
        disabled: false,
        error: false,
        errorMessages: undefined,
        hint: undefined,
        persistentHint: false,
        hideDetails: false,
        showMyBanks: true,
        showRegistry: true,
        allowNone: true,
        noneLabel: undefined,
        placeholder: undefined
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: BankChoice | null];
}>();

const { t } = useI18n();
const tiersStore = useTiersStore();

const open = ref(false);
const query = ref('');
const country = ref<BankCountry>(BANK_COUNTRY_DEFAULT);
const searching = ref(false);
const myBanks = ref<Tier[]>([]);
const registry = ref<Bank[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchSeq = 0;

const searchPlaceholder = computed(() => (props.showRegistry ? t('banks.picker.searchPlaceholder') : t('banks.picker.searchMine')));
const noneText = computed(() => props.noneLabel ?? t('banks.picker.none'));
const selectedTitle = computed(() => {
    if (props.modelValue) return props.modelValue.name;
    if (props.allowNone) return noneText.value;
    return props.placeholder ?? t('banks.picker.placeholder');
});
/** Nom officiel SIX en sous-titre quand le tier a été renommé (ex. « Mon UBS »). */
const selectedSubtitle = computed(() => {
    const choice = props.modelValue;
    if (choice?.kind !== 'tier' || !choice.bankName) return null;
    return choice.bankName.trim().toLowerCase() === choice.name.trim().toLowerCase() ? null : choice.bankName;
});
const visibleRegistry = computed(() => dedupeRegistryBanks(registry.value, myBanks.value));
const trimmedQuery = computed(() => query.value.trim());
const hasResults = computed(() => myBanks.value.length > 0 || visibleRegistry.value.length > 0);

const messages = computed(() => {
    if (Array.isArray(props.errorMessages)) return props.errorMessages.filter(Boolean);
    return props.errorMessages ? [props.errorMessages] : [];
});
const hasError = computed(() => props.error || messages.value.length > 0);
const showDetails = computed(() => {
    if (messages.value.length > 0) return true;
    if (props.hideDetails === true) return false;
    return props.persistentHint && !!props.hint;
});

async function runSearch(term: string) {
    const requestId = ++searchSeq;
    searching.value = true;
    try {
        const [mine, banks] = await Promise.all([
            props.showMyBanks
                ? tiersStore.searchForPicker(term, { isBank: true }).catch(() => [] as Tier[])
                : Promise.resolve([] as Tier[]),
            props.showRegistry
                ? listRegistryBanks({ q: term || undefined, country: country.value, pageSize: REGISTRY_PAGE_SIZE }).catch(
                      () => [] as Bank[]
                  )
                : Promise.resolve([] as Bank[])
        ]);
        if (requestId !== searchSeq) return;
        myBanks.value = sortTiers(mine.filter((tier) => !!tier.bank));
        registry.value = banks;
    } finally {
        if (requestId === searchSeq) searching.value = false;
    }
}

function scheduleSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        void runSearch(trimmedQuery.value);
    }, SEARCH_DEBOUNCE_MS);
}

function onQueryInput(value: string) {
    query.value = value.slice(0, BANK_SEARCH_MAX);
    scheduleSearch();
}

function setCountry(value: BankCountry) {
    if (country.value === value) return;
    country.value = value;
    void runSearch(trimmedQuery.value);
}

function select(choice: BankChoice | null) {
    emit('update:modelValue', choice);
    open.value = false;
}

function isSelected(choice: BankChoice | null): boolean {
    return sameBankChoice(props.modelValue, choice);
}

function tierMeta(tier: Tier): string | null {
    const bank = tier.bank;
    if (!bank) return null;
    if (bank.bankName && bank.bankName.trim().toLowerCase() !== tier.name.trim().toLowerCase()) return bank.bankName;
    return bank.bic ?? (bank.bankPublicId ? null : t('banks.picker.offRegistry'));
}

function bankMeta(bank: Bank): string {
    return [bank.bic, bank.town].filter(Boolean).join(' · ');
}

watch(open, (value) => {
    if (!value) return;
    query.value = '';
    void runSearch('');
});

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <div class="bank-picker" :class="{ 'bank-picker--disabled': disabled, 'bank-picker--error': hasError }">
        <v-menu
            v-model="open"
            :close-on-content-click="false"
            location="bottom"
            content-class="app-select-menu"
            :offset="6"
            :disabled="disabled"
        >
            <template #activator="{ props: activatorProps }">
                <button
                    v-bind="{ ...$attrs, ...activatorProps }"
                    type="button"
                    class="bank-picker__control"
                    :class="{ 'bank-picker__control--open': open }"
                    :disabled="disabled"
                    :aria-label="label"
                    :aria-invalid="hasError || undefined"
                >
                    <span class="bank-picker__value" :class="{ 'bank-picker__value--empty': !modelValue }">
                        <span class="text-truncate">{{ selectedTitle }}</span>
                        <span v-if="selectedSubtitle" class="bank-picker__value-sub text-truncate">{{ selectedSubtitle }}</span>
                    </span>
                    <ChevronDownIcon class="bank-picker__chevron" :size="19" stroke-width="1.6" />
                </button>
            </template>

            <v-sheet class="app-select-menu__surface bank-picker__menu">
                <label class="bank-picker__search">
                    <SearchIcon :size="16" stroke-width="1.8" class="bank-picker__search-icon" />
                    <input
                        class="bank-picker__search-input"
                        type="search"
                        :value="query"
                        :maxlength="BANK_SEARCH_MAX"
                        :placeholder="searchPlaceholder"
                        :aria-label="searchPlaceholder"
                        autocomplete="off"
                        @input="onQueryInput(($event.target as HTMLInputElement).value)"
                    />
                </label>
                <div v-if="showRegistry" class="bank-picker__countries" role="group" :aria-label="t('banks.picker.country')">
                    <button
                        v-for="code in BANK_COUNTRIES"
                        :key="code"
                        type="button"
                        class="bank-picker__country"
                        :class="{ 'is-selected': country === code }"
                        :aria-pressed="country === code"
                        @click="setCountry(code)"
                    >
                        {{ t(`banks.picker.countries.${code}`) }}
                    </button>
                </div>
                <PerfectScrollbar class="app-select-menu__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <div class="app-select-menu__options" role="listbox" :aria-label="label">
                        <button
                            v-if="allowNone"
                            type="button"
                            class="app-select-menu__option"
                            :class="{ 'is-selected': !modelValue }"
                            role="option"
                            :aria-selected="!modelValue"
                            @click="select(null)"
                        >
                            <span>{{ noneText }}</span>
                            <span v-if="!modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>

                        <template v-if="showMyBanks && myBanks.length">
                            <div class="bank-picker__group">{{ t('banks.picker.myBanks') }}</div>
                            <button
                                v-for="tier in myBanks"
                                :key="`tier-${tier.publicId}`"
                                type="button"
                                class="app-select-menu__option"
                                :class="{ 'is-selected': isSelected(bankChoiceFromTier(tier)) }"
                                role="option"
                                :aria-selected="isSelected(bankChoiceFromTier(tier))"
                                @click="select(bankChoiceFromTier(tier))"
                            >
                                <span class="bank-picker__option">
                                    <span class="text-truncate">{{ tier.name }}</span>
                                    <span v-if="tierMeta(tier)" class="bank-picker__option-meta text-truncate">{{ tierMeta(tier) }}</span>
                                </span>
                                <span v-if="isSelected(bankChoiceFromTier(tier))" class="app-select-menu__check">
                                    <CheckIcon :size="13" stroke-width="2.2" />
                                </span>
                            </button>
                        </template>

                        <template v-if="showRegistry && visibleRegistry.length">
                            <div class="bank-picker__group">{{ t('banks.picker.allBanks') }}</div>
                            <button
                                v-for="bank in visibleRegistry"
                                :key="`bank-${bank.publicId}`"
                                type="button"
                                class="app-select-menu__option"
                                :class="{ 'is-selected': isSelected(bankChoiceFromRegistry(bank)) }"
                                role="option"
                                :aria-selected="isSelected(bankChoiceFromRegistry(bank))"
                                @click="select(bankChoiceFromRegistry(bank))"
                            >
                                <span class="bank-picker__option">
                                    <span class="text-truncate">{{ bank.name }}</span>
                                    <span v-if="bankMeta(bank)" class="bank-picker__option-meta text-truncate">{{ bankMeta(bank) }}</span>
                                </span>
                                <span v-if="isSelected(bankChoiceFromRegistry(bank))" class="app-select-menu__check">
                                    <CheckIcon :size="13" stroke-width="2.2" />
                                </span>
                            </button>
                        </template>

                        <div v-if="!searching && !hasResults" class="bank-picker__empty">
                            {{ trimmedQuery ? t('banks.picker.noResults') : t('banks.picker.empty') }}
                        </div>
                    </div>
                </PerfectScrollbar>
            </v-sheet>
        </v-menu>

        <div v-if="showDetails" class="bank-picker__details" :class="{ 'bank-picker__details--error': hasError }">
            {{ messages[0] || hint }}
        </div>
    </div>
</template>

<style scoped>
/* Sélecteur de banque : champ carré 42 px, bordure fine, focus noir sans halo ; menu Swiss (app-select-menu). */
.bank-picker {
    width: 100%;
    min-width: 0;
}

.bank-picker__control {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 42px;
    padding: 0 12px 0 14px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: var(--raise);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.4;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s var(--ease);
}

.bank-picker__control:hover:not(:disabled) {
    border-color: var(--gray);
}

.bank-picker__control:focus-visible,
.bank-picker__control--open {
    outline: none;
    border-color: var(--ink);
    box-shadow: none;
}

.bank-picker--error .bank-picker__control {
    border-color: var(--danger);
}

.bank-picker--disabled .bank-picker__control {
    background: var(--soft);
    color: var(--gray);
    cursor: default;
}

.bank-picker__value {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}

.bank-picker__value--empty {
    color: var(--gray);
}

.bank-picker__value-sub {
    flex: 0 1 auto;
    font-size: 12.5px;
    color: var(--gray);
}

.bank-picker__chevron {
    flex: none;
    color: var(--gray);
    transition: transform 0.2s var(--ease);
}

.bank-picker__control--open .bank-picker__chevron {
    transform: rotate(180deg);
}

.bank-picker__menu {
    min-width: 0;
    max-width: 100%;
}

/* recherche : simple ligne 1 px noire en bas */
.bank-picker__search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 8px 6px;
    padding: 0 2px;
    height: 38px;
    border: 0;
    border-bottom: 1px solid var(--ink);
    border-radius: 0;
    background: transparent;
}

.bank-picker__search:focus-within {
    border-bottom-color: var(--blue-btn);
}

.bank-picker__search-icon {
    flex: none;
    color: var(--gray);
}

.bank-picker__search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
}

.bank-picker__search-input::-webkit-search-cancel-button {
    display: none;
}

.bank-picker__search-input::placeholder {
    color: var(--gray);
}

/* pays : filtres texte, actif = 700 souligné */
.bank-picker__countries {
    display: flex;
    gap: 18px;
    margin: 4px 10px 6px;
}

.bank-picker__country {
    appearance: none;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}

.bank-picker__country:hover {
    color: var(--ink);
}

.bank-picker__country.is-selected {
    color: var(--ink);
    font-weight: 700;
    box-shadow: inset 0 -2px 0 var(--ink);
}

.bank-picker__group {
    padding: 10px 14px 4px;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--gray);
}

.bank-picker__option {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
}

.bank-picker__option-meta {
    flex: 0 1 auto;
    font-size: 12.5px;
    font-weight: 400;
    color: var(--gray);
}

.bank-picker__empty {
    padding: 10px 14px;
    font-size: 13px;
    color: var(--gray);
}

.bank-picker__details {
    margin: 6px 0 0;
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--gray);
}

.bank-picker__details--error {
    color: var(--danger);
}
</style>
