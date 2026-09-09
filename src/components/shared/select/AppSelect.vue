<script setup lang="ts" generic="T extends string | number | null">
import { computed, nextTick, ref, useAttrs, watch } from 'vue';
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { matchesSearchTokens } from '@/utils/helpers/text-search';

defineOptions({ name: 'AppSelect', inheritAttrs: false });

type SelectItem = T | Record<string, unknown>;

const props = withDefaults(
    defineProps<{
        modelValue: T;
        items: SelectItem[];
        itemTitle?: string;
        itemValue?: string;
        label?: string;
        disabled?: boolean;
        required?: boolean;
        error?: boolean;
        errorMessages?: string | string[] | null;
        hint?: string;
        persistentHint?: boolean;
        hideDetails?: boolean | 'auto';
        /** Libellé du bouton de création rapide (menu vide). */
        createLabel?: string;
        /** Libellé avec `{name}` quand une recherche n’a pas d’égal exact. */
        createNamedLabel?: string;
        searchable?: boolean;
        searchPlaceholder?: string;
        noResultsLabel?: string;
        searchMax?: number;
    }>(),
    {
        itemTitle: 'title',
        itemValue: 'value',
        label: undefined,
        disabled: false,
        required: false,
        error: false,
        errorMessages: undefined,
        hint: undefined,
        persistentHint: false,
        hideDetails: false,
        createLabel: undefined,
        createNamedLabel: undefined,
        searchable: false,
        searchPlaceholder: undefined,
        noResultsLabel: undefined,
        searchMax: 100
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: T];
    create: [query: string];
}>();

const attrs = useAttrs();
const open = ref(false);
const query = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);
const trimmedQuery = computed(() => query.value.trim());

const normalizedItems = computed(() =>
    props.items.map((item) => {
        if (item !== null && typeof item === 'object') {
            return {
                title: String(item[props.itemTitle] ?? ''),
                value: (item[props.itemValue] ?? null) as T,
                indent: typeof item.indent === 'number' ? item.indent : 0
            };
        }
        return { title: String(item ?? ''), value: item, indent: 0 };
    })
);

function searchTitle(title: string) {
    return title.replace(/^↳\s*/, '');
}

function isEmptyValue(value: T) {
    return value === '' || value == null;
}

const visibleItems = computed(() => {
    const items = normalizedItems.value;
    const needle = trimmedQuery.value;
    if (!props.searchable || !needle) return items;
    return items.filter((item) => isEmptyValue(item.value) || matchesSearchTokens(searchTitle(item.title), needle));
});

const hasFilteredChoices = computed(() => visibleItems.value.some((item) => !isEmptyValue(item.value)));

const hasExactMatch = computed(() => {
    const needle = trimmedQuery.value.toLowerCase();
    if (!needle) return false;
    return normalizedItems.value.some((item) => searchTitle(item.title).trim().toLowerCase() === needle);
});

const showCreateNamed = computed(() => !!props.createLabel && !props.disabled && !!trimmedQuery.value && !hasExactMatch.value);
const showCreateBlank = computed(() => !!props.createLabel && !props.disabled && !trimmedQuery.value);
const createButtonLabel = computed(() => {
    if (showCreateNamed.value && props.createNamedLabel) {
        return props.createNamedLabel.replaceAll('{name}', trimmedQuery.value);
    }
    return props.createLabel;
});

const selectedTitle = computed(
    () => normalizedItems.value.find((item) => item.value === props.modelValue)?.title ?? String(props.modelValue ?? '')
);

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

function select(value: T) {
    emit('update:modelValue', value);
    open.value = false;
}

function onCreate() {
    const name = trimmedQuery.value;
    open.value = false;
    emit('create', name);
}

function onQueryInput(value: string) {
    query.value = value.slice(0, props.searchMax);
}

watch(open, async (value) => {
    query.value = '';
    if (!value || !props.searchable) return;
    await nextTick();
    searchInputRef.value?.focus();
});
</script>

