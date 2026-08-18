<script setup lang="ts">
/**
 * Sélecteur de date Spend.Up — champ + `v-date-picker` (réf. Modernize Calendar).
 * `modelValue` : jour calendaire `YYYY-MM-DD` ou `null`.
 */
defineOptions({ name: 'AppDatePicker' });

import { computed, ref } from 'vue';
import { CalendarIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        modelValue?: string | null;
        label?: string;
        placeholder?: string;
        color?: string;
        variant?: 'outlined' | 'plain' | 'underlined' | 'filled' | 'solo' | 'solo-inverted' | 'solo-filled';
        hideDetails?: boolean | 'auto';
        disabled?: boolean;
        readonly?: boolean;
        clearable?: boolean;
        /** Date min (`YYYY-MM-DD`). */
        min?: string;
        /** Date max (`YYYY-MM-DD`). */
        max?: string;
        showAdjacentMonths?: boolean;
    }>(),
    {
        modelValue: null,
        label: undefined,
        placeholder: 'Sélectionner une date',
        color: 'primary',
        variant: 'outlined',
        hideDetails: true,
        disabled: false,
        readonly: false,
        clearable: true,
        min: undefined,
        max: undefined,
        showAdjacentMonths: false
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string | null];
}>();

const menuOpen = ref(false);

const displayFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium'
});

function parseYmd(value: string | null | undefined): Date | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toYmd(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return formatLocalYmd(value);
    }
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return formatLocalYmd(parsed);
    }
    return null;
}

const displayValue = computed(() => {
    const date = parseYmd(props.modelValue);
    return date ? displayFormatter.format(date) : '';
});

const pickerValue = computed(() => parseYmd(props.modelValue));

function onPick(value: unknown) {
    emit('update:modelValue', toYmd(value));
    menuOpen.value = false;
}

function clear() {
    emit('update:modelValue', null);
}
</script>

<template>
    <v-menu v-model="menuOpen" :close-on-content-click="false" location="bottom start" min-width="0" :disabled="disabled || readonly">
        <template #activator="{ props: activatorProps }">
            <v-text-field
                :model-value="displayValue"
                :label="label"
                :placeholder="placeholder"
                :color="color"
                :variant="variant"
                :hide-details="hideDetails"
                :disabled="disabled"
                :readonly="true"
                :clearable="clearable && !!modelValue && !disabled && !readonly"
                v-bind="activatorProps"
                @click:clear.stop.prevent="clear"
            >
                <template #append-inner>
                    <CalendarIcon size="18" stroke-width="1.5" class="text-medium-emphasis" />
                </template>
            </v-text-field>
        </template>

        <v-date-picker
            :model-value="pickerValue"
            :color="color"
            :min="min"
            :max="max"
            :show-adjacent-months="showAdjacentMonths"
            @update:model-value="onPick"
        />
    </v-menu>
</template>
