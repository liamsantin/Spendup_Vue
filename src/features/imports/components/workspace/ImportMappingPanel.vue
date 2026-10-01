<script setup lang="ts">
/**
 * Écran « Associe tes colonnes » : statut `erreur` (colonnes obligatoires non reconnues)
 * ou remapping depuis la revue. Pré-rempli avec `analysis.columns` / `sample` / `mapping`.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { WandIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { reparseLosesReviewWork } from '@/features/imports/format';
import {
    IMPORT_MAPPING_OPTIONAL,
    buildImportMapping,
    columnKey,
    fieldForColumn,
    isMappingLayoutChanged,
    mappingFormFromAnalysis,
    selectableTemplates,
    type ImportAmountMode,
    type ImportMappingErrorCode,
    type ImportMappingForm
} from '@/features/imports/mapping';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import {
    IMPORT_DATE_FORMATS,
    IMPORT_DECIMAL_SEPARATORS,
    IMPORT_ENCODINGS,
    IMPORT_SEPARATORS,
    type Import,
    type ImportMappingField,
    type ReparseImportPayload
} from '@/features/imports/types';

const props = defineProps<{
    item: Import;
    /** Ouvert depuis la revue : bouton « Retour à la revue ». */
    cancellable?: boolean;
}>();

const emit = defineEmits<{
    close: [];
    done: [];
}>();

const SEPARATOR_KEYS: Record<(typeof IMPORT_SEPARATORS)[number], string> = { ';': 'semicolon', ',': 'comma', '|': 'pipe', tab: 'tab' };

const { t } = useI18n();
const store = useImportsStore();
const paymentMethodsStore = usePaymentMethodsStore();

const form = reactive<ImportMappingForm>(mappingFormFromAnalysis(props.item.analysis));
const fieldError = ref<{ field: string; message: string } | null>(null);
const localError = ref<string | null>(null);
const templateToApply = ref('');
const pendingReparse = ref<ReparseImportPayload | null>(null);
const paymentMethodPublicId = ref(props.item.defaultPaymentMethodPublicId ?? '');

const confirmOpen = computed({
    get: () => !!pendingReparse.value,
    set: (value: boolean) => {
        if (!value) pendingReparse.value = null;
    }
});

const analysis = computed(() => props.item.analysis);
const isCsv = computed(() => props.item.sourceType === 'csv');
const hasColumns = computed(() => analysis.value.columns.length > 0);
/** Réglages de lecture modifiés, ou aucune colonne connue (en-tête introuvable) : relire le fichier. */
const layoutChanged = computed(() => !hasColumns.value || isMappingLayoutChanged(form, analysis.value));
const primarySuggestion = computed(() => analysis.value.suggestedTemplates[0] ?? null);
const otherSuggestions = computed(() => analysis.value.suggestedTemplates.slice(1));
const tooManyLines = computed(() => analysis.value.errors.some((issue) => issue.code === 'TOO_MANY_LINES'));

watch(
    () => props.item.analysis,
    (next) => {
        Object.assign(form, mappingFormFromAnalysis(next));
        fieldError.value = null;
    }
);

watch(
    () => props.item.defaultPaymentMethodPublicId,
    (next) => {
        paymentMethodPublicId.value = next ?? '';
    }
);

/** Moyens actifs du compte de l’import ; le moyen actuel reste affiché même s’il a été désactivé. */
const paymentMethodItems = computed(() => {
    const items = [
        { title: t('importsPage.upload.noPaymentMethod'), value: '' },
        ...paymentMethodsStore.items
            .filter((item) => item.accountPublicId === props.item.accountPublicId && item.isActive)
            .map((item) => ({ title: item.label, value: item.publicId }))
    ];
    const selected = paymentMethodPublicId.value;
    if (selected && !items.some((item) => item.value === selected)) {
        const known = paymentMethodsStore.allKnownItems().find((item) => item.publicId === selected);
        items.push({ title: known?.label ?? selected, value: selected });
    }
    return items;
});