<template>
    <div class="app-select" :class="{ 'app-select--disabled': disabled, 'app-select--error': hasError }">
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
                    v-bind="{ ...attrs, ...activatorProps }"
                    type="button"
                    class="app-select__control"
                    :class="{ 'app-select__control--open': open }"
                    :disabled="disabled"
                    :aria-label="label"
                    :aria-required="required || undefined"
                    :aria-invalid="hasError || undefined"
                >
                    <span class="app-select__value">{{ selectedTitle }}</span>
                    <ChevronDownIcon class="app-select__chevron" :size="19" stroke-width="1.6" />
                </button>
            </template>

            <v-sheet class="app-select-menu__surface" :class="{ 'app-select__menu': searchable }">
                <label v-if="searchable" class="app-select__search">
                    <SearchIcon :size="16" stroke-width="1.8" class="app-select__search-icon" />
                    <input
                        ref="searchInputRef"
                        class="app-select__search-input"
                        type="search"
                        :value="query"
                        :maxlength="searchMax"
                        :placeholder="searchPlaceholder"
                        :aria-label="searchPlaceholder || label"
                        autocomplete="off"
                        @input="onQueryInput(($event.target as HTMLInputElement).value)"
                    />
                </label>
                <PerfectScrollbar class="app-select-menu__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <div class="app-select-menu__options" role="listbox" :aria-label="label">
                        <button
                            v-for="item in visibleItems"
                            :key="`${typeof item.value}:${String(item.value)}`"
                            type="button"
                            class="app-select-menu__option"
                            :class="{ 'is-selected': item.value === modelValue, 'is-indent': item.indent > 0 }"
                            role="option"
                            :aria-selected="item.value === modelValue"
                            @click="select(item.value)"
                        >
                            <span>{{ item.title }}</span>
                            <span v-if="item.value === modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>
                        <div v-if="searchable && trimmedQuery && !hasFilteredChoices" class="app-select__empty">
                            {{ noResultsLabel }}
                        </div>
                        <button
                            v-if="showCreateNamed || showCreateBlank"
                            type="button"
                            class="app-select-menu__option app-select__create"
                            @click="onCreate"
                        >
                            <PlusIcon :size="14" stroke-width="2" />
                            <span class="text-truncate">{{ createButtonLabel }}</span>
                        </button>
                    </div>
                </PerfectScrollbar>
            </v-sheet>
        </v-menu>

        <div v-if="showDetails" class="app-select__details" :class="{ 'app-select__details--error': hasError }">
            {{ messages[0] || hint }}
        </div>
    </div>
</template>

<style scoped>
.app-select {
    width: 100%;
    min-width: 0;
}

.app-select__control {
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

.app-select__control:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: rgba(var(--v-theme-primary), 0.3);
}

.app-select__control:focus-visible,
.app-select__control--open {
    outline: none;
    border-color: rgba(var(--v-theme-primary), 0.55);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.app-select--error .app-select__control {
    border-color: rgb(var(--v-theme-error));
}

.app-select--disabled .app-select__control {
    background: var(--hair);
    color: var(--ink-muted);
    cursor: default;
    opacity: 0.68;
}

.app-select__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-select__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.25s var(--ease);
}

.app-select__control--open .app-select__chevron {
    transform: rotate(180deg);
}

.app-select__details {
    min-height: 20px;
    padding: 4px 16px 0;
    color: var(--ink-muted);
    font-size: 12px;
    line-height: 16px;
}

.app-select__details--error {
    color: rgb(var(--v-theme-error));
}

.app-select__create {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
}

.app-select__menu {
    min-width: 280px;
}

.app-select__search {
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

.app-select__search:focus-within {
    border-color: rgba(var(--v-theme-primary), 0.45);
}

.app-select__search-icon {
    flex: none;
    color: var(--ink-muted);
}

.app-select__search-input {
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

.app-select__search-input::-webkit-search-cancel-button {
    display: none;
}

.app-select__empty {
    padding: 10px 14px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}
</style>
