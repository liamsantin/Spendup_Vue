<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileDescriptionIcon, TagsIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import RecurringKindChoice from '@/features/recurring-payments/components/forms/RecurringKindChoice.vue';
import RecurringTypeChoice, {
    type RecurringTypePick
} from '@/features/recurring-payments/components/forms/RecurringTypeChoice.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { categorySelectItems } from '@/features/categories/payload';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import RecurringTemplateForm, {
    type RecurringTemplateFormFieldErrors
} from '@/features/recurring-payments/components/forms/RecurringTemplateForm.vue';
import {
    buildCreateExpensePayload,
    buildCreateIncomePayload,
    buildUpdateExpensePayload,
    buildUpdateIncomePayload,
    emptyRecurringForm,
    isExpenseFormDirty,
    isIncomeFormDirty,
    type RecurringPayloadErrorCode,
    type RecurringTemplateFormFields
} from '@/features/recurring-payments/payload';
import { canWriteRecurringOnAccount } from '@/features/recurring-payments/rights';
import { isDueSettled, isExpenseTemplate, todayLocalYmd } from '@/features/recurring-payments/format';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import {
    RECURRING_EXPENSE_FREQUENCIES,
    RECURRING_EXPENSE_SETTLED_DUE_STATUS,
    RECURRING_EXPENSE_TYPES,
    RECURRING_INCOME_FREQUENCIES,
    RECURRING_INCOME_SETTLED_DUE_STATUS,
    RECURRING_INCOME_TYPES,
    type RecurringExpense,
    type RecurringExpenseType,
    type RecurringIncome,
    type RecurringIncomeType,
    type RecurringKind
} from '@/features/recurring-payments/types';

const props = defineProps<{
    modelValue: boolean;
    kind?: RecurringKind | null;
    /** Si défini, la création ouvre le choix de type (ce groupe en premier). */
    typeChoiceFirst?: RecurringKind | null;
    defaultType?: RecurringExpenseType | RecurringIncomeType | null;
    template?: RecurringExpense | RecurringIncome | null;
    defaultAccountPublicId?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [template: RecurringExpense | RecurringIncome];
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();
const paymentMethodsStore = usePaymentMethodsStore();
const store = useRecurringPaymentsStore();

const isEdit = ref(false);
const editExpense = ref<RecurringExpense | null>(null);
const editIncome = ref<RecurringIncome | null>(null);
const accountLocked = ref(false);
const resolvedKind = ref<RecurringKind>('expense');
const createStep = ref<'kind' | 'type' | 'form'>('form');
const pickingKind = computed(() => !isEdit.value && createStep.value === 'kind');
const pickingType = computed(() => !isEdit.value && createStep.value === 'type');
const pickingStart = computed(() => pickingKind.value || pickingType.value);

const writableAccounts = computed(() => accountsStore.accounts.filter((item) => canWriteRecurringOnAccount(item)));
const accountItems = computed(() => {
    const items = writableAccounts.value.map((item) => ({ title: item.name, value: item.publicId }));
    const currentId = form.accountPublicId;
    if (currentId && !items.some((item) => item.value === currentId)) {
        const current = accountsStore.accounts.find((item) => item.publicId === currentId);
        if (current) items.unshift({ title: current.name, value: current.publicId });
    }
    return items;
});

const expenseTypeItems = computed(() =>
    RECURRING_EXPENSE_TYPES.map((value) => ({ title: t(`recurrencesPage.expenseTypes.${value}`), value }))
);
const incomeTypeItems = computed(() =>
    RECURRING_INCOME_TYPES.map((value) => ({ title: t(`recurrencesPage.incomeTypes.${value}`), value }))
);
const expenseFrequencyItems = computed(() =>
    RECURRING_EXPENSE_FREQUENCIES.map((value) => ({ title: t(`recurrencesPage.expenseFrequencies.${value}`), value }))
);
const incomeFrequencyItems = computed(() =>
    RECURRING_INCOME_FREQUENCIES.map((value) => ({ title: t(`recurrencesPage.incomeFrequencies.${value}`), value }))
);

const paymentMethodItems = computed(() => {
    const none = [{ title: t('recurrencesPage.form.noPaymentMethod'), value: '' }];
    return [
        ...none,
        ...paymentMethodsStore.items
            .filter((item) => item.accountPublicId === form.accountPublicId && item.isActive)
            .map((item) => ({ title: item.label, value: item.publicId }))
    ];
});

const categoryItems = computed(() => {
    const allowed = resolvedKind.value === 'expense' ? new Set(['depense', 'mixte']) : new Set(['revenu', 'mixte']);
    const roots = categoriesStore.items.filter((item) => allowed.has(item.type));
    const filtered = roots.map((root) => ({
        ...root,
        children: (root.children ?? []).filter((child) => allowed.has(child.type))
    }));
    return categorySelectItems(filtered, { noneTitle: t('recurrencesPage.form.noCategory') });
});

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<RecurringTemplateFormFieldErrors>({});
const form = reactive<RecurringTemplateFormFields>(emptyRecurringForm(props.kind ?? 'expense'));
const activeTab = ref<'template' | 'classification'>('template');

const CLASSIFICATION_FIELDS = new Set(['paymentMethodPublicId', 'categoryPublicId', 'tierPublicId', 'notes']);

const formTabs = computed(() => [
    { value: 'template' as const, label: t('recurrencesPage.form.tabs.template'), icon: FileDescriptionIcon },
    { value: 'classification' as const, label: t('recurrencesPage.form.tabs.classification'), icon: TagsIcon }
]);

const modalTitle = computed(() => {
    if (pickingStart.value) return t('recurrencesPage.form.pickKindTitle');
    if (isEdit.value) {
        return resolvedKind.value === 'expense' ? t('recurrencesPage.form.editExpenseTitle') : t('recurrencesPage.form.editIncomeTitle');
    }
    return resolvedKind.value === 'expense'
        ? t('recurrencesPage.form.createExpenseTitle')
        : t('recurrencesPage.form.createIncomeTitle');
});

const modalSubtitle = computed(() =>
    pickingType.value
        ? t('recurrencesPage.form.pickTypeSubtitle')
        : pickingKind.value
          ? t('recurrencesPage.form.pickKindSubtitle')
          : t('recurrencesPage.form.subtitle')
);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const canSave = computed(() => {
    if (pickingStart.value) return false;
    if (!isEdit.value) return true;
    if (resolvedKind.value === 'expense' && editExpense.value) return isExpenseFormDirty(editExpense.value, form);
    if (resolvedKind.value === 'income' && editIncome.value) return isIncomeFormDirty(editIncome.value, form);
    return true;
});

function payloadErrorText(code: RecurringPayloadErrorCode): string {
    return t(`recurrencesPage.form.errors.${code}`);
}

function applyPayloadErrors(code: RecurringPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field) activeTab.value = CLASSIFICATION_FIELDS.has(field) ? 'classification' : 'template';
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.expenseType = null;
    fieldErrors.incomeType = null;
    fieldErrors.expenseFrequency = null;
    fieldErrors.incomeFrequency = null;
    fieldErrors.plannedAmount = null;
    fieldErrors.startDate = null;
    fieldErrors.endDate = null;
    fieldErrors.accountPublicId = null;
    fieldErrors.paymentDay = null;
    fieldErrors.notes = null;
}

