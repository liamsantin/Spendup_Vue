<script setup lang="ts" generic="T extends string | number | null">
import { computed, nextTick, ref, useAttrs, watch } from 'vue';
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'vue-tabler-icons';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { matchesSearchTokens } from '@/utils/helpers/text-search';
import { findExactSelectItem, findSelectCompletion } from '@/components/shared/select/select-completion';

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
const inputRef = ref<HTMLInputElement | null>(null);
const highlightedIndex = ref(0);

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

const selectedTitle = computed(
    () => normalizedItems.value.find((item) => item.value === props.modelValue)?.title ?? String(props.modelValue ?? '')
);

const isFiltering = computed(() => {
    const needle = trimmedQuery.value;
    if (!needle) return false;
    return needle.toLowerCase() !== selectedTitle.value.trim().toLowerCase();
});

const visibleItems = computed(() => {
    const items = normalizedItems.value;
    if (!isFiltering.value) return items;
    return items.filter((item) => matchesSearchTokens(searchTitle(item.title), trimmedQuery.value));
});

const hasFilteredChoices = computed(() => visibleItems.value.some((item) => !isEmptyValue(item.value)));

const completion = computed(() => findSelectCompletion(normalizedItems.value, query.value));

const hasExactMatch = computed(() => !!findExactSelectItem(normalizedItems.value, trimmedQuery.value));

