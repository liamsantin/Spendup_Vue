<script setup lang="ts">
/**
 * Corriger / trancher une ligne : dates, libellé, montant signé, catégorie, tier.
 * `validee` / `ignoree` gardent leur statut tant qu’elles restent valides ;
 * `aValider` / `erreur` sont réévaluées par l’API après chaque correction.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { parseAccountAmount, todayYmd } from '@/features/accounts/format';
import CategoryFormModal from '@/features/categories/components/modals/CategoryFormModal.vue';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import type { Category } from '@/features/categories/types';
import TierPicker from '@/features/tiers/components/forms/TierPicker.vue';
import { formatOperationDate } from '@/features/transactions/format';
import ImportStatusChip from '@/features/imports/components/list/ImportStatusChip.vue';
import { formatImportAmount, hasUncorrectableIssue, importLineDoubt, issueFields } from '@/features/imports/format';
import {
    buildImportLinePayload,
    importLineToFormFields,
    isCategoryCompatibleWithAmount,
    isImportLineFormDirty,
    sanitizeSignedAmountInput,
    type ImportLineFormFields,
    type ImportLinePayloadErrorCode
} from '@/features/imports/payload';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import { IMPORT_LINE_LABEL_MAX, type ImportLine, type UpdateImportLinePayload } from '@/features/imports/types';

/** Après le PATCH : fermer, rester si la ligne est toujours en erreur, ou rester pour continuer. */
type AfterPatch = 'close' | 'stayIfError' | 'stay';

const props = defineProps<{
    modelValue: boolean;
    line: ImportLine | null;
    accountPublicId?: string | null;
    currency?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    notice: [message: string];
}>();

const { t, locale } = useI18n();
const store = useImportsStore();
const categoriesStore = useCategoriesStore();

const form = reactive<ImportLineFormFields>({
    operationDate: '',
    valueDate: null,
    label: '',
    amount: '',
    categoryPublicId: '',
    tierPublicId: ''
});
const fieldErrors = reactive<Partial<Record<keyof ImportLineFormFields, string>>>({});
const localError = ref<string | null>(null);
const applySameLabel = ref(false);
const categoryCreateOpen = ref(false);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

/** Version à jour depuis le store (après PATCH ou événement d’un autre onglet). */
const live = computed(() => {
    const id = props.line?.publicId;
    return (id ? store.lines.find((item) => item.publicId === id) : null) ?? props.line;
});

const title = computed(() => (live.value ? t('importsPage.lines.lineNumber', { n: live.value.lineNumber }) : ''));
const faulty = computed(() => (live.value ? issueFields(live.value) : new Set<string>()));
const uncorrectable = computed(() => (live.value ? hasUncorrectableIssue(live.value) : false));
const doubt = computed(() => (live.value ? importLineDoubt(live.value) : null));
const dirty = computed(() => (live.value ? isImportLineFormDirty(live.value, form) : false));
const maxDate = computed(() => todayYmd());

const formAmount = computed(() => parseAccountAmount(form.amount.trim()) ?? live.value?.amount ?? null);

const categoryItems = computed(() => {
    const amount = formAmount.value;
    const items: { title: string; value: string; indent?: number }[] = [{ title: t('importsPage.lines.edit.noCategory'), value: '' }];
    for (const root of categoriesStore.items) {
        const children = (root.children ?? []).filter(
            (child) => isCategoryCompatibleWithAmount(child.type, amount) && child.type !== 'transfert'
        );
        const rootOk = isCategoryCompatibleWithAmount(root.type, amount) && root.type !== 'transfert';
        if (!rootOk && !children.length) continue;
        if (rootOk) items.push({ title: root.name, value: root.publicId, indent: 0 });
        for (const child of children) items.push({ title: `↳ ${child.name}`, value: child.publicId, indent: 1 });
    }
    const selected = form.categoryPublicId;
    if (selected && !items.some((item) => item.value === selected)) {
        items.push({ title: categoriesStore.findByPublicId(selected)?.name ?? selected, value: selected });
    }
    return items;
});

const categoryChanged = computed(() => !!live.value && (form.categoryPublicId || null) !== (live.value.categoryPublicId ?? null));
const tierChanged = computed(() => !!live.value && (form.tierPublicId || null) !== (live.value.tierPublicId ?? null));
const canApplySameLabel = computed(() => (categoryChanged.value || tierChanged.value) && !!live.value?.label?.trim());

