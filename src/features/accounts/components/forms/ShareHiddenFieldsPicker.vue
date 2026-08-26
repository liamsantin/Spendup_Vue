<script setup lang="ts">
/**
 * Cases à cocher des champs masqués pour un viewer.
 * Ignoré / masqué quand le rôle est `editor`.
 */
defineOptions({ name: 'ShareHiddenFieldsPicker' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { HIDDEN_ACCOUNT_FIELDS, type HiddenAccountField } from '@/features/accounts/types';

const props = withDefaults(
    defineProps<{
        modelValue: HiddenAccountField[];
        disabled?: boolean;
    }>(),
    { disabled: false }
);

const emit = defineEmits<{
    'update:modelValue': [value: HiddenAccountField[]];
}>();

const { t } = useI18n();

const selected = computed({
    get: () => new Set(props.modelValue),
    set: (next: Set<HiddenAccountField>) => {
        emit(
            'update:modelValue',
            HIDDEN_ACCOUNT_FIELDS.filter((f) => next.has(f))
        );
    }
});

function toggle(field: HiddenAccountField, checked: boolean | null) {
    const next = new Set(selected.value);
    if (checked) next.add(field);
    else next.delete(field);
    selected.value = next;
}
</script>

<template>
    <div class="share-hidden-fields">
        <div class="text-body-2 text-medium-emphasis mb-2">{{ t('comptesPage.share.hiddenFields.hint') }}</div>
        <div class="d-flex flex-column ga-1">
            <v-checkbox
                v-for="field in HIDDEN_ACCOUNT_FIELDS"
                :key="field"
                :model-value="selected.has(field)"
                :label="t(`comptesPage.share.hiddenFields.${field}`)"
                :disabled="disabled"
                density="compact"
                color="primary"
                hide-details
                @update:model-value="toggle(field, $event)"
            />
        </div>
    </div>
</template>
