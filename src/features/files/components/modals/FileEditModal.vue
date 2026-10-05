<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useFilesStore } from '@/features/files/stores/files-store';
import {
    buildUpdateFileRequest,
    emptyFileFormFields,
    fileToFormFields,
    isFileFormDirty,
    type FileFormFields
} from '@/features/files/payload';
import type { FileDto } from '@/features/files/types';

const props = defineProps<{
    modelValue: boolean;
    file?: FileDto | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [file: FileDto];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useFilesStore();

const localError = reactive({ message: null as string | null });
const nameError = reactive({ message: null as string | null });
const form = reactive<FileFormFields>(emptyFileFormFields());
const editFile = computed(() => props.file ?? null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    const current = editFile.value;
    if (!current) return false;
    return isFileFormDirty(current, form);
});

function assignForm(next: FileFormFields) {
    form.nameOriginal = next.nameOriginal;
    form.description = next.description;
    form.documentDate = next.documentDate;
}

function resetForm() {
    localError.message = null;
    nameError.message = null;
    const current = editFile.value;
    assignForm(current ? fileToFormFields(current) : emptyFileFormFields());
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        resetForm();
    }
);

async function onSave() {
    const current = editFile.value;
    if (!current || !canSave.value) return;
    localError.message = null;
    nameError.message = null;
    const built = buildUpdateFileRequest(current, form);
    if (!built.ok) {
        const message = t(`filesPage.errors.${built.code}`);
        if (built.code === 'nameRequired') nameError.message = message;
        else localError.message = message;
        return;
    }
    try {
        const saved = await store.updateFile(current.publicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('filesPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('filesPage.form.editTitle')"
        :subtitle="t('filesPage.form.subtitle')"
        :max-width="480"
        :height="smAndDown ? 460 : undefined"
        :fixed-height="smAndDown"
        :scrollable="false"
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-3" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <v-text-field
            v-model="form.nameOriginal"
            :label="t('filesPage.form.fields.nameOriginal')"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details="auto"
            :error="!!nameError.message"
            :error-messages="nameError.message || undefined"
        />
        <div class="mb-3">
            <AppDatePicker v-model="form.documentDate" :label="t('filesPage.form.fields.documentDate')" color="primary" hide-details />
        </div>
        <v-textarea
            v-model="form.description"
            :label="t('filesPage.form.fields.description')"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            rows="3"
            auto-grow
        />

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
