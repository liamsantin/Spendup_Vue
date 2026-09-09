<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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
        :max-width="520"
        :height="560"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <div class="file-form">
            <v-row>
                <v-col cols="12" sm="3">
                    <v-label class="font-weight-medium">{{ t('filesPage.form.fields.nameOriginal') }}</v-label>
                </v-col>
                <v-col cols="12" sm="9">
                    <v-text-field
                        v-model="form.nameOriginal"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        :placeholder="t('filesPage.form.placeholders.nameOriginal')"
                        :error="!!nameError.message"
                        :error-messages="nameError.message || undefined"
                    />
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="12" sm="3">
                    <v-label class="font-weight-medium">{{ t('filesPage.form.fields.documentDate') }}</v-label>
                </v-col>
                <v-col cols="12" sm="9">
                    <AppDatePicker
                        v-model="form.documentDate"
                        color="primary"
                        hide-details
                        :placeholder="t('filesPage.form.placeholders.documentDate')"
                    />
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="12" sm="3">
                    <v-label class="font-weight-medium">{{ t('filesPage.form.fields.description') }}</v-label>
                </v-col>
                <v-col cols="12" sm="9">
                    <v-textarea
                        v-model="form.description"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        rows="3"
                        auto-grow
                        :placeholder="t('filesPage.form.placeholders.description')"
                    />
                </v-col>
            </v-row>
        </div>

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

<style scoped>
.file-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
</style>
