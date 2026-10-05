<script setup lang="ts">
/**
 * Champs du formulaire catégorie. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'CategoryForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppColorPicker from '@/components/shared/color-picker/AppColorPicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import CategoryIconPicker from '@/features/categories/components/forms/CategoryIconPicker.vue';
import { CATEGORY_COLOR_PRESETS, CATEGORY_NAME_MAX, type CategoryType } from '@/features/categories/types';
import type { CategoryFormFields } from '@/features/categories/payload';

export type CategoryFormFieldErrors = {
    name?: string | null;
    type?: string | null;
    color?: string | null;
    icone?: string | null;
    parentPublicId?: string | null;
};

const props = withDefaults(
    defineProps<{
        form: CategoryFormFields;
        isEdit: boolean;
        typeItems: { title: string; value: CategoryType }[];
        parentItems: { title: string; value: string }[];
        fieldErrors?: CategoryFormFieldErrors;
        parentDisabled?: boolean;
        parentHint?: string | null;
    }>(),
    {
        fieldErrors: () => ({}),
        parentDisabled: false,
        parentHint: null
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
    <div class="category-form">
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="category-form-name"> {{ t('categoriesPage.form.fields.name') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <v-text-field
                    id="category-form-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="CATEGORY_NAME_MAX"
                    :error="!!fieldErrors.name"
                    :error-messages="fieldErrors.name || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="category-form-type"> {{ t('categoriesPage.form.fields.type') }} * </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="category-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('categoriesPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <label class="v-label font-weight-medium" for="category-form-parent">
                    {{ t('categoriesPage.form.fields.parent') }}
                </label>
            </v-col>
            <v-col cols="12" sm="9">
                <AppSelect
                    id="category-form-parent"
                    v-model="form.parentPublicId"
                    :items="parentItems"
                    :disabled="parentDisabled"
                    :label="t('categoriesPage.form.fields.parent')"
                    hide-details="auto"
                    :error="!!fieldErrors.parentPublicId"
                    :error-messages="fieldErrors.parentPublicId || undefined"
                    :hint="parentHint || undefined"
                    :persistent-hint="!!parentHint"
                />
            </v-col>
        </v-row>
        <v-row class="align-center" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <span class="v-label font-weight-medium">{{ t('categoriesPage.form.fields.color') }}</span>
            </v-col>
            <v-col cols="12" sm="9">
                <AppColorPicker
                    v-model="colorModel"
                    :colors="CATEGORY_COLOR_PRESETS"
                    :label="t('categoriesPage.form.fields.color')"
                    :clear-label="t('categoriesPage.form.clearColor')"
                    hide-label
                />
                <div v-if="fieldErrors.color" class="text-caption text-error mt-1">{{ fieldErrors.color }}</div>
            </v-col>
        </v-row>
        <v-row class="align-start" no-gutters>
            <v-col cols="12" sm="3" class="pr-sm-3">
                <span class="v-label font-weight-medium">{{ t('categoriesPage.form.fields.icone') }}</span>
            </v-col>
            <v-col cols="12" sm="9">
                <CategoryIconPicker v-model="form.icone" :none-label="t('categoriesPage.form.noIcon')" />
                <div v-if="fieldErrors.icone" class="text-caption text-error mt-1">{{ fieldErrors.icone }}</div>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.category-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .category-form {
        gap: 12px;
    }

    .category-form :deep(.v-label) {
        margin-bottom: 4px;
    }
}
</style>
