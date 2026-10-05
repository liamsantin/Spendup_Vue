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
    min-height: 48px;
    padding: 0 14px 0 16px;
    border: 1px solid var(--thread);
    border-radius: var(--radius-field);
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.5;
    text-align: left;
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.bank-picker__control:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: rgba(var(--v-theme-primary), 0.3);
}

.bank-picker__control:focus-visible,
.bank-picker__control--open {
    outline: none;
    border-color: rgba(var(--v-theme-primary), 0.55);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.bank-picker--error .bank-picker__control {
    border-color: rgb(var(--v-theme-error));
}

.bank-picker--disabled .bank-picker__control {
    background: var(--hair);
    color: var(--ink-muted);
    cursor: default;
    opacity: 0.68;
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
    color: var(--ink-muted);
    font-weight: 500;
}

.bank-picker__value-sub {
    flex: 0 1 auto;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--ink-muted);
}

.bank-picker__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.25s var(--ease);
}

.bank-picker__control--open .bank-picker__chevron {
    transform: rotate(180deg);
}

.bank-picker__menu {
    min-width: 0;
    max-width: 100%;
}

.bank-picker__search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 6px 2px;
    padding: 0 10px;
    height: 38px;
    border: 1px solid var(--thread);
    border-radius: 10px;
    background: var(--surface);
}

.bank-picker__search:focus-within {
    border-color: rgba(var(--v-theme-primary), 0.45);
}

.bank-picker__search-icon {
    flex: none;
    color: var(--ink-muted);
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
    font-size: 0.85rem;
}

.bank-picker__search-input::-webkit-search-cancel-button {
    display: none;
}

.bank-picker__countries {
    display: flex;
    gap: 6px;
    margin: 6px 6px 2px;
}

.bank-picker__country {
    appearance: none;
    padding: 4px 10px;
    border: 1px solid var(--thread);
    border-radius: 999px;
    background: var(--surface-raised);
    color: var(--ink-muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
}

.bank-picker__country.is-selected {
    border-color: rgba(var(--v-theme-primary), 0.55);
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.bank-picker__group {
    padding: 10px 14px 4px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.bank-picker__option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.bank-picker__option-meta {
    flex: 0 1 auto;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-muted);
}

.bank-picker__empty {
    padding: 10px 14px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.bank-picker__details {
    margin: 6px 16px 0;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--ink-muted);
}

.bank-picker__details--error {
    color: rgb(var(--v-theme-error));
}
</style>
