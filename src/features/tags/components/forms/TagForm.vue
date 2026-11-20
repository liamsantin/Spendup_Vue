<script setup lang="ts">
/**
 * Champs du formulaire tag. `form` est détenu par le parent.
 * Mise en page modale Swiss : libellé 170 px à gauche | champ carré à droite.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'TagForm' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { XIcon } from 'vue-tabler-icons';
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

function isPresetSelected(preset: string): boolean {
    return (props.form.color ?? '').toUpperCase() === preset.toUpperCase();
}
</script>

<template>
    <div class="tag-form">
        <div class="tag-form__row">
            <label class="tag-form__label" for="tag-form-name">
                {{ t('tagsPage.form.fields.name') }} <span class="tag-form__req" aria-hidden="true">*</span>
            </label>
            <div class="tag-form__field">
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
            </div>
        </div>
        <div class="tag-form__row tag-form__row--top">
            <span class="tag-form__label">{{ t('tagsPage.form.fields.color') }}</span>
            <div class="tag-form__field">
                <!-- pastilles rondes 32 px, sélection cerclée de noir ; le champ hexadécimal reste pour une couleur libre -->
                <div class="tag-form__colors" role="group" :aria-label="t('tagsPage.form.fields.color')">
                    <button
                        type="button"
                        class="tag-form__swatch tag-form__swatch--none"
                        :class="{ 'is-selected': !form.color }"
                        :aria-label="t('tagsPage.form.clearColor')"
                        :aria-pressed="!form.color"
                        @click="colorModel = null"
                    >
                        <XIcon :size="14" stroke-width="1.8" />
                    </button>
                    <button
                        v-for="preset in TAG_COLOR_PRESETS"
                        :key="preset"
                        type="button"
                        class="tag-form__swatch"
                        :class="{ 'is-selected': isPresetSelected(preset) }"
                        :style="{ '--swatch': preset }"
                        :aria-label="preset"
                        :aria-pressed="isPresetSelected(preset)"
                        @click="colorModel = preset"
                    />
                </div>
                <AppColorPicker
                    v-model="colorModel"
                    class="tag-form__custom"
                    :colors="TAG_COLOR_PRESETS"
                    :label="t('tagsPage.form.fields.color')"
                    :clear-label="t('tagsPage.form.clearColor')"
                    hide-label
                />
                <p v-if="fieldErrors.color" class="tag-form__note tag-form__note--error">{{ fieldErrors.color }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tag-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ligne libellé 170 px | champ */
.tag-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.tag-form__row--top {
    align-items: start;
}

.tag-form__row--top .tag-form__label {
    padding-top: 8px;
}

.tag-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.tag-form__req {
    color: var(--blue-ink);
}

.tag-form__field {
    min-width: 0;
}

.tag-form__note {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.tag-form__note--error {
    color: var(--danger);
}

/* pastilles rondes : la seule forme ronde autorisée pour une couleur */
.tag-form__colors {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 4px 0 12px;
}

.tag-form__swatch {
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

.tag-form__swatch--none {
    border: 1px solid var(--line);
}

.tag-form__swatch:hover {
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 3px var(--gray);
}

.tag-form__swatch.is-selected {
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 4px var(--ink);
}

.tag-form__swatch:focus-visible {
    outline: none;
    box-shadow:
        0 0 0 2px var(--raise),
        0 0 0 4px var(--blue-btn);
}

.tag-form__custom {
    max-width: 240px;
}

@media (max-width: 599.98px) {
    .tag-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .tag-form__row--top .tag-form__label {
        padding-top: 0;
    }
}
</style>
