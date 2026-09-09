<script setup lang="ts">
/**
 * Sélecteur de contrepartie : recherche serveur (`GET /api/tiers?search=`) + création rapide (POST).
 * `modelValue` = `publicId` du tier, `''` = aucune.
 */
defineOptions({ name: 'TierPicker', inheritAttrs: false });

import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { sortTiers } from '@/features/tiers/format';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { TIER_NAME_MAX, TIER_SEARCH_MAX, type Tier } from '@/features/tiers/types';
import TierFormModal from '@/features/tiers/components/modals/TierFormModal.vue';

const SEARCH_DEBOUNCE_MS = 250;

const props = withDefaults(
    defineProps<{
        modelValue: string;
        label?: string;
        disabled?: boolean;
        error?: boolean;
        errorMessages?: string | string[] | null;
        hint?: string;
        persistentHint?: boolean;
        hideDetails?: boolean | 'auto';
    }>(),
    {
        label: undefined,
        disabled: false,
        error: false,
        errorMessages: undefined,
        hint: undefined,
        persistentHint: false,
        hideDetails: false
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const store = useTiersStore();

const open = ref(false);
const query = ref('');
const searching = ref(false);
const results = ref<Tier[]>([]);
const createOpen = ref(false);
const createName = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchSeq = 0;

const selectedTier = computed(() => (props.modelValue ? store.findByPublicId(props.modelValue) : null));
const selectedTitle = computed(() => {
    if (!props.modelValue) return t('transactionsPage.form.noTier');
    return selectedTier.value?.name ?? props.modelValue;
});

const trimmedQuery = computed(() => query.value.trim());
const canCreate = computed(() => {
    const needle = trimmedQuery.value.toLowerCase();
    if (!needle || needle.length > TIER_NAME_MAX) return false;
    return !results.value.some((tier) => tier.name.trim().toLowerCase() === needle);
});

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
        const found = await store.searchForPicker(term);
        if (requestId !== searchSeq) return;
        results.value = sortTiers(found);
    } catch {
        if (requestId === searchSeq) results.value = [];
    } finally {
        if (requestId === searchSeq) searching.value = false;
    }
}

function scheduleSearch(term: string) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        void runSearch(term);
    }, SEARCH_DEBOUNCE_MS);
}

function onQueryInput(value: string) {
    query.value = value.slice(0, TIER_SEARCH_MAX);
    scheduleSearch(query.value);
}

function select(publicId: string) {
    emit('update:modelValue', publicId);
    open.value = false;
}

function openCreate() {
    createName.value = trimmedQuery.value;
    open.value = false;
    createOpen.value = true;
}

function onCreated(tier: Tier) {
    emit('update:modelValue', tier.publicId);
}

