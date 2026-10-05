<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { EyeIcon, EyeOffIcon } from 'vue-tabler-icons';

defineOptions({ name: 'AuthPasswordField' });

withDefaults(
    defineProps<{
        modelValue: string;
        label: string;
        rules?: Array<(v: string) => boolean | string>;
        autocomplete?: string;
        hint?: string;
    }>(),
    {
        rules: () => [],
        autocomplete: 'current-password',
        hint: undefined
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const visible = ref(false);
const toggleLabel = computed(() => (visible.value ? t('auth.pages.hidePassword') : t('auth.pages.showPassword')));
</script>

<template>
    <div class="auth-field">
        <label class="auth-field__label">{{ label }}</label>
        <VTextField
            :model-value="modelValue"
            :rules="rules"
            :type="visible ? 'text' : 'password'"
            :autocomplete="autocomplete"
            hide-details="auto"
            class="auth-field__control"
            @update:model-value="emit('update:modelValue', String($event ?? ''))"
        >
            <template #append-inner>
                <button
                    type="button"
                    class="auth-field__toggle"
                    :aria-label="toggleLabel"
                    :title="toggleLabel"
                    @mousedown.prevent
                    @click="visible = !visible"
                >
                    <EyeOffIcon v-if="visible" :size="18" stroke-width="1.7" />
                    <EyeIcon v-else :size="18" stroke-width="1.7" />
                </button>
            </template>
        </VTextField>
        <p v-if="hint" class="auth-field__hint">{{ hint }}</p>
    </div>
</template>