const duplicateLink = computed(() => {
    const item = live.value;
    if (!item?.duplicateOfTransactionPublicId || !item.operationDate) return null;
    const query: Record<string, string> = { from: item.operationDate, to: item.operationDate };
    if (props.accountPublicId) query.account = props.accountPublicId;
    return { path: '/app/finances/transactions', query };
});

const primaryAction = computed<'save' | 'validate'>(() => {
    const status = live.value?.status;
    return status === 'aValider' || status === 'ignoree' ? 'validate' : 'save';
});

const original = computed(() => (live.value?.isEdited ? live.value.original : null));

function resetForm() {
    const item = live.value;
    localError.value = null;
    applySameLabel.value = false;
    for (const key of Object.keys(fieldErrors) as (keyof ImportLineFormFields)[]) delete fieldErrors[key];
    if (!item) return;
    Object.assign(form, importLineToFormFields(item));
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        resetForm();
        void categoriesStore.loadList().catch(() => undefined);
    }
);

function onAmountInput(value: string) {
    form.amount = sanitizeSignedAmountInput(value);
}

function payloadErrorText(code: ImportLinePayloadErrorCode): string {
    return t(`importsPage.lines.edit.errors.${code}`);
}

function isFaulty(field: string) {
    return faulty.value.has(field);
}

async function applyToSameLabel(line: ImportLine) {
    const results: { updated: number; skipped: number }[] = [];
    if (categoryChanged.value) {
        results.push(
            await store.bulkUpdateLines({
                action: 'setCategory',
                sameLabelAs: line.publicId,
                categoryPublicId: form.categoryPublicId || null
            })
        );
    }
    if (tierChanged.value) {
        results.push(
            await store.bulkUpdateLines({ action: 'setTier', sameLabelAs: line.publicId, tierPublicId: form.tierPublicId || null })
        );
    }
    const updated = Math.max(0, ...results.map((result) => result.updated));
    const skipped = Math.max(0, ...results.map((result) => result.skipped));
    emit('notice', t('importsPage.lines.bulkResult', { updated, skipped }, updated));
}