watch(open, (value) => {
    if (!value) return;
    query.value = '';
    void runSearch('');
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value || store.findByPublicId(value)) return;
        void store.fetchTier(value).catch(() => undefined);
    },
    { immediate: true }
);

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <div class="tier-picker" :class="{ 'tier-picker--disabled': disabled, 'tier-picker--error': hasError }">
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
                    class="tier-picker__control"
                    :class="{ 'tier-picker__control--open': open }"
                    :disabled="disabled"
                    :aria-label="label"
                    :aria-invalid="hasError || undefined"
                >
                    <span class="tier-picker__value" :class="{ 'tier-picker__value--empty': !modelValue }">{{ selectedTitle }}</span>
                    <ChevronDownIcon class="tier-picker__chevron" :size="19" stroke-width="1.6" />
                </button>
            </template>

            <v-sheet class="app-select-menu__surface tier-picker__menu">
                <label class="tier-picker__search">
                    <SearchIcon :size="16" stroke-width="1.8" class="tier-picker__search-icon" />
                    <input
                        class="tier-picker__search-input"
                        type="search"
                        :value="query"
                        :maxlength="TIER_SEARCH_MAX"
                        :placeholder="t('transactionsPage.form.tierSearchPlaceholder')"
                        :aria-label="t('transactionsPage.form.tierSearchPlaceholder')"
                        autocomplete="off"
                        @input="onQueryInput(($event.target as HTMLInputElement).value)"
                    />
                </label>
                <PerfectScrollbar class="app-select-menu__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <div class="app-select-menu__options" role="listbox" :aria-label="label">
                        <button
                            type="button"
                            class="app-select-menu__option"
                            :class="{ 'is-selected': !modelValue }"
                            role="option"
                            :aria-selected="!modelValue"
                            @click="select('')"
                        >
                            <span>{{ t('transactionsPage.form.noTier') }}</span>
                            <span v-if="!modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>
                        <button
                            v-for="tier in results"
                            :key="tier.publicId"
                            type="button"
                            class="app-select-menu__option"
                            :class="{ 'is-selected': tier.publicId === modelValue }"
                            role="option"
                            :aria-selected="tier.publicId === modelValue"
                            @click="select(tier.publicId)"
                        >
                            <span class="tier-picker__option">
                                <span class="text-truncate">{{ tier.name }}</span>
                                <span class="tier-picker__option-nature">{{ t(`tiersPage.natures.${tier.nature}`) }}</span>
                            </span>
                            <span v-if="tier.publicId === modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>
                        <div v-if="!searching && trimmedQuery && !results.length" class="tier-picker__empty">
                            {{ t('transactionsPage.form.tierNoResults') }}
                        </div>
                        <button v-if="canCreate" type="button" class="app-select-menu__option tier-picker__create" @click="openCreate">
                            <PlusIcon :size="14" stroke-width="2" />
                            <span class="text-truncate">{{ t('transactionsPage.form.tierCreate', { name: trimmedQuery }) }}</span>
                        </button>
                        <button
                            v-else-if="!trimmedQuery"
                            type="button"
                            class="app-select-menu__option tier-picker__create"
                            @click="openCreate"
                        >
                            <PlusIcon :size="14" stroke-width="2" />
                            <span>{{ t('transactionsPage.form.tierCreateNew') }}</span>
                        </button>
                    </div>
                </PerfectScrollbar>
            </v-sheet>
        </v-menu>

        <div v-if="showDetails" class="tier-picker__details" :class="{ 'tier-picker__details--error': hasError }">
            {{ messages[0] || hint }}
        </div>

        <TierFormModal v-model="createOpen" :default-name="createName" @saved="onCreated" />
    </div>
</template>

<style scoped>
.tier-picker {
    width: 100%;
    min-width: 0;
}

.tier-picker__control {
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

.tier-picker__control:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: rgba(var(--v-theme-primary), 0.3);
}

.tier-picker__control:focus-visible,
.tier-picker__control--open {
    outline: none;
    border-color: rgba(var(--v-theme-primary), 0.55);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.tier-picker--error .tier-picker__control {
    border-color: rgb(var(--v-theme-error));
}

.tier-picker--disabled .tier-picker__control {
    background: var(--hair);
    color: var(--ink-muted);
    cursor: default;
    opacity: 0.68;
}

.tier-picker__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tier-picker__value--empty {
    color: var(--ink-muted);
    font-weight: 500;
}

.tier-picker__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.25s var(--ease);
}

.tier-picker__control--open .tier-picker__chevron {
    transform: rotate(180deg);
}

.tier-picker__menu {
    min-width: 280px;
}

.tier-picker__search {
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

.tier-picker__search:focus-within {
    border-color: rgba(var(--v-theme-primary), 0.45);
}

.tier-picker__search-icon {
    flex: none;
    color: var(--ink-muted);
}

.tier-picker__search-input {
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

.tier-picker__search-input::-webkit-search-cancel-button {
    display: none;
}

.tier-picker__option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.tier-picker__option-nature {
    flex: none;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-muted);
}

.tier-picker__empty {
    padding: 10px 14px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.tier-picker__create {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
}

.tier-picker__details {
    margin: 6px 16px 0;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--ink-muted);
}

.tier-picker__details--error {
    color: rgb(var(--v-theme-error));
}
</style>
