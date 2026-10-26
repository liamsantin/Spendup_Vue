<script setup lang="ts">
/**
 * Grille de pictogrammes Tabler pour une catégorie : carrés 36 px, sélection cadrée de noir.
 */
defineOptions({ name: 'CategoryIconPicker' });

import { CATEGORY_ICON_KEYS, resolveCategoryIcon } from '@/features/categories/icons';

withDefaults(
    defineProps<{
        modelValue: string;
        noneLabel: string;
        disabled?: boolean;
    }>(),
    { disabled: false }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

function select(key: string) {
    emit('update:modelValue', key);
}
</script>

<template>
    <div class="category-icon-picker" :class="{ 'category-icon-picker--disabled': disabled }" role="group">
        <button
            type="button"
            class="category-icon-picker__swatch"
            :class="{ 'is-selected': !modelValue }"
            :disabled="disabled"
            :aria-label="noneLabel"
            :aria-pressed="!modelValue"
            @click="select('')"
        >
            —
        </button>
        <button
            v-for="key in CATEGORY_ICON_KEYS"
            :key="key"
            type="button"
            class="category-icon-picker__swatch"
            :class="{ 'is-selected': modelValue === key }"
            :disabled="disabled"
            :aria-label="key"
            :aria-pressed="modelValue === key"
            @click="select(key)"
        >
            <component :is="resolveCategoryIcon(key)" :size="18" stroke-width="1.7" />
        </button>
    </div>
</template>

<style scoped>
.category-icon-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, 36px);
    gap: 6px;
}

.category-icon-picker__swatch {
    appearance: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    margin: 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    cursor: pointer;
    transition:
        border-color 0.15s var(--ease),
        color 0.15s var(--ease),
        background 0.15s var(--ease);
}

.category-icon-picker__swatch:hover:not(:disabled) {
    color: var(--ink);
    border-color: var(--gray);
}

.category-icon-picker__swatch:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.category-icon-picker__swatch.is-selected {
    color: var(--ink);
    border-color: var(--ink);
    background: var(--soft);
}

.category-icon-picker--disabled .category-icon-picker__swatch {
    opacity: 0.5;
    cursor: default;
}
</style>