async function patch(payload: UpdateImportLinePayload, after: AfterPatch) {
    const item = live.value;
    if (!item) return;
    localError.value = null;
    try {
        const sameLabel = applySameLabel.value && canApplySameLabel.value;
        if (sameLabel) {
            // Bulk d’abord : la ligne courante en fait partie, puis ses propres corrections.
            await applyToSameLabel(item);
            delete payload.categoryPublicId;
            delete payload.tierPublicId;
        }
        const updated = Object.keys(payload).length ? await store.updateLine(item.publicId, payload) : (live.value ?? item);
        // Toujours invalide (ou action « sur place ») : garder la modale avec l’état relu.
        if (after === 'stay' || (after === 'stayIfError' && updated.status === 'erreur')) {
            Object.assign(form, importLineToFormFields(updated));
            applySameLabel.value = false;
            return;
        }
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onSubmit() {
    const item = live.value;
    if (!item) return;
    for (const key of Object.keys(fieldErrors) as (keyof ImportLineFormFields)[]) delete fieldErrors[key];
    const built = buildImportLinePayload(item, form, {
        categoryType: (id) => categoriesStore.findByPublicId(id)?.type ?? null
    });
    let payload: UpdateImportLinePayload = {};
    if (built.ok) {
        payload = built.payload;
    } else if (built.code !== 'noChanges') {
        if (built.field) fieldErrors[built.field] = payloadErrorText(built.code);
        else localError.value = payloadErrorText(built.code);
        return;
    }
    if (primaryAction.value === 'validate') {
        payload.status = 'validee';
    } else if (!Object.keys(payload).length) {
        open.value = false;
        return;
    }
    void patch(payload, 'stayIfError');
}

function onIgnore() {
    void patch({ status: 'ignoree' }, 'close');
}

function onReset() {
    void patch({ reset: true }, 'stay');
}

/** `categoryPublicId: null` solde le doute « catégorie inconnue ». */
function onNoCategory() {
    form.categoryPublicId = '';
    void patch({ categoryPublicId: null }, 'stay');
}

function onCategoryCreated(category: Category) {
    form.categoryPublicId = category.publicId;
}

const categoryDefaultType = computed(() => ((formAmount.value ?? 0) >= 0 ? 'revenu' : 'depense'));
</script>

<template>
    <AppModalBase v-model="open" :title="title" :max-width="620" :height="760" mobile-layout="fullscreen">
        <template #header-extra>
            <div v-if="live" class="import-line-edit__status">
                <ImportStatusChip :status="live.status" kind="line" />
            </div>
        </template>

        <template v-if="live">
            <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">{{ localError }}</AppAlert>

            <AppAlert v-if="live.issues.length" :type="live.status === 'erreur' ? 'error' : 'info'" class="mb-4">
                <ul class="import-line-edit__issues">
                    <li v-for="issue in live.issues" :key="`${issue.code}-${issue.field ?? ''}`">{{ issue.message }}</li>
                </ul>
                <p v-if="uncorrectable" class="mt-2 mb-0">{{ t('importsPage.lines.edit.currencyHint') }}</p>
            </AppAlert>

            <AppAlert v-if="doubt === 'duplicate'" type="warning" class="mb-4">
                <p class="mb-1">{{ t('importsPage.lines.edit.duplicate') }}</p>
                <RouterLink v-if="duplicateLink" :to="duplicateLink" class="import-line-edit__link">
                    {{ t('importsPage.lines.edit.duplicateLink') }}
                </RouterLink>
            </AppAlert>
            <AppAlert v-else-if="doubt === 'duplicateInFile'" type="info" class="mb-4">
                {{ t('importsPage.lines.edit.duplicateInFile', { n: live.duplicateOfLineNumber }) }}
            </AppAlert>

            <AppAlert v-if="live.unmatchedCategoryName" type="warning" class="mb-4">
                <p class="mb-2">{{ t('importsPage.lines.edit.unknownCategory', { name: live.unmatchedCategoryName }) }}</p>
                <div class="import-line-edit__inline-actions">
                    <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="categoryCreateOpen = true">
                        {{ t('importsPage.lines.edit.createCategory', { name: live.unmatchedCategoryName }) }}
                    </button>
                    <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="onNoCategory">
                        {{ t('importsPage.lines.edit.noCategoryAction') }}
                    </button>
                </div>
            </AppAlert>

            <div class="import-line-edit">
                <div class="import-line-edit__row">
                    <AppDatePicker
                        :model-value="form.operationDate || null"
                        :label="`${t('importsPage.fields.operationDate')} *`"
                        :placeholder="t('importsPage.fields.operationDate')"
                        :max="maxDate"
                        :clearable="false"
                        :class="{ 'is-faulty': isFaulty('operationDate') }"
                        @update:model-value="form.operationDate = $event ?? ''"
                    />
                    <AppDatePicker
                        v-model="form.valueDate"
                        :label="t('importsPage.fields.valueDate')"
                        :placeholder="t('importsPage.fields.valueDate')"
                        :min="form.operationDate || undefined"
                        :class="{ 'is-faulty': isFaulty('valueDate') }"
                    />
                </div>
                <p v-if="fieldErrors.operationDate || fieldErrors.valueDate" class="text-caption text-error mt-n2">
                    {{ fieldErrors.operationDate || fieldErrors.valueDate }}
                </p>

                <v-text-field
                    v-model="form.label"
                    :label="`${t('importsPage.fields.label')} *`"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :maxlength="IMPORT_LINE_LABEL_MAX"
                    :error="!!fieldErrors.label || isFaulty('label')"
                    :error-messages="fieldErrors.label || undefined"
                />

                <v-text-field
                    :model-value="form.amount"
                    :label="`${t('importsPage.fields.amount')} *`"
                    :hint="t('importsPage.lines.edit.amountHint', { currency: live.currency || currency || '' })"
                    persistent-hint
                    color="primary"
                    variant="outlined"
                    inputmode="decimal"
                    autocomplete="off"
                    hide-details="auto"
                    :error="!!fieldErrors.amount || isFaulty('amount')"
                    :error-messages="fieldErrors.amount || undefined"
                    @update:model-value="onAmountInput"
                />

                <AppSelect
                    v-model="form.categoryPublicId"
                    :items="categoryItems"
                    :label="t('importsPage.fields.category')"
                    float-label
                    hide-details="auto"
                    :error="!!fieldErrors.categoryPublicId || isFaulty('category')"
                    :error-messages="fieldErrors.categoryPublicId || undefined"
                    :hint="
                        live.categorySuggested && live.categoryPublicId === form.categoryPublicId
                            ? t('importsPage.lines.edit.suggestedHint')
                            : undefined
                    "
                    :persistent-hint="live.categorySuggested && live.categoryPublicId === form.categoryPublicId"
                    searchable
                    :search-placeholder="t('importsPage.lines.edit.categorySearch')"
                    :create-label="t('importsPage.lines.edit.createCategoryNew')"
                    :create-named-label="t('importsPage.lines.edit.createCategory', { name: '{name}' })"
                    @create="categoryCreateOpen = true"
                />

                <TierPicker
                    v-model="form.tierPublicId"
                    :label="t('importsPage.fields.tier')"
                    hide-details="auto"
                    :hint="
                        live.unmatchedTierName && !form.tierPublicId
                            ? t('importsPage.lines.edit.unknownTier', { name: live.unmatchedTierName })
                            : undefined
                    "
                    :persistent-hint="!!live.unmatchedTierName && !form.tierPublicId"
                />

                <AppCheckbox
                    v-if="canApplySameLabel"
                    v-model="applySameLabel"
                    :label="t('importsPage.lines.edit.applySameLabel', { label: live.label })"
                />

                <div v-if="original" class="import-line-edit__original">
                    <p class="import-line-edit__original-title">{{ t('importsPage.lines.edit.original') }}</p>
                    <dl>
                        <dt>{{ t('importsPage.fields.operationDate') }}</dt>
                        <dd>{{ original.operationDate ? formatOperationDate(original.operationDate, locale) : '—' }}</dd>
                        <dt>{{ t('importsPage.fields.label') }}</dt>
                        <dd>{{ original.label || '—' }}</dd>
                        <dt>{{ t('importsPage.fields.amount') }}</dt>
                        <dd>{{ formatImportAmount(original.amount, original.currency || currency, locale) }}</dd>
                        <template v-if="original.categoryName">
                            <dt>{{ t('importsPage.fields.category') }}</dt>
                            <dd>{{ original.categoryName }}</dd>
                        </template>
                        <template v-if="original.tierName">
                            <dt>{{ t('importsPage.fields.tier') }}</dt>
                            <dd>{{ original.tierName }}</dd>
                        </template>
                    </dl>
                </div>
            </div>
        </template>

        <template #footer="{ close }">
            <div class="import-line-edit__footer">
                <div class="import-line-edit__secondary">
                    <button v-if="live?.isEdited" type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="onReset">
                        {{ t('importsPage.lines.actions.reset') }}
                    </button>
                    <button
                        v-if="live && live.status !== 'ignoree'"
                        type="button"
                        class="su-btn su-btn--ghost"
                        :disabled="store.acting"
                        @click="onIgnore"
                    >
                        {{ t('importsPage.lines.actions.ignore') }}
                    </button>
                </div>
                <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">{{ t('common.cancel') }}</button>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting || uncorrectable || (primaryAction === 'save' && !dirty)"
                    @click="onSubmit"
                >
                    {{
                        primaryAction === 'validate'
                            ? live?.status === 'ignoree'
                                ? t('importsPage.lines.actions.restore')
                                : t('importsPage.lines.actions.validateAnyway')
                            : t('common.save')
                    }}
                </button>
            </div>
        </template>
    </AppModalBase>

    <CategoryFormModal
        v-model="categoryCreateOpen"
        :default-type="categoryDefaultType"
        :default-name="live?.unmatchedCategoryName ?? ''"
        @saved="onCategoryCreated"
    />
</template>

<style scoped>
.import-line-edit {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.import-line-edit__status {
    margin-top: 8px;
}

.import-line-edit__issues {
    margin: 0;
    padding-left: 18px;
}

.import-line-edit__link {
    color: inherit;
    font-weight: 600;
}

.import-line-edit__inline-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.import-line-edit__row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.import-line-edit__row :deep(.is-faulty .v-field__outline) {
    color: rgb(var(--v-theme-error));
}

.import-line-edit__original {
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--hair, rgba(16, 16, 20, 0.04));
    font-size: 0.82rem;
}

.import-line-edit__original-title {
    margin: 0 0 6px;
    font-weight: 620;
}

.import-line-edit__original dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 12px;
    margin: 0;
}

.import-line-edit__original dt {
    color: var(--ink-muted);
}

.import-line-edit__original dd {
    margin: 0;
    overflow-wrap: anywhere;
}

.import-line-edit__footer {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.import-line-edit__secondary {
    display: flex;
    gap: 4px;
    margin-right: auto;
}

@media (max-width: 599.98px) {
    .import-line-edit__row {
        grid-template-columns: 1fr;
    }
}
</style>
