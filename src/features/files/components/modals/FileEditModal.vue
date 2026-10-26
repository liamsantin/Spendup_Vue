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
        :max-width="560"
        :height="smAndDown ? 460 : undefined"
        :fixed-height="smAndDown"
        :scrollable="false"
        mobile-layout="sheet"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-3" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <!-- lignes libellé 170 px | champ carré -->
        <div class="file-edit-form">
            <div class="file-edit-form__row">
                <label class="file-edit-form__label" for="file-form-name">
                    {{ t('filesPage.form.fields.nameOriginal') }} <span class="file-edit-form__req" aria-hidden="true">*</span>
                </label>
                <div class="file-edit-form__field">
                    <v-text-field
                        id="file-form-name"
                        v-model="form.nameOriginal"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                        autocomplete="off"
                        :placeholder="t('filesPage.form.placeholders.nameOriginal')"
                        :error="!!nameError.message"
                        :error-messages="nameError.message || undefined"
                    />
                </div>
            </div>
            <div class="file-edit-form__row">
                <label class="file-edit-form__label" for="file-form-date">{{ t('filesPage.form.fields.documentDate') }}</label>
                <div class="file-edit-form__field">
                    <AppDatePicker
                        id="file-form-date"
                        v-model="form.documentDate"
                        color="primary"
                        hide-details
                        :placeholder="t('filesPage.form.placeholders.documentDate')"
                    />
                </div>
            </div>
            <div class="file-edit-form__row file-edit-form__row--top">
                <label class="file-edit-form__label" for="file-form-description">{{ t('filesPage.form.fields.description') }}</label>
                <div class="file-edit-form__field">
                    <v-textarea
                        id="file-form-description"
                        v-model="form.description"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                        rows="3"
                        auto-grow
                        :placeholder="t('filesPage.form.placeholders.description')"
                    />
                </div>
            </div>
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
.file-edit-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.file-edit-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 8px 16px;
    align-items: center;
}

.file-edit-form__row--top {
    align-items: start;
}

.file-edit-form__row--top .file-edit-form__label {
    padding-top: 10px;
}

.file-edit-form__label {
    font-size: 14px;
    color: var(--ink);
    line-height: 1.3;
}

.file-edit-form__req {
    color: var(--blue-ink);
}

.file-edit-form__field {
    min-width: 0;
}

@media (max-width: 599.98px) {
    .file-edit-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .file-edit-form__row--top .file-edit-form__label {
        padding-top: 0;
    }
}
</style>
