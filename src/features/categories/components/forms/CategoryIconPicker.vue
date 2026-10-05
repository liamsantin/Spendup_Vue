<script setup lang="ts">
/**
 * Grille d’icônes Tabler pour une catégorie.
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
    <div class="category-icon-picker" :class="{ 'category-icon-picker--disabled': disabled }">
        <button
            type="button"
            class="category-icon-picker__swatch"
            :class="{ 'is-selected': !modelValue }"
            :disabled="disabled"
            :aria-label="noneLabel"
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
            @click="select(key)"
        >
            <component :is="resolveCategoryIcon(key)" :size="18" stroke-width="1.6" />
        </button>
    </div>
</template>

<style scoped>
.category-icon-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    gap: 6px;
}

.category-icon-picker__swatch {
    appearance: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--thread);
    border-radius: 10px;
    background: var(--surface-raised);
    color: var(--ink-mute);
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.category-icon-picker__swatch:hover:not(:disabled),
.category-icon-picker__swatch:focus-visible {
    outline: none;
    color: var(--ink);
    border-color: rgba(var(--v-theme-primary), 0.4);
}

.category-icon-picker__swatch.is-selected {
    color: rgb(var(--v-theme-primary));
    border-color: rgba(var(--v-theme-primary), 0.55);
    background: rgba(var(--v-theme-primary), 0.1);
}

.category-icon-picker--disabled .category-icon-picker__swatch {
    opacity: 0.6;
    cursor: default;
}
</style>
