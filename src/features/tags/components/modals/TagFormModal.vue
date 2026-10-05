<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import {
    buildCreateTagPayload,
    buildUpdateTagPayload,
    emptyTagFormFields,
    isTagFormDirty,
    tagToFormFields,
    type TagFormFields,
    type TagPayloadErrorCode
} from '@/features/tags/payload';
import type { Tag } from '@/features/tags/types';
import TagForm, { type TagFormFieldErrors } from '@/features/tags/components/forms/TagForm.vue';

const props = defineProps<{
    modelValue: boolean;
    tag?: Tag | null;
    /** Pré-remplit le nom (création rapide depuis un sélecteur). */
    defaultName?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [tag: Tag];
}>();

const { t } = useI18n();
const store = useTagsStore();

const isEdit = ref(false);
const editTag = ref<Tag | null>(null);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<TagFormFieldErrors>({});
const form = reactive<TagFormFields>(emptyTagFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (!isEdit.value || !editTag.value) return true;
    return isTagFormDirty(editTag.value, form);
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.color = null;
}

function payloadErrorText(code: TagPayloadErrorCode): string {
    return t(`tagsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: TagPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const tag = editTag.value;
    if (tag) {
        Object.assign(form, tagToFormFields(tag));
        return;
    }
    Object.assign(form, emptyTagFormFields({ name: props.defaultName?.trim() || '' }));
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.tag;
        editTag.value = props.tag ?? null;
        resetForm();
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const known = store.allKnownItems();
    const built = isEdit.value ? buildUpdateTagPayload(form, known, editTag.value?.publicId) : buildCreateTagPayload(form, known);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved = isEdit.value && editTag.value ? await store.updateTag(editTag.value.publicId, form) : await store.createTag(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('tagsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('tagsPage.form.editTitle') : t('tagsPage.form.createTitle')"
        :subtitle="t('tagsPage.form.subtitle')"
        :max-width="560"
        :height="480"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <TagForm :form="form" :field-errors="fieldErrors" />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
