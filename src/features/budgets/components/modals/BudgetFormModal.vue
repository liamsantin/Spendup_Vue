<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { EyeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { budgetLinkedTransactionsQuery } from '@/features/budgets/paths';
import { useBudgetsStore } from '@/features/budgets/stores/budgets-store';
import {
    budgetToFormFields,
    buildCreateBudgetPayload,
    buildUpdateBudgetPayload,
    emptyBudgetFormFields,
    isBudgetFormDirty,
    type BudgetFormFields,
    type BudgetPayloadErrorCode
} from '@/features/budgets/payload';
import { todayLocalYmd } from '@/features/budgets/format';
import type { Budget } from '@/features/budgets/types';
import { flattenCategories } from '@/features/categories/format';
import { categorySelectItems } from '@/features/categories/payload';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useUserSettingsStore } from '@/features/user-settings';
import BudgetForm, { type BudgetFormFieldErrors } from '@/features/budgets/components/forms/BudgetForm.vue';

const props = defineProps<{
    modelValue: boolean;
    budget?: Budget | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [budget: Budget];
}>();

const { t } = useI18n();
const router = useRouter();
const store = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const settings = useUserSettingsStore();

const isEdit = ref(false);
const editBudget = ref<Budget | null>(null);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<BudgetFormFieldErrors>({});
const form = reactive<BudgetFormFields>(emptyBudgetFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const expenseCategoryItems = computed(() => {
    const allowed = new Set(['depense', 'mixte']);
    const roots = categoriesStore.items.filter((item) => allowed.has(item.type));
    const filtered = roots.map((root) => ({
        ...root,
        children: (root.children ?? []).filter((child) => allowed.has(child.type))
    }));
    return categorySelectItems(filtered, { noneTitle: t('budgetsPage.form.allExpenses') });
});

const categoryTypes = computed(() => {
    const map = new Map<string, string>();
    for (const item of flattenCategories(categoriesStore.items)) {
        map.set(item.publicId, item.type);
    }
    return map;
});

const currencyHint = computed(() => {
    if (isEdit.value) return t('budgetsPage.form.currencyLockedHint');
    return t('budgetsPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const canSave = computed(() => {
    if (!isEdit.value || !editBudget.value) return true;
    return isBudgetFormDirty(editBudget.value, form);
});

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.limitAmount = null;
    fieldErrors.periode = null;
    fieldErrors.startDate = null;
    fieldErrors.endDate = null;
    fieldErrors.categoryPublicId = null;
    fieldErrors.currency = null;
}

function payloadErrorText(code: BudgetPayloadErrorCode): string {
    return t(`budgetsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: BudgetPayloadErrorCode, field?: string) {
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
    const budget = editBudget.value;
    if (budget) {
        Object.assign(form, budgetToFormFields(budget));
        return;
    }
    Object.assign(
        form,
        emptyBudgetFormFields({
            currency: settings.current.defaultCurrency,
            startDate: todayLocalYmd()
        })
    );
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEdit.value = !!props.budget;
        editBudget.value = props.budget ?? null;
        resetForm();
        if (!categoriesStore.initialized) {
            void categoriesStore.loadList().catch(() => undefined);
        }
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const ctx = {
        knownBudgets: store.allKnownItems(),
        excludePublicId: editBudget.value?.publicId,
        lockedCurrency: editBudget.value?.currency ?? null,
        categoryTypes: categoryTypes.value
    };
    const built = isEdit.value ? buildUpdateBudgetPayload(form, ctx) : buildCreateBudgetPayload(form, ctx);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            isEdit.value && editBudget.value
                ? await store.updateBudget(editBudget.value.publicId, form, {
                      lockedCurrency: editBudget.value.currency,
                      categoryTypes: categoryTypes.value
                  })
                : await store.createBudget(form, { categoryTypes: categoryTypes.value });
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('budgetsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}

async function seeRelatedTransactions() {
    const budget = editBudget.value;
    if (!budget) return;
    await router.push({ path: '/app/finances/transactions', query: budgetLinkedTransactionsQuery(budget) });
    open.value = false;
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('budgetsPage.form.editTitle') : t('budgetsPage.form.createTitle')"
        :subtitle="t('budgetsPage.form.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <BudgetForm
            :form="form"
            :is-edit="isEdit"
            :category-items="expenseCategoryItems"
            :field-errors="fieldErrors"
            :pause-hint="t('budgetsPage.form.pauseHint')"
            :currency-hint="currencyHint"
        />

        <template #footer="{ close }">
            <button
                v-if="isEdit"
                type="button"
                class="su-btn su-btn--ghost"
                :disabled="store.acting"
                @click="seeRelatedTransactions"
            >
                <EyeIcon :size="16" stroke-width="1.6" />
                {{ t('budgetsPage.detail.seeTransactions') }}
            </button>
            <button
                type="button"
                :class="isEdit ? 'su-btn' : 'su-btn su-btn--ghost'"
                :disabled="store.acting"
                @click="close"
            >
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
