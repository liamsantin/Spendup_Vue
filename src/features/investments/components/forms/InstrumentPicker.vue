<script setup lang="ts">
/**
 * Sélecteur d'instrument : recherche serveur débouncée (`GET /api/instruments?search=`, symbole / nom / ISIN)
 * + création à la volée (« Créer “X” » ouvre `InstrumentFormModal` prérempli). Ergonomie de `TierPicker`.
 * `modelValue` = `publicId` de l'instrument, `''` = aucun.
 */
defineOptions({ name: 'InstrumentPicker', inheritAttrs: false });

import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { instrumentLabel } from '@/features/investments/format';
import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';
import { INSTRUMENT_SEARCH_MAX, INSTRUMENT_SYMBOL_MAX, type Instrument, type InstrumentCurrency } from '@/features/investments/types';
import InstrumentFormModal from '@/features/investments/components/modals/InstrumentFormModal.vue';

const SEARCH_DEBOUNCE_MS = 250;

const props = withDefaults(
    defineProps<{
        modelValue: string;
        label?: string;
        disabled?: boolean;
        error?: boolean;
        errorMessages?: string | string[] | null;
        hint?: string;
        /** Libellé affiché tant que l'instrument n'est pas indexé (ex. instrument embarqué dans l'opération). */
        fallbackLabel?: string;
        /** Devise proposée à la création rapide. */
        defaultCurrency?: InstrumentCurrency | null;
    }>(),
    {
        label: undefined,
        disabled: false,
        error: false,
        errorMessages: undefined,
        hint: undefined,
        fallbackLabel: undefined,
        defaultCurrency: null
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
    created: [instrument: Instrument];
}>();

const { t } = useI18n();
const store = useInstrumentsStore();

const open = ref(false);
const query = ref('');
const searching = ref(false);
const results = ref<Instrument[]>([]);
const createOpen = ref(false);
const createSymbol = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchSeq = 0;

const selected = computed(() => (props.modelValue ? store.findByPublicId(props.modelValue) : null));
const selectedTitle = computed(() => {
    if (!props.modelValue) return t('investmentsPage.instrumentPicker.placeholder');
    return selected.value ? instrumentLabel(selected.value) : (props.fallbackLabel ?? props.modelValue);
});

const trimmedQuery = computed(() => query.value.trim());
const canCreateNamed = computed(() => {
    const needle = trimmedQuery.value.toUpperCase();
    if (!needle || needle.length > INSTRUMENT_SYMBOL_MAX || /\s/.test(needle)) return false;
    return !results.value.some((instrument) => instrument.symbol === needle);
});

const messages = computed(() => {
    if (Array.isArray(props.errorMessages)) return props.errorMessages.filter(Boolean);
    return props.errorMessages ? [props.errorMessages] : [];
});
const hasError = computed(() => props.error || messages.value.length > 0);

async function runSearch(term: string) {
    const requestId = ++searchSeq;
    searching.value = true;
    try {
        const found = await store.searchForPicker(term);
        if (requestId !== searchSeq) return;
        results.value = found;
    } catch {
        if (requestId === searchSeq) results.value = [];
    } finally {
        if (requestId === searchSeq) searching.value = false;
    }
}

function onQueryInput(value: string) {
    query.value = value.slice(0, INSTRUMENT_SEARCH_MAX);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchTimer = null;
        void runSearch(query.value);
    }, SEARCH_DEBOUNCE_MS);
}

function select(publicId: string) {
    emit('update:modelValue', publicId);
    open.value = false;
}

function openCreate() {
    createSymbol.value = canCreateNamed.value ? trimmedQuery.value.toUpperCase() : '';
    open.value = false;
    createOpen.value = true;
}

function onCreated(instrument: Instrument) {
    emit('update:modelValue', instrument.publicId);
    emit('created', instrument);
}

watch(open, (value) => {
    if (!value) return;
    query.value = '';
    void runSearch('');
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value || store.findByPublicId(value) || props.fallbackLabel) return;
        void store.fetchInstrument(value).catch(() => undefined);
    },
    { immediate: true }
);

onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
    <div class="instrument-picker" :class="{ 'instrument-picker--disabled': disabled, 'instrument-picker--error': hasError }">
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
                    class="instrument-picker__control"
                    :class="{ 'instrument-picker__control--open': open }"
                    :disabled="disabled"
                    :aria-label="label"
                    :aria-invalid="hasError || undefined"
                >
                    <span class="instrument-picker__value" :class="{ 'instrument-picker__value--empty': !modelValue }">{{
                        selectedTitle
                    }}</span>
                    <ChevronDownIcon class="instrument-picker__chevron" :size="19" stroke-width="1.6" />
                </button>
            </template>

            <v-sheet class="app-select-menu__surface instrument-picker__menu">
                <label class="instrument-picker__search">
                    <SearchIcon :size="16" stroke-width="1.8" class="instrument-picker__search-icon" />
                    <input
                        class="instrument-picker__search-input"
                        type="search"
                        :value="query"
                        :maxlength="INSTRUMENT_SEARCH_MAX"
                        :placeholder="t('investmentsPage.instrumentPicker.search')"
                        :aria-label="t('investmentsPage.instrumentPicker.search')"
                        autocomplete="off"
                        @input="onQueryInput(($event.target as HTMLInputElement).value)"
                    />
                </label>
                <PerfectScrollbar class="app-select-menu__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <div class="app-select-menu__options" role="listbox" :aria-label="label">
                        <button
                            v-for="instrument in results"
                            :key="instrument.publicId"
                            type="button"
                            class="app-select-menu__option"
                            :class="{ 'is-selected': instrument.publicId === modelValue }"
                            role="option"
                            :aria-selected="instrument.publicId === modelValue"
                            @click="select(instrument.publicId)"
                        >
                            <span class="instrument-picker__option">
                                <span class="instrument-picker__symbol">{{ instrument.symbol }}</span>
                                <span class="text-truncate">{{ instrument.name }}</span>
                                <span class="instrument-picker__meta">{{ instrument.currency }}</span>
                            </span>
                            <span v-if="instrument.publicId === modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>
                        <div v-if="!searching && !results.length" class="instrument-picker__empty">
                            {{
                                trimmedQuery
                                    ? t('investmentsPage.instrumentPicker.noResults')
                                    : t('investmentsPage.instrumentPicker.emptyCatalog')
                            }}
                        </div>
                    </div>
                </PerfectScrollbar>
                <div v-if="!disabled" class="app-select-menu__footer">
                    <button type="button" class="app-select-menu__option app-select-menu__create" @click="openCreate">
                        <PlusIcon :size="14" stroke-width="2" />
                        <span class="text-truncate">
                            {{
                                canCreateNamed
                                    ? t('investmentsPage.instrumentPicker.createNamed', { name: trimmedQuery.toUpperCase() })
                                    : t('investmentsPage.instrumentPicker.create')
                            }}
                        </span>
                    </button>
                </div>
            </v-sheet>
        </v-menu>

        <div
            v-if="messages.length || hint"
            class="instrument-picker__details"
            :class="{ 'instrument-picker__details--error': messages.length }"
        >
            {{ messages[0] || hint }}
        </div>

        <InstrumentFormModal v-model="createOpen" :default-symbol="createSymbol" :default-currency="defaultCurrency" @saved="onCreated" />
    </div>
</template>

<style scoped>
.instrument-picker {
    width: 100%;
    min-width: 0;
}

/* champ carré 42 px : bordure fine, focus noir sans halo */
.instrument-picker__control {
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

.instrument-picker__control:hover:not(:disabled) {
    border-color: var(--gray);
}

.instrument-picker__control:focus-visible,
.instrument-picker__control--open {
    outline: none;
    border-color: var(--ink);
}

.instrument-picker--error .instrument-picker__control {
    border-color: var(--danger);
}

.instrument-picker--disabled .instrument-picker__control {
    background: var(--soft);
    color: var(--gray);
    cursor: default;
}

.instrument-picker__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.instrument-picker__value--empty {
    color: var(--gray);
}

.instrument-picker__chevron {
    flex: none;
    color: var(--gray);
    transition: transform 0.2s var(--ease);
}

.instrument-picker__control--open .instrument-picker__chevron {
    transform: rotate(180deg);
}

.instrument-picker__menu {
    min-width: 0;
    max-width: 100%;
}

/* recherche de liste : simple ligne 1 px noire en bas */
.instrument-picker__search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 10px 4px;
    padding: 0 2px;
    height: 40px;
    border-bottom: 1px solid var(--ink);
}

.instrument-picker__search:focus-within {
    border-bottom-color: var(--blue-btn);
}

.instrument-picker__search-icon {
    flex: none;
    color: var(--gray);
}

.instrument-picker__search-input {
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

.instrument-picker__search-input::-webkit-search-cancel-button {
    display: none;
}

.instrument-picker__search-input::placeholder {
    color: var(--gray);
}

.instrument-picker__option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.instrument-picker__symbol {
    flex: none;
    font-weight: 700;
}

.instrument-picker__meta {
    flex: none;
    font-size: 13px;
    color: var(--gray);
}

.instrument-picker__empty {
    padding: 10px 14px;
    font-size: 13px;
    color: var(--gray);
}

.instrument-picker__details {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--gray);
}

.instrument-picker__details--error {
    color: var(--danger);
}
</style>
