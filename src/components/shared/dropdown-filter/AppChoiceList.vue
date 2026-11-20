<script setup lang="ts">
/**
 * Liste de choix unique pour un menu de filtre (coche sur l’option active).
 */
defineOptions({ name: 'AppChoiceList' });

import { CheckIcon } from 'vue-tabler-icons';

defineProps<{
    modelValue: string;
    items: { title: string; value: string }[];
    label?: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();
</script>

<template>
    <div class="app-choice-list" role="listbox" :aria-label="label">
        <button
            v-for="item in items"
            :key="item.value || '_all'"
            type="button"
            role="option"
            class="app-choice-list__item"
            :class="{ 'is-active': modelValue === item.value }"
            :aria-selected="modelValue === item.value"
            @click="emit('update:modelValue', item.value)"
        >
            <span class="app-choice-list__name">{{ item.title }}</span>
            <CheckIcon v-if="modelValue === item.value" class="app-choice-list__check" :size="16" stroke-width="2" />
        </button>
    </div>
</template>

<style scoped>
.app-choice-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: min(420px, 60dvh);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 2px;
}

.app-choice-list__item {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    min-height: 40px;
    padding: 8px 10px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s var(--ease, ease);
}

.app-choice-list__item:hover,
.app-choice-list__item:focus-visible {
    background: var(--soft);
    outline: none;
}

.app-choice-list__item.is-active {
    background: var(--blue-soft);
}

.app-choice-list__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 14px;
    font-weight: 400;
}

.app-choice-list__item.is-active .app-choice-list__name {
    font-weight: 700;
}

.app-choice-list__check {
    flex: none;
    color: var(--blue-ink);
}
</style>