/** Clé absente = moyen par défaut conservé : on ne l’envoie que s’il a changé. */
function withPaymentMethod(body: ReparseImportPayload): ReparseImportPayload {
    const next = paymentMethodPublicId.value || null;
    return next === (props.item.defaultPaymentMethodPublicId ?? null) ? body : { ...body, paymentMethodPublicId: next };
}

const columnItems = computed(() => [
    { title: t('importsPage.mapping.noColumn'), value: '' },
    ...analysis.value.columns.map((column) => ({
        title: column.header?.trim()
            ? t('importsPage.mapping.columnNamed', { n: column.index + 1, name: column.header.trim() })
            : t('importsPage.mapping.columnIndex', { n: column.index + 1 }),
        value: columnKey(column.index)
    }))
]);

const encodingItems = computed(() => [
    { title: t('importsPage.mapping.auto'), value: '' },
    ...IMPORT_ENCODINGS.map((value) => ({ title: value, value }))
]);

const separatorItems = computed(() => [
    { title: t('importsPage.mapping.auto'), value: '' },
    ...IMPORT_SEPARATORS.map((value) => ({ title: t(`importsPage.mapping.separators.${SEPARATOR_KEYS[value]}`), value }))
]);

const sheetItems = computed(() => analysis.value.sheetNames.map((value) => ({ title: value, value })));

const dateFormatItems = computed(() => {
    const items = [{ title: t('importsPage.mapping.auto'), value: '' }, ...IMPORT_DATE_FORMATS.map((value) => ({ title: value, value }))];
    if (form.dateFormat && !items.some((item) => item.value === form.dateFormat))
        items.push({ title: form.dateFormat, value: form.dateFormat });
    return items;
});

const decimalItems = computed(() => [
    { title: t('importsPage.mapping.auto'), value: '' },
    ...IMPORT_DECIMAL_SEPARATORS.map((value) => ({ title: t(`importsPage.mapping.decimals.${value === '.' ? 'dot' : 'comma'}`), value }))
]);

const templateItems = computed(() =>
    selectableTemplates(store.templates, props.item.sourceType).map((item) => ({
        title: item.isSystem ? `${item.name} · ${t('importsPage.templates.system')}` : item.name,
        value: item.publicId
    }))
);

const amountModes: ImportAmountMode[] = ['signed', 'debitCredit'];

/** Obligatoires : date, libellé, puis montant signé ou débit / crédit (au moins un des deux). */
const primaryFields = computed<ImportMappingField[]>(() =>
    form.amountMode === 'signed' ? ['operationDate', 'label', 'amount'] : ['operationDate', 'label', 'debit', 'credit']
);

const sampleWidth = computed(() => Math.max(analysis.value.columns.length, ...analysis.value.sample.map((row) => row.length), 0));

const sampleHeaders = computed(() =>
    Array.from({ length: sampleWidth.value }, (_, index) => {
        const column = analysis.value.columns.find((item) => item.index === index);
        const field = fieldForColumn(form, index);
        return {
            index,
            header: column?.header?.trim() || t('importsPage.mapping.columnIndex', { n: index + 1 }),
            field: field ? t(`importsPage.fields.${field}`) : null
        };
    })
);

function fieldLabel(field: ImportMappingField, required: boolean) {
    const label = t(`importsPage.fields.${field}`);
    return required ? `${label} *` : label;
}

function errorFor(field: string): string | undefined {
    return fieldError.value?.field === field ? fieldError.value.message : undefined;
}

function mappingErrorText(code: ImportMappingErrorCode): string {
    return t(`importsPage.mapping.errors.${code}`);
}