const showCreateNamed = computed(() => !!props.createLabel && !props.disabled && !!trimmedQuery.value && !hasExactMatch.value);
const showCreateBlank = computed(() => !!props.createLabel && !props.disabled && !trimmedQuery.value);
const createButtonLabel = computed(() => {
    if (showCreateNamed.value && props.createNamedLabel) {
        return props.createNamedLabel.replaceAll('{name}', trimmedQuery.value);
    }
    return props.createLabel;
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

const placeholder = computed(() => {
    if (typeof attrs.placeholder === 'string' && attrs.placeholder) return attrs.placeholder;
    return props.searchPlaceholder || props.label || undefined;
});

function syncQueryFromValue() {
    query.value = selectedTitle.value;
}

function applyValue(value: T) {
    emit('update:modelValue', value);
    query.value = normalizedItems.value.find((item) => item.value === value)?.title ?? '';
}

function select(value: T) {
    applyValue(value);
    open.value = false;
}

function acceptCompletion() {
    const next = completion.value;
    if (!next) return false;
    applyValue(next.value as T);
    open.value = false;
    return true;
}

function commitQuery() {
    const needle = trimmedQuery.value;
    if (!needle) {
        const empty = normalizedItems.value.find((item) => isEmptyValue(item.value));
        if (empty) {
            applyValue(empty.value);
            return;
        }
        syncQueryFromValue();
        return;
    }
    const exact = findExactSelectItem(normalizedItems.value, needle);
    if (exact) {
        applyValue(exact.value as T);
        return;
    }
    if (completion.value) {
        applyValue(completion.value.value as T);
        return;
    }
    const only = visibleItems.value.filter((item) => !isEmptyValue(item.value));
    if (isFiltering.value && only.length === 1) {
        applyValue(only[0].value);
        return;
    }
    syncQueryFromValue();
}

function onCreate() {
    const name = trimmedQuery.value;
    open.value = false;
    emit('create', name);
}

function onQueryInput(value: string) {
    query.value = value.slice(0, props.searchMax);
    open.value = true;
}

function moveHighlight(delta: number) {
    const count = visibleItems.value.length;
    if (!count) return;
    open.value = true;
    highlightedIndex.value = (highlightedIndex.value + delta + count) % count;
}

function onKeydown(event: KeyboardEvent) {
    if (props.disabled) return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveHighlight(1);
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(-1);
        return;
    }
    if (event.key === 'ArrowRight' && completion.value) {
        const input = inputRef.value;
        if (input && input.selectionStart === input.value.length) {
            event.preventDefault();
            query.value = searchTitle(completion.value.title);
        }
        return;
    }
    if (event.key === 'Tab' && completion.value) {
        acceptCompletion();
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        if (completion.value) {
            acceptCompletion();
            return;
        }
        const item = visibleItems.value[highlightedIndex.value];
        if (item) select(item.value);
        return;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        syncQueryFromValue();
        open.value = false;
    }
}

function onFocus() {
    if (props.disabled) return;
    open.value = true;
    void nextTick(() => inputRef.value?.select());
}

watch(
    () => props.modelValue,
    () => {
        if (open.value) return;
        syncQueryFromValue();
    }
);

watch(
    selectedTitle,
    (title) => {
        if (open.value) return;
        query.value = title;
    },
    { immediate: true }
);

watch(visibleItems, (items) => {
    if (!items.length) {
        highlightedIndex.value = 0;
        return;
    }
    const selected = items.findIndex((item) => item.value === props.modelValue);
    const completed = completion.value ? items.findIndex((item) => item.value === completion.value?.value) : -1;
    highlightedIndex.value = completed >= 0 ? completed : selected >= 0 ? selected : 0;
});

watch(open, (value) => {
    if (value) return;
    commitQuery();
});
</script>

<template>
    <div class="app-select" :class="{ 'app-select--disabled': disabled, 'app-select--error': hasError }">
        <v-menu
            v-model="open"
            :close-on-content-click="false"
            :open-on-click="false"
            :open-on-focus="false"
            location="bottom"
            content-class="app-select-menu"
            :offset="6"
            :disabled="disabled"
        >
            <template #activator="{ props: activatorProps }">
                <div
                    class="app-select__control"
                    :class="{ 'app-select__control--open': open }"
                    v-bind="activatorProps"
                    tabindex="-1"
                    @click="onFocus"
                >
                    <div class="app-select__field">
                        <span v-if="completion && query" class="app-select__ghost" aria-hidden="true">
                            <span class="app-select__ghost-typed">{{ query }}</span>
                            <span class="app-select__ghost-rest">{{ completion.ghost }}</span>
                        </span>
                        <input
                            v-bind="attrs"
                            ref="inputRef"
                            class="app-select__input"
                            type="text"
                            :value="query"
                            :disabled="disabled"
                            :placeholder="placeholder"
                            :aria-label="label"
                            :aria-required="required || undefined"
                            :aria-invalid="hasError || undefined"
                            :aria-expanded="open"
                            aria-autocomplete="both"
                            autocomplete="off"
                            :maxlength="searchMax"
                            @input="onQueryInput(($event.target as HTMLInputElement).value)"
                            @focus="onFocus"
                            @keydown="onKeydown"
                        />
                    </div>
                    <ChevronDownIcon class="app-select__chevron" :size="19" stroke-width="1.6" />
                </div>
            </template>

            <v-sheet class="app-select-menu__surface" :class="{ 'app-select__menu': searchable }">
                <PerfectScrollbar class="app-select-menu__scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                    <div class="app-select-menu__options" role="listbox" :aria-label="label">
                        <button
                            v-for="(item, index) in visibleItems"
                            :key="`${typeof item.value}:${String(item.value)}`"
                            type="button"
                            class="app-select-menu__option"
                            :class="{
                                'is-selected': item.value === modelValue,
                                'is-active': index === highlightedIndex,
                                'is-indent': item.indent > 0
                            }"
                            role="option"
                            :aria-selected="item.value === modelValue"
                            @mousedown.prevent
                            @click="select(item.value)"
                        >
                            <span>{{ item.title }}</span>
                            <span v-if="item.value === modelValue" class="app-select-menu__check">
                                <CheckIcon :size="13" stroke-width="2.2" />
                            </span>
                        </button>
                        <div v-if="isFiltering && trimmedQuery && !hasFilteredChoices && !showCreateNamed" class="app-select__empty">
                            {{ noResultsLabel }}
                        </div>
                        <button
                            v-if="showCreateNamed || showCreateBlank"
                            type="button"
                            class="app-select-menu__option app-select__create"
                            @mousedown.prevent
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
    cursor: text;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.app-select__control:hover:not(:has(.app-select__input:disabled)) {
    background: var(--surface-hover);
    border-color: rgba(var(--v-theme-primary), 0.3);
}

.app-select__control:focus-within,
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

.app-select__field {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 24px;
}

.app-select__ghost,
.app-select__input {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 24px;
}

.app-select__ghost {
    position: absolute;
    inset: 0;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
}

.app-select__ghost-typed {
    color: transparent;
}

.app-select__ghost-rest {
    color: var(--ink-muted);
    opacity: 0.62;
}

.app-select__input {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--ink);
    text-overflow: ellipsis;
}

.app-select__input:disabled {
    color: var(--ink-muted);
    cursor: default;
}

.app-select__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.25s var(--ease);
    pointer-events: none;
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

.app-select__empty {
    padding: 10px 14px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

</style>
