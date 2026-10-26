<script setup lang="ts">
/**
 * Champs du formulaire catégorie. `form` est détenu par le parent.
 * Mise en page modale Swiss : libellé 170 px à gauche | champ carré à droite.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'CategoryForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { XIcon } from 'vue-tabler-icons';
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

function isPresetSelected(preset: string): boolean {
    return (props.form.color ?? '').toUpperCase() === preset.toUpperCase();
}
</script>

<template>
    <div class="category-form">
        <div class="category-form__row">
            <label class="category-form__label" for="category-form-name">
                {{ t('categoriesPage.form.fields.name') }} <span class="category-form__req" aria-hidden="true">*</span>
            </label>
            <div class="category-form__field">
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
            </div>
        </div>
        <div class="category-form__row">
            <label class="category-form__label" for="category-form-type">
                {{ t('categoriesPage.form.fields.type') }} <span class="category-form__req" aria-hidden="true">*</span>
            </label>
            <div class="category-form__field">
                <AppSelect
                    id="category-form-type"
                    v-model="form.type"
                    :items="typeItems"
                    :label="t('categoriesPage.form.fields.type')"
                    hide-details="auto"
                    :error="!!fieldErrors.type"
                    :error-messages="fieldErrors.type || undefined"
                />
            </div>
        </div>
        <div class="category-form__row">
            <label class="category-form__label" for="category-form-parent">{{ t('categoriesPage.form.fields.parent') }}</label>
            <div class="category-form__field">
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
            </div>
        </div>
        <div class="category-form__row category-form__row--top">
            <span class="category-form__label">{{ t('categoriesPage.form.fields.color') }}</span>
            <div class="category-form__field">
                <!-- pastilles rondes 32 px, sélection cerclée de noir ; le champ hexadécimal reste pour une couleur libre -->
                <div class="category-form__colors" role="group" :aria-label="t('categoriesPage.form.fields.color')">
                    <button
                        type="button"
                        class="category-form__swatch category-form__swatch--none"
                        :class="{ 'is-selected': !form.color }"
                        :aria-label="t('categoriesPage.form.clearColor')"
                        :aria-pressed="!form.color"
                        @click="colorModel = null"
                    >
                        <XIcon :size="14" stroke-width="1.8" />
                    </button>
                    <button
                        v-for="preset in CATEGORY_COLOR_PRESETS"
                        :key="preset"
                        type="button"
                        class="category-form__swatch"
                        :class="{ 'is-selected': isPresetSelected(preset) }"
                        :style="{ '--swatch': preset }"
                        :aria-label="preset"
                        :aria-pressed="isPresetSelected(preset)"
                        @click="colorModel = preset"
                    />
                </div>
                <AppColorPicker
                    v-model="colorModel"
                    class="category-form__custom"
                    :colors="CATEGORY_COLOR_PRESETS"
                    :label="t('categoriesPage.form.fields.color')"
                    :clear-label="t('categoriesPage.form.clearColor')"
                    hide-label
                />
                <p v-if="fieldErrors.color" class="category-form__note category-form__note--error">{{ fieldErrors.color }}</p>
            </div>
        </div>
        <div class="category-form__row category-form__row--top">
            <span class="category-form__label">{{ t('categoriesPage.form.fields.icone') }}</span>
            <div class="category-form__field">
                <CategoryIconPicker v-model="form.icone" :none-label="t('categoriesPage.form.noIcon')" />
                <p v-if="fieldErrors.icone" class="category-form__note category-form__note--error">{{ fieldErrors.icone }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.category-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ligne libellé 170 px | champ */
.category-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.category-form__row--top {
    align-items: start;
}

.category-form__row--top .category-form__label {
    padding-top: 8px;
}

.category-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.category-form__req {
    color: var(--blue-ink);
}

.category-form__field {
    min-width: 0;
}

.category-form__note {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.category-form__note--error {
    color: var(--danger);
}

/* pastilles rondes : la seule forme ronde autorisée pour une couleur */
.category-form__colors {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 4px 0 12px;
}

.category-form__swatch {
    appearance: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--swatch, transparent);
    color: var(--gray);
    cursor: pointer;
    transition: box-shadow 0.15s var(--ease);
}

.category-form__swatch--none {
    border: 1px solid var(--line);
}

.category-form__swatch:hover {
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 3px var(--gray);
}

.category-form__swatch.is-selected {
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 4px var(--ink);
}

.category-form__swatch:focus-visible {
    outline: none;
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 4px var(--blue-btn);
}

.category-form__custom {
    max-width: 240px;
}

@media (max-width: 599.98px) {
    .category-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .category-form__row--top .category-form__label {
        padding-top: 0;
    }
}
</style>