async function runReparse(body: ReparseImportPayload) {
    localError.value = null;
    try {
        await store.reparseImport(props.item.publicId, body);
        emit('done');
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function requestReparse(input: ReparseImportPayload) {
    const body = withPaymentMethod(input);
    if (reparseLosesReviewWork(props.item)) {
        pendingReparse.value = body;
        return;
    }
    void runReparse(body);
}

function confirmReparse() {
    const body = pendingReparse.value;
    pendingReparse.value = null;
    if (body) void runReparse(body);
}

function onApply() {
    fieldError.value = null;
    const built = buildImportMapping(form, {
        columns: analysis.value.columns,
        sourceType: props.item.sourceType,
        layoutChanged: layoutChanged.value
    });
    if (!built.ok) {
        fieldError.value = { field: built.field ?? '', message: mappingErrorText(built.code) };
        return;
    }
    requestReparse({ mapping: built.mapping });
}

function onUseTemplate(publicId: string) {
    templateToApply.value = '';
    if (!publicId) return;
    requestReparse({ importTemplatePublicId: publicId });
}

function onAutoDetect() {
    requestReparse({});
}

void store.loadTemplates().catch(() => undefined);
</script>

<template>
    <section class="import-mapping">
        <AppAlert v-if="localError" type="error" class="mb-3" closable @dismiss="localError = null">{{ localError }}</AppAlert>

        <AppAlert v-if="item.status === 'erreur' && analysis.errors.length" type="warning" class="mb-3">
            <p class="import-mapping__lead">{{ t('importsPage.mapping.errorLead') }}</p>
            <ul class="import-mapping__issues">
                <li v-for="issue in analysis.errors" :key="`${issue.code}-${issue.field ?? ''}`">{{ issue.message }}</li>
            </ul>
            <p v-if="tooManyLines" class="import-mapping__lead mt-2">{{ t('importsPage.mapping.tooManyLines') }}</p>
        </AppAlert>

        <!-- Le premier modèle suggéré (banque du compte en tête) est proposé par défaut ; les autres en alternative. -->
        <AppAlert v-if="primarySuggestion" type="info" class="mb-3">
            <div class="import-mapping__suggestion">
                <span>{{ t('importsPage.mapping.suggestion', { name: primarySuggestion.name }) }}</span>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting"
                    @click="onUseTemplate(primarySuggestion.publicId)"
                >
                    {{ t('importsPage.mapping.useTemplate') }}
                </button>
            </div>
            <div v-if="otherSuggestions.length" class="import-mapping__suggestion-others">
                <span>{{ t('importsPage.mapping.otherSuggestions') }}</span>
                <button
                    v-for="suggestion in otherSuggestions"
                    :key="suggestion.publicId"
                    type="button"
                    class="su-btn su-btn--ghost"
                    :disabled="store.acting"
                    @click="onUseTemplate(suggestion.publicId)"
                >
                    {{ suggestion.name }}
                </button>
            </div>
        </AppAlert>

        <div class="import-mapping__grid">
            <div class="import-mapping__card">
                <h3 class="import-mapping__title">{{ t('importsPage.mapping.readTitle') }}</h3>
                <div class="import-mapping__fields">
                    <AppSelect
                        v-if="!isCsv && sheetItems.length"
                        v-model="form.sheetName"
                        :items="sheetItems"
                        :label="t('importsPage.mapping.sheet')"
                        float-label
                        hide-details
                    />
                    <AppSelect
                        v-if="isCsv"
                        v-model="form.encoding"
                        :items="encodingItems"
                        :label="t('importsPage.mapping.encoding')"
                        float-label
                        hide-details
                    />
                    <AppSelect
                        v-if="isCsv"
                        v-model="form.separator"
                        :items="separatorItems"
                        :label="t('importsPage.mapping.separator')"
                        float-label
                        hide-details
                    />
                    <v-text-field
                        v-model="form.headerRow"
                        :label="t('importsPage.mapping.headerRow')"
                        :hint="t('importsPage.mapping.headerRowHint')"
                        persistent-hint
                        inputmode="numeric"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        :error-messages="errorFor('headerRow')"
                        :placeholder="t('importsPage.mapping.auto')"
                    />
                </div>
                <AppAlert v-if="layoutChanged && hasColumns" type="info" class="mt-3">{{
                    t('importsPage.mapping.layoutChanged')
                }}</AppAlert>
            </div>

            <div class="import-mapping__card">
                <h3 class="import-mapping__title">{{ t('importsPage.mapping.formatTitle') }}</h3>
                <div class="import-mapping__fields">
                    <AppSelect
                        v-model="form.dateFormat"
                        :items="dateFormatItems"
                        :label="t('importsPage.mapping.dateFormat')"
                        :hint="t('importsPage.mapping.dateFormatHint')"
                        persistent-hint
                        float-label
                    />
                    <AppSelect
                        v-model="form.decimalSeparator"
                        :items="decimalItems"
                        :label="t('importsPage.mapping.decimalSeparator')"
                        float-label
                        hide-details
                    />
                    <AppSwitch v-model="form.invertSign" :label="t('importsPage.mapping.invertSign')" />
                    <p class="import-mapping__hint">{{ t('importsPage.mapping.invertSignHint') }}</p>
                    <AppSelect
                        v-model="paymentMethodPublicId"
                        :items="paymentMethodItems"
                        :label="t('importsPage.upload.paymentMethod')"
                        :hint="t('importsPage.upload.paymentMethodHint')"
                        persistent-hint
                        float-label
                        searchable
                        :search-placeholder="t('importsPage.lines.edit.paymentMethodSearch')"
                    />
                </div>
            </div>
        </div>

        <div v-if="hasColumns && !layoutChanged" class="import-mapping__card">
            <h3 class="import-mapping__title">{{ t('importsPage.mapping.columnsTitle') }}</h3>
            <div class="import-mapping__modes" role="radiogroup" :aria-label="t('importsPage.mapping.amountMode')">
                <button
                    v-for="mode in amountModes"
                    :key="mode"
                    type="button"
                    role="radio"
                    class="import-mapping__mode"
                    :class="{ 'is-selected': form.amountMode === mode }"
                    :aria-checked="form.amountMode === mode"
                    @click="form.amountMode = mode"
                >
                    <span class="import-mapping__mode-title">{{ t(`importsPage.mapping.amountModes.${mode}`) }}</span>
                    <span class="import-mapping__mode-hint">{{ t(`importsPage.mapping.amountModeHints.${mode}`) }}</span>
                </button>
            </div>
            <div class="import-mapping__columns">
                <AppSelect
                    v-for="field in primaryFields"
                    :key="field"
                    v-model="form.columns[field]"
                    :items="columnItems"
                    :label="fieldLabel(field, field !== 'debit' && field !== 'credit')"
                    float-label
                    hide-details="auto"
                    :error="!!errorFor(field)"
                    :error-messages="errorFor(field)"
                />
                <AppSelect
                    v-for="field in IMPORT_MAPPING_OPTIONAL"
                    :key="field"
                    v-model="form.columns[field]"
                    :items="columnItems"
                    :label="fieldLabel(field, false)"
                    float-label
                    hide-details
                />
            </div>
            <p v-if="form.amountMode === 'debitCredit'" class="import-mapping__hint mt-2">{{ t('importsPage.mapping.debitCreditHint') }}</p>
        </div>

        <div v-if="analysis.sample.length" class="import-mapping__card">
            <h3 class="import-mapping__title">{{ t('importsPage.mapping.sampleTitle') }}</h3>
            <div class="import-mapping__sample">
                <table>
                    <thead>
                        <tr>
                            <th v-for="head in sampleHeaders" :key="head.index">
                                <span class="import-mapping__sample-head">{{ head.header }}</span>
                                <span v-if="head.field && !layoutChanged" class="import-mapping__sample-field">{{ head.field }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, rowIndex) in analysis.sample" :key="rowIndex">
                            <td v-for="head in sampleHeaders" :key="head.index">{{ row[head.index] ?? '' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <p v-else class="import-mapping__hint">{{ t('importsPage.mapping.sampleEmpty') }}</p>

        <div class="import-mapping__footer">
            <div class="import-mapping__templates">
                <AppSelect
                    v-if="templateItems.length"
                    :model-value="templateToApply"
                    :items="templateItems"
                    :label="t('importsPage.mapping.applyTemplate')"
                    float-label
                    hide-details
                    searchable
                    :search-placeholder="t('importsPage.upload.templateSearch')"
                    @update:model-value="onUseTemplate"
                />
                <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="onAutoDetect">
                    <WandIcon :size="16" stroke-width="1.6" />
                    {{ t('importsPage.mapping.autoDetect') }}
                </button>
            </div>
            <div class="import-mapping__submit">
                <button v-if="cancellable" type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="emit('close')">
                    {{ t('importsPage.mapping.backToReview') }}
                </button>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onApply">
                    <span v-if="store.acting" class="su-spin" />
                    {{ layoutChanged ? t('importsPage.mapping.reread') : t('importsPage.mapping.apply') }}
                </button>
            </div>
        </div>

        <AppConfirmationModal
            v-model="confirmOpen"
            :title="t('importsPage.mapping.confirm.title')"
            :message="t('importsPage.mapping.confirm.body')"
            :confirm-label="t('importsPage.mapping.confirm.action')"
            confirm-color="warning"
            :loading="store.acting"
            @confirm="confirmReparse"
        />
    </section>
</template>

<style scoped>
.import-mapping {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 16px 16px;
}

.import-mapping__lead {
    margin: 0;
    font-weight: 560;
}

.import-mapping__issues {
    margin: 6px 0 0;
    padding-left: 18px;
}

.import-mapping__suggestion {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.import-mapping__suggestion-others {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 0.8rem;
}

.import-mapping__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.import-mapping__card {
    padding: 16px;
    border: 1px solid var(--stroke, rgba(16, 16, 20, 0.08));
    border-radius: 18px;
    background: var(--surface-raised, transparent);
}

.import-mapping__title {
    margin: 0 0 12px;
    font-size: 0.9rem;
    font-weight: 650;
    letter-spacing: -0.01em;
}

.import-mapping__fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.import-mapping__hint {
    margin: -6px 0 0;
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.import-mapping__modes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
}

.import-mapping__mode {
    appearance: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: 1px solid var(--stroke, rgba(16, 16, 20, 0.1));
    border-radius: 14px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
        border-color 0.2s var(--ease, ease),
        background 0.2s var(--ease, ease);
}

.import-mapping__mode.is-selected {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.06);
}

.import-mapping__mode-title {
    font-size: 0.86rem;
    font-weight: 620;
}

.import-mapping__mode-hint {
    font-size: 0.75rem;
    color: var(--ink-muted);
}

.import-mapping__columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
}

.import-mapping__sample {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.import-mapping__sample table {
    min-width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}

.import-mapping__sample th,
.import-mapping__sample td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--hair, rgba(16, 16, 20, 0.06));
    text-align: left;
    white-space: nowrap;
}

.import-mapping__sample th {
    vertical-align: bottom;
    font-weight: 600;
}

.import-mapping__sample-head {
    display: block;
}

.import-mapping__sample-field {
    display: inline-block;
    margin-top: 4px;
    padding: 1px 8px;
    border-radius: 999px;
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
    font-size: 0.7rem;
    font-weight: 620;
}

.import-mapping__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.import-mapping__templates {
    display: flex;
    flex: 1 1 320px;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.import-mapping__templates > :first-child {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 320px;
}

.import-mapping__submit {
    display: flex;
    gap: 8px;
    margin-left: auto;
}

@media (max-width: 959.98px) {
    .import-mapping__columns {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .import-mapping {
        padding: 0 4px 8px;
    }

    .import-mapping__grid,
    .import-mapping__columns,
    .import-mapping__modes {
        grid-template-columns: 1fr;
    }

    .import-mapping__templates {
        flex-wrap: wrap;
    }

    .import-mapping__templates > :first-child {
        max-width: none;
    }
}
</style>
