<script setup lang="ts">
/**
 * Création / édition d’un document du bien. Création : choisir un PDF de la bibliothèque ou en téléverser un.
 * Édition : le fichier ne change pas (supprimer puis recréer pour changer de fichier).
 */
defineOptions({ name: 'RealEstateDocumentFormModal' });

import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileTextIcon, UploadIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { fileSizeParts } from '@/features/files/format';
import { useFilesStore } from '@/features/files/stores/files-store';
import { FILE_PDF_MIME } from '@/features/files/types';
import { validatePdfFile } from '@/features/files/validate-upload';
import { useRealEstateForm } from '@/features/real-estate/composables/useRealEstateForm';
import {
    buildCreateDocumentPayload,
    buildUpdateDocumentPayload,
    documentToFormFields,
    emptyDocumentFormFields,
    isDocumentFormDirty,
    type RealEstateDocumentFormFields
} from '@/features/real-estate/payload';
import { DOCUMENT_TYPES, REAL_ESTATE_NAME_MAX, REAL_ESTATE_NOTES_MAX, type RealEstateDocument } from '@/features/real-estate/types';
import RealEstateFormRow from '@/features/real-estate/components/forms/RealEstateFormRow.vue';

const props = defineProps<{
    modelValue: boolean;
    assetPublicId: string;
    document?: RealEstateDocument | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [document: RealEstateDocument];
}>();

const { t } = useI18n();
const filesStore = useFilesStore();
const { store, fieldErrors, localError, unitItems, clearErrors, applyPayloadError, applyError, ensureUnits } = useRealEstateForm(
    () => props.assetPublicId
);

const form = reactive<RealEstateDocumentFormFields>(emptyDocumentFormFields());
const inputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadProgress = ref(0);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.document);
const busy = computed(() => store.acting || uploading.value);
const canSave = computed(() => !props.document || isDocumentFormDirty(props.document, form));
const typeItems = computed(() => DOCUMENT_TYPES.map((value) => ({ title: t(`realEstatePage.documentTypes.${value}`), value })));
const units = computed(() => unitItems());

function sizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}

/** Bibliothèque : PDF seulement (le seul format accepté par `/api/files`). */
const fileItems = computed(() => {
    const none = { title: t('realEstatePage.form.document.noFile'), value: '' };
    const list = filesStore.items
        .filter((file) => !file.mimeType || file.mimeType === FILE_PDF_MIME)
        .map((file) => ({ title: `${file.nameOriginal} · ${sizeLabel(file.sizeBytes)}`, value: file.publicId }));
    return [none, ...list];
});

const dateModel = computed({
    get: () => form.documentDate,
    set: (value: string | null) => {
        form.documentDate = value;
    }
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        clearErrors();
        uploading.value = false;
        uploadProgress.value = 0;
        Object.assign(form, props.document ? documentToFormFields(props.document) : emptyDocumentFormFields());
        ensureUnits();
        if (!props.document) void filesStore.loadList().catch(() => undefined);
    }
);

async function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    fieldErrors.filePublicId = null;
    const check = await validatePdfFile(file);
    if (!check.ok) {
        fieldErrors.filePublicId = t(`filesPage.errors.${check.code}`);
        return;
    }
    uploading.value = true;
    uploadProgress.value = 0;
    try {
        const created = await filesStore.uploadFile(file, (percent) => {
            uploadProgress.value = percent;
        });
        form.filePublicId = created.publicId;
    } catch (e: unknown) {
        filesStore.clearError();
        fieldErrors.filePublicId = getErrorMessage(e);
    } finally {
        uploading.value = false;
    }
}