function fillFromExpense(item: RecurringExpense) {
    Object.assign(form, emptyRecurringForm('expense', item.accountPublicId));
    form.name = item.name;
    form.expenseType = item.expenseType as RecurringTemplateFormFields['expenseType'];
    form.expenseFrequency = item.frequency as RecurringTemplateFormFields['expenseFrequency'];
    form.plannedAmount = String(item.plannedAmount);
    form.startDate = item.startDate;
    form.endDate = item.endDate;
    form.isActive = item.isActive;
    form.paymentMethodPublicId = item.paymentMethodPublicId ?? '';
    form.categoryPublicId = item.categoryPublicId ?? '';
    form.tierPublicId = item.tierPublicId ?? '';
    form.notes = item.notes ?? '';
}

function fillFromIncome(item: RecurringIncome) {
    Object.assign(form, emptyRecurringForm('income', item.accountPublicId));
    form.name = item.name;
    form.incomeType = item.incomeType as RecurringTemplateFormFields['incomeType'];
    form.incomeFrequency = item.frequency as RecurringTemplateFormFields['incomeFrequency'];
    form.plannedAmount = String(item.plannedAmount);
    form.startDate = item.startDate;
    form.endDate = item.endDate;
    form.isActive = item.isActive;
    form.paymentMethodPublicId = item.paymentMethodPublicId ?? '';
    form.categoryPublicId = item.categoryPublicId ?? '';
    form.tierPublicId = item.tierPublicId ?? '';
    form.notes = item.notes ?? '';
    form.paymentDay = item.paymentDay == null ? '' : String(item.paymentDay);
}

async function detectAccountLock(kind: RecurringKind, publicId: string) {
    try {
        const dues = await store.loadDues(kind, publicId, {
            status: kind === 'expense' ? RECURRING_EXPENSE_SETTLED_DUE_STATUS : RECURRING_INCOME_SETTLED_DUE_STATUS,
            pageSize: 1
        });
        accountLocked.value = dues.some((due) => isDueSettled(due, kind));
    } catch {
        accountLocked.value = false;
    }
}

function applyCreateDefaults(kind: RecurringKind) {
    resolvedKind.value = kind;
    Object.assign(form, emptyRecurringForm(kind, props.defaultAccountPublicId?.trim() || writableAccounts.value[0]?.publicId || ''));
    form.startDate = todayLocalYmd();
}

function pickKind(kind: RecurringKind) {
    applyCreateDefaults(kind);
    createStep.value = 'form';
    activeTab.value = 'template';
}

function pickType(pick: RecurringTypePick) {
    applyCreateDefaults(pick.kind);
    if (pick.kind === 'expense') form.expenseType = pick.type;
    else form.incomeType = pick.type;
    createStep.value = 'form';
    activeTab.value = 'template';
}

