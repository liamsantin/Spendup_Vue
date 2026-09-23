<script setup lang="ts">
/**
 * Champs du formulaire tag. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TagForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppColorPicker from '@/components/shared/color-picker/AppColorPicker.vue';
import { TAG_COLOR_PRESETS, TAG_NAME_MAX } from '@/features/tags/types';
import type { TagFormFields } from '@/features/tags/payload';

export type TagFormFieldErrors = {
    name?: string | null;
    color?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: TagFormFields;
        fieldErrors?: TagFormFieldErrors;
    }>(),
    {
        fieldErrors: () => ({})
    }
);

const { t } = useI18n();

const colorModel = computed({
    get: () => props.form.color,
    set: (value: string | null) => {
        props.form.color = value;
    }
});
</script>

<template>
    <div class="tag-form">
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="tag-form-name"> {{ t('tagsPage.form.fields.name') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="tag-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="TAG_NAME_MAX"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <span class="v-label font-weight-medium">{{ t('tagsPage.form.fields.color') }}</span>
            </v-col>
            <v-col cols="12" sm="9">
                <AppColorPicker
                    v-model="colorModel"
                    :colors="TAG_COLOR_PRESETS"
                    :label="t('tagsPage.form.fields.color')"
                    :clear-label="t('tagsPage.form.clearColor')"
                    hide-label
                />
                <div v-if="fieldErrors.color" class="text-caption text-error mt-1">{{ fieldErrors.color }}</div>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.tag-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .tag-form {
        gap: 12px;
    }

    .tag-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
