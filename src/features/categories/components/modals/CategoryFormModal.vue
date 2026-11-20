<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { taxNaturesApi } from '@/features/categories/api';
import { TAX_NATURE_CODES } from '@/features/categories/tax-natures';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { compatibleParentCandidates } from '@/features/categories/format';
import {
    buildCreateCategoryPayload,
    buildUpdateCategoryPayload,
    isCategoryFormDirty,
    type CategoryFormFields,
    type CategoryPayloadErrorCode
} from '@/features/categories/payload';
import { CATEGORY_TYPES, type Category, type CategoryType } from '@/features/categories/types';
import CategoryForm, { type CategoryFormFieldErrors } from '@/features/categories/components/forms/CategoryForm.vue';

const props = defineProps<{
    modelValue: boolean;
    category?: Category | null;
    defaultParentPublicId?: string | null;
    defaultType?: CategoryType | null;
    /** Pré-remplit le nom (création rapide depuis un sélecteur). */
    defaultName?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [category: Category];
}>();

const { t } = useI18n();
const store = useCategoriesStore();

const isEdit = ref(false);
const editCategory = ref<Category | null>(null);

const typeItems = computed(() => CATEGORY_TYPES.map((value) => ({ title: t(`categoriesPage.types.${value}`), value })));

const hasChildren = computed(() => (editCategory.value?.children?.length ?? 0) > 0);

const parentItems = computed(() => {
    const none = [{ title: t('categoriesPage.form.noParent'), value: '' }];
    const roots = store.items;
    const candidates = compatibleParentCandidates(roots, form.type, editCategory.value?.publicId);
    return [...none, ...candidates.map((item) => ({ title: item.name, value: item.publicId }))];
});

const parentHint = computed(() => (isEdit.value && hasChildren.value ? t('categoriesPage.form.parentLockedHint') : null));

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<CategoryFormFieldErrors>({});

const form = reactive<CategoryFormFields>({
    name: '',
    type: 'depense',
    color: null,
    icone: '',
    parentPublicId: '',
    taxNature: ''
});

/** Nature proposée d'après le nom (création seulement) ; appliquée seulement sur geste. */
const suggestedTaxNature = ref<string | null>(null);
let suggestTimer: ReturnType<typeof setTimeout> | null = null;
let suggestSeq = 0;

function scheduleSuggestion() {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestedTaxNature.value = null;
    if (isEdit.value || form.taxNature || form.name.trim().length < 3) return;
    const seq = ++suggestSeq;
    suggestTimer = setTimeout(async () => {
        try {
            const res = await taxNaturesApi.suggest(form.name.trim(), form.type);
            const code = res.taxNature;
            if (seq === suggestSeq && !form.taxNature && code && (TAX_NATURE_CODES as readonly string[]).includes(code)) {
                suggestedTaxNature.value = code;
            }
        } catch {
            // Suggestion facultative : l'échec ne gêne jamais la saisie.
        }
    }, 350);
}

watch(
    () => [form.name, form.type, form.taxNature] as const,
    () => scheduleSuggestion()
);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (!isEdit.value || !editCategory.value) return true;
    return isCategoryFormDirty(editCategory.value, form);
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.type = null;
    fieldErrors.color = null;
    fieldErrors.icone = null;
    fieldErrors.parentPublicId = null;
    fieldErrors.taxNature = null;
}

function payloadErrorText(code: CategoryPayloadErrorCode): string {
    return t(`categoriesPage.form.errors.${code}`);
}

function applyPayloadErrors(code: CategoryPayloadErrorCode, field?: string) {
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
    const category = editCategory.value;
    if (category) {
        form.name = category.name;
        form.type = category.type;
        form.color = category.color;
        form.icone = category.icone ?? '';
        form.parentPublicId = category.parentPublicId ?? '';
        form.taxNature = category.taxNature ?? '';
        return;
    }
    form.name = props.defaultName?.trim() || '';
    form.type = props.defaultType || 'depense';
    form.color = null;
    form.icone = '';
    form.parentPublicId = props.defaultParentPublicId?.trim() || '';
    form.taxNature = '';
    suggestedTaxNature.value = null;
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.category;
        editCategory.value = props.category ?? null;
        resetForm();
    }
);

watch(
    () => form.type,
    () => {
        if (!form.parentPublicId) return;
        const stillValid = parentItems.value.some((item) => item.value === form.parentPublicId);
        if (!stillValid) form.parentPublicId = '';
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const roots = store.items;
    const built = isEdit.value
        ? buildUpdateCategoryPayload(form, roots, editCategory.value?.publicId)
        : buildCreateCategoryPayload(form, roots);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && editCategory.value
                ? await store.updateCategory(editCategory.value.publicId, form)
                : await store.createCategory(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('categoriesPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('categoriesPage.form.editTitle') : t('categoriesPage.form.createTitle')"
        :subtitle="t('categoriesPage.form.subtitle')"
        :max-width="600"
        :height="720"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <CategoryForm
            :form="form"
            :is-edit="isEdit"
            :type-items="typeItems"
            :parent-items="parentItems"
            :field-errors="fieldErrors"
            :parent-disabled="hasChildren"
            :parent-hint="parentHint"
            :suggested-tax-nature="suggestedTaxNature"
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