async function onSave() {
    if (!canSave.value || busy.value) return;
    clearErrors();
    const built = props.document ? buildUpdateDocumentPayload(form) : buildCreateDocumentPayload(form);
    if (!built.ok) {
        applyPayloadError(built.code, built.field);
        return;
    }
    try {
        const saved = props.document
            ? await store.updateDocument(props.assetPublicId, props.document.publicId, form)
            : await store.createDocument(props.assetPublicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        applyError(e, 'realEstatePage.errors.documentNotFound');
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('realEstatePage.form.document.editTitle') : t('realEstatePage.form.document.createTitle')"
        :subtitle="t('realEstatePage.form.document.subtitle')"
        :max-width="640"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <div class="re-form">
            <RealEstateFormRow
                v-if="isEdit && document"
                :label="t('realEstatePage.form.fields.file')"
                :hint="t('realEstatePage.form.document.fileLockedHint')"
            >
                <p class="re-doc-file">
                    <FileTextIcon :size="16" stroke-width="1.6" />
                    <span class="re-doc-file__name">{{ document.file.nameOriginal }}</span>
                    <span class="re-doc-file__size">{{ sizeLabel(document.file.sizeBytes) }}</span>
                </p>
            </RealEstateFormRow>
            <RealEstateFormRow
                v-else
                :label="t('realEstatePage.form.fields.file')"
                required
                :error="fieldErrors.filePublicId"
                :hint="t('realEstatePage.form.document.fileHint')"
            >
                <div class="re-doc-picker">
                    <AppSelect
                        v-model="form.filePublicId"
                        :items="fileItems"
                        :label="t('realEstatePage.form.fields.file')"
                        :disabled="uploading"
                        searchable
                        hide-details="auto"
                    />
                    <input
                        ref="inputRef"
                        class="re-doc-picker__input"
                        type="file"
                        :accept="`${FILE_PDF_MIME},.pdf`"
                        @change="onFileSelected"
                    />
                    <button type="button" class="su-btn" :disabled="busy" @click="inputRef?.click()">
                        <UploadIcon :size="16" stroke-width="1.6" />
                        {{
                            uploading
                                ? t('realEstatePage.form.document.uploading', { percent: uploadProgress })
                                : t('realEstatePage.form.document.upload')
                        }}
                    </button>
                </div>
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.documentType')" required :error="fieldErrors.documentType">
                <AppSelect
                    v-model="form.documentType"
                    :items="typeItems"
                    :label="t('realEstatePage.form.fields.documentType')"
                    hide-details="auto"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.documentName')"
                for-id="re-doc-name"
                :error="fieldErrors.name"
                :hint="t('realEstatePage.form.document.nameHint')"
            >
                <v-text-field
                    id="re-doc-name"
                    v-model="form.name"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="REAL_ESTATE_NAME_MAX"
                    :error="!!fieldErrors.name"
                />
            </RealEstateFormRow>
            <RealEstateFormRow
                :label="t('realEstatePage.form.fields.documentDate')"
                :error="fieldErrors.documentDate"
                :hint="t('realEstatePage.form.document.dateHint')"
            >
                <AppDatePicker v-model="dateModel" :label="t('realEstatePage.form.fields.documentDate')" clearable />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.unit')" :error="fieldErrors.unitPublicId">
                <AppSelect v-model="form.unitPublicId" :items="units" :label="t('realEstatePage.form.fields.unit')" hide-details="auto" />
            </RealEstateFormRow>
            <RealEstateFormRow :label="t('realEstatePage.form.fields.notes')" for-id="re-doc-notes" :error="fieldErrors.notes">
                <v-textarea
                    id="re-doc-notes"
                    v-model="form.notes"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :maxlength="REAL_ESTATE_NOTES_MAX"
                    :error="!!fieldErrors.notes"
                />
            </RealEstateFormRow>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="busy" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="busy || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.re-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.re-doc-picker {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.re-doc-picker > :first-child {
    align-self: stretch;
}

.re-doc-picker__input {
    display: none;
}

/* fichier en lecture seule : nom 700, taille grise */
.re-doc-file {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    font-size: 14px;
}

.re-doc-file > svg {
    flex: none;
    color: var(--gray);
}

.re-doc-file__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.re-doc-file__size {
    flex: none;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}
</style>
