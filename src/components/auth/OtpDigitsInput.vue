<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        /** Classe optionnelle sur le conteneur (compat / styles ciblés). */
        fieldClass?: string;
    }>(),
    {
        modelValue: '',
        fieldClass: ''
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
    complete: [value: string];
}>();

const digits = ref(['', '', '', '', '', '']);
const inputRefs = ref<(HTMLInputElement | null)[]>([]);

const code = computed(() => digits.value.join(''));

function setInputRef(el: unknown, index: number) {
    const root = el as { $el?: HTMLElement } | HTMLElement | null;
    const host = root && typeof root === 'object' && '$el' in root ? root.$el : (root as HTMLElement | null);
    const input = host?.querySelector?.('input') ?? (host instanceof HTMLInputElement ? host : null);
    inputRefs.value[index] = input;
}

function emitCode(value: string, completed: boolean) {
    if (value !== props.modelValue) {
        emit('update:modelValue', value);
    }
    if (completed && value.length === 6) {
        emit('complete', value);
    }
}

watch(
    () => props.modelValue,
    (value) => {
        const next = String(value ?? '')
            .replace(/\D/g, '')
            .slice(0, 6);
        if (next === code.value) return;
        digits.value = Array.from({ length: 6 }, (_, i) => next[i] ?? '');
    },
    { immediate: true }
);

function focusInput(index: number) {
    inputRefs.value[index]?.focus();
}

function onDigitUpdate(index: number, raw: string | number | null) {
    const value = String(raw ?? '')
        .replace(/\D/g, '')
        .slice(-1);
    digits.value[index] = value;
    const nextCode = digits.value.join('');
    emitCode(nextCode, nextCode.length === 6);
    if (value && index < 5) {
        focusInput(index + 1);
    }
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
        focusInput(index - 1);
    }
}

function onPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6) ?? '';
    if (!pasted) return;
    event.preventDefault();
    digits.value = Array.from({ length: 6 }, (_, i) => pasted[i] ?? '');
    const nextCode = digits.value.join('');
    emitCode(nextCode, nextCode.length === 6);
    focusInput(Math.min(pasted.length, 5));
}
</script>

<template>
    <div class="d-flex justify-space-between gap-3 mb-2 verification" :class="fieldClass" @paste="onPaste">
        <VTextField
            v-for="(_, i) in digits"
            :key="i"
            :ref="(el) => setInputRef(el, i)"
            :model-value="digits[i]"
            maxlength="1"
            inputmode="numeric"
            autocomplete="one-time-code"
            hide-details
            @update:model-value="(v) => onDigitUpdate(i, v)"
            @keydown="onDigitKeydown(i, $event)"
        />
    </div>
</template>