async function resetForm() {
    localError.message = null;
    clearFieldErrors();
    accountLocked.value = false;
    const expense = editExpense.value;
    const income = editIncome.value;
    if (expense) {
        resolvedKind.value = 'expense';
        createStep.value = 'form';
        fillFromExpense(expense);
        await detectAccountLock('expense', expense.publicId);
        return;
    }
    if (income) {
        resolvedKind.value = 'income';
        createStep.value = 'form';
        fillFromIncome(income);
        await detectAccountLock('income', income.publicId);
        return;
    }
    if (props.kind) {
        createStep.value = 'form';
        applyCreateDefaults(props.kind);
        if (props.defaultType) {
            if (props.kind === 'expense') form.expenseType = props.defaultType as RecurringExpenseType;
            else form.incomeType = props.defaultType as RecurringIncomeType;
        }
        return;
    }
    if (props.typeChoiceFirst) {
        createStep.value = 'type';
        applyCreateDefaults(props.typeChoiceFirst);
        return;
    }
    createStep.value = 'kind';
    applyCreateDefaults('expense');
}

watch(
    () => props.modelValue,
    async (value) => {
        if (!value) return;
        activeTab.value = 'template';
        isEdit.value = !!props.template;
        const template = props.template ?? null;
        editExpense.value = template && isExpenseTemplate(template) ? template : null;
        editIncome.value = template && !isExpenseTemplate(template) ? template : null;
        void categoriesStore.bootstrap();
        void paymentMethodsStore.loadList({
            accountPublicId: props.template?.accountPublicId ?? props.defaultAccountPublicId ?? undefined
        });
        await resetForm();
    }
);

watch(
    () => form.accountPublicId,
    (accountPublicId) => {
        if (!accountPublicId) return;
        void paymentMethodsStore.loadList({ accountPublicId });
        if (!isEdit.value) form.paymentMethodPublicId = '';
    }
);

async function onSave() {
    if (pickingStart.value || (isEdit.value && !canSave.value)) return;
    localError.message = null;
    clearFieldErrors();
    const ctx = { accounts: accountsStore.accounts, requireWrite: true as const };
    const built =
        resolvedKind.value === 'expense'
            ? isEdit.value
                ? buildUpdateExpensePayload(form, ctx)
                : buildCreateExpensePayload(form, ctx)
            : isEdit.value
              ? buildUpdateIncomePayload(form, ctx)
              : buildCreateIncomePayload(form, ctx);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        return;
    }
    try {
        const saved =
            resolvedKind.value === 'expense'
                ? isEdit.value && editExpense.value
                    ? await store.updateExpense(editExpense.value.publicId, form)
                    : await store.createExpense(form)
                : isEdit.value && editIncome.value
                  ? await store.updateIncome(editIncome.value.publicId, form)
                  : await store.createIncome(form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('recurrencesPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-if="pickingStart"
        v-model="open"
        :title="modalTitle"
        :subtitle="modalSubtitle"
        :max-width="480"
        :height="pickingType ? 640 : 420"
        :show-footer="false"
        scrollable
        mobile-layout="fullscreen"
    >
        <RecurringTypeChoice v-if="pickingType" :kind="typeChoiceFirst ?? 'income'" @select="pickType" />
        <RecurringKindChoice v-else @select="pickKind" />
    </AppModalBase>
    <AppModalTabs
        v-else
        v-model="open"
        v-model:tab="activeTab"
        :title="modalTitle"
        :subtitle="modalSubtitle"
        :tabs="formTabs"
        :height="720"
        :max-width="640"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <template #panel-template>
            <AppModalPanelScroll>
                <RecurringTemplateForm
                    section="template"
                    :form="form"
                    :is-edit="isEdit"
                    :account-items="accountItems"
                    :expense-type-items="expenseTypeItems"
                    :income-type-items="incomeTypeItems"
                    :expense-frequency-items="expenseFrequencyItems"
                    :income-frequency-items="incomeFrequencyItems"
                    :payment-method-items="paymentMethodItems"
                    :category-items="categoryItems"
                    :field-errors="fieldErrors"
                    :account-locked="accountLocked"
                    :pause-hint="t('recurrencesPage.form.pauseHint')"
                />
            </AppModalPanelScroll>
        </template>

        <template #panel-classification>
            <AppModalPanelScroll>
                <RecurringTemplateForm
                    section="classification"
                    :form="form"
                    :is-edit="isEdit"
                    :account-items="accountItems"
                    :expense-type-items="expenseTypeItems"
                    :income-type-items="incomeTypeItems"
                    :expense-frequency-items="expenseFrequencyItems"
                    :income-frequency-items="incomeFrequencyItems"
                    :payment-method-items="paymentMethodItems"
                    :category-items="categoryItems"
                    :field-errors="fieldErrors"
                    :account-locked="accountLocked"
                    :pause-hint="t('recurrencesPage.form.pauseHint')"
                />
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalTabs>
</template>
