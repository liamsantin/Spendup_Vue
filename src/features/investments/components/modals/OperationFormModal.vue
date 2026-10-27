<script setup lang="ts">
/**
 * Création / modification d'une opération de placement (propriétaire du compte seulement).
 * Achat / vente / dépôt / retrait : quantité + prix (total auto = q × p, modifiable) ; dividende / frais : total seul.
 * `transactionPublicId` (jambe cash) n'a pas encore de sélecteur : `null` à la création, conservé tel quel en modification.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { instrumentLabel, isOperationType, operationNeedsQuantity } from '@/features/investments/format';
import {
    buildSaveOperationPayload,
    emptyOperationFormFields,
    isOperationFormDirty,
    operationToFormFields,
    suggestedOperationTotal,
    type InvestmentPayloadErrorCode,
    type OperationFormFields
} from '@/features/investments/payload';
import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';
import { useInvestmentsStore } from '@/features/investments/stores/investments-store';
import { OPERATION_NOTES_MAX, OPERATION_TYPES, type InstrumentCurrency, type InvestmentOperation } from '@/features/investments/types';
import InstrumentPicker from '@/features/investments/components/forms/InstrumentPicker.vue';

type FieldErrors = Partial<Record<keyof OperationFormFields, string | null>>;

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        accountPublicId: string;
        operation?: InvestmentOperation | null;
        /** Instrument présélectionné à la création. */
        defaultInstrumentPublicId?: string | null;
        /** Devise proposée pour un instrument créé à la volée. */
        defaultCurrency?: InstrumentCurrency | null;
    }>(),
    {
        operation: null,
        defaultInstrumentPublicId: null,
        defaultCurrency: null
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [operation: InvestmentOperation];
}>();

const { t } = useI18n();
const store = useInvestmentsStore();
const instruments = useInstrumentsStore();
const settings = useUserSettingsStore();

const form = reactive<OperationFormFields>(emptyOperationFormFields());
const fieldErrors = reactive<FieldErrors>({});
const localError = reactive({ message: null as string | null });
/** `true` dès que l'utilisateur saisit lui-même le total : on cesse alors de le recalculer. */
const totalTouched = ref(false);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.operation);
const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const canSave = computed(() => !props.operation || isOperationFormDirty(props.operation, form));
const needsQuantity = computed(() => isOperationType(form.type) && operationNeedsQuantity(form.type));

const typeItems = computed(() => OPERATION_TYPES.map((value) => ({ title: t(`investmentsPage.operationTypes.${value}`), value })));

const instrumentCurrency = computed(() => {
    const id = form.instrumentPublicId;
    if (!id) return null;
    if (props.operation?.instrument.publicId === id) return props.operation.currency;
    return instruments.findByPublicId(id)?.currency ?? null;
});

const fallbackInstrumentLabel = computed(() => {
    const op = props.operation;
    return op && op.instrument.publicId === form.instrumentPublicId ? instrumentLabel(op.instrument) : undefined;
});

const dateModel = computed({
    get: () => form.operationDate,
    set: (value: string | null) => {
        form.operationDate = value;
    }
});

function clearErrors() {
    localError.message = null;
    for (const key of Object.keys(fieldErrors) as (keyof OperationFormFields)[]) fieldErrors[key] = null;
}

function applyError(code: InvestmentPayloadErrorCode, field?: string) {
    const message = t(`investmentsPage.errors.${code}`);
    if (field && field in form && field !== 'transactionPublicId') {
        fieldErrors[field as keyof OperationFormFields] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    clearErrors();
    if (props.operation) {
        Object.assign(form, operationToFormFields(props.operation));
        const suggested = suggestedOperationTotal(form);
        totalTouched.value = !!form.totalAmount.trim() && Number(form.totalAmount) !== Number(suggested);
        return;
    }
    Object.assign(
        form,
        emptyOperationFormFields({
            instrumentPublicId: props.defaultInstrumentPublicId ?? '',
            type: 'achat',
            operationDate: today.value
        })
    );
    totalTouched.value = false;
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) resetForm();
    },
    { immediate: true }
);

// Total auto = quantité × prix tant que l'utilisateur ne l'a pas saisi lui-même.
watch(
    () => [form.quantity, form.unitPrice, form.type] as const,
    () => {
        if (!needsQuantity.value || totalTouched.value) return;
        form.totalAmount = suggestedOperationTotal(form);
    }
);

function onTotalInput(value: string) {
    form.totalAmount = value;
    totalTouched.value = !!value.trim();
    if (!totalTouched.value && needsQuantity.value) form.totalAmount = suggestedOperationTotal(form);
}

function onTypeChange(value: string) {
    if (!isOperationType(value)) return;
    const wasQuantity = needsQuantity.value;
    form.type = value;
    if (wasQuantity && !operationNeedsQuantity(value)) {
        // Dividende / frais : ni quantité ni prix, le total est saisi.
        form.quantity = '';
        form.unitPrice = '';
        form.totalAmount = '';
        totalTouched.value = false;
    } else if (!wasQuantity && operationNeedsQuantity(value)) {
        form.totalAmount = suggestedOperationTotal(form);
        totalTouched.value = false;
    }
}

async function onSave() {
    if (!canSave.value || store.acting) return;
    clearErrors();
    const context = { today: today.value };
    const built = buildSaveOperationPayload(form, context);
    if (!built.ok) {
        applyError(built.code, built.field);
        return;
    }
    try {
        const saved = props.operation
            ? await store.updateOperation(props.accountPublicId, props.operation.publicId, form, context)
            : await store.createOperation(props.accountPublicId, form, context);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = props.operation
                ? t('investmentsPage.errors.operationNotFound')
                : t('investmentsPage.errors.accountNotFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('investmentsPage.operationForm.editTitle') : t('investmentsPage.operationForm.createTitle')"
        :subtitle="t('investmentsPage.operationForm.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <div class="inv-form">
            <div class="inv-form__row">
                <label class="inv-form__label">{{ t('investmentsPage.operationForm.fields.instrument') }} *</label>
                <div class="inv-form__field">
                    <InstrumentPicker
                        v-model="form.instrumentPublicId"
                        :label="t('investmentsPage.operationForm.fields.instrument')"
                        :fallback-label="fallbackInstrumentLabel"
                        :default-currency="defaultCurrency"
                        :error-messages="fieldErrors.instrumentPublicId || undefined"
                    />
                </div>
            </div>

            <div class="inv-form__row">
                <label class="inv-form__label">{{ t('investmentsPage.operationForm.fields.type') }} *</label>
                <div class="inv-form__field">
                    <AppSelect
                        :model-value="form.type"
                        :items="typeItems"
                        :label="t('investmentsPage.operationForm.fields.type')"
                        hide-details="auto"
                        :error-messages="fieldErrors.type || undefined"
                        @update:model-value="onTypeChange"
                    />
                    <p class="inv-form__caption">{{ t(`investmentsPage.operationForm.typeHints.${form.type || 'achat'}`) }}</p>
                </div>
            </div>

            <div class="inv-form__row">
                <label class="inv-form__label">{{ t('investmentsPage.operationForm.fields.date') }} *</label>
                <div class="inv-form__field">
                    <AppDatePicker
                        v-model="dateModel"
                        :label="t('investmentsPage.operationForm.fields.date')"
                        :max="today"
                        :clearable="false"
                    />
                    <p v-if="fieldErrors.operationDate" class="inv-form__caption inv-form__caption--error">
                        {{ fieldErrors.operationDate }}
                    </p>
                </div>
            </div>

            <template v-if="needsQuantity">
                <div class="inv-form__row">
                    <label class="inv-form__label" for="operation-form-quantity"
                        >{{ t('investmentsPage.operationForm.fields.quantity') }} *</label
                    >
                    <div class="inv-form__field">
                        <v-text-field
                            id="operation-form-quantity"
                            v-model="form.quantity"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :error-messages="fieldErrors.quantity || undefined"
                        />
                    </div>
                </div>

                <div class="inv-form__row">
                    <label class="inv-form__label" for="operation-form-price">
                        {{ t('investmentsPage.operationForm.fields.unitPrice') }} *
                        <span v-if="instrumentCurrency" class="inv-form__unit">{{ instrumentCurrency }}</span>
                    </label>
                    <div class="inv-form__field">
                        <v-text-field
                            id="operation-form-price"
                            v-model="form.unitPrice"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :error-messages="fieldErrors.unitPrice || undefined"
                        />
                    </div>
                </div>
            </template>

            <div class="inv-form__row">
                <label class="inv-form__label" for="operation-form-total">
                    {{ t('investmentsPage.operationForm.fields.totalAmount') }}{{ needsQuantity ? '' : ' *' }}
                    <span v-if="instrumentCurrency" class="inv-form__unit">{{ instrumentCurrency }}</span>
                </label>
                <div class="inv-form__field">
                    <v-text-field
                        id="operation-form-total"
                        :model-value="form.totalAmount"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        autocomplete="off"
                        :error-messages="fieldErrors.totalAmount || undefined"
                        @update:model-value="onTotalInput"
                    />
                    <p v-if="needsQuantity" class="inv-form__caption">{{ t('investmentsPage.operationForm.totalHint') }}</p>
                </div>
            </div>

            <div class="inv-form__row inv-form__row--top">
                <label class="inv-form__label" for="operation-form-notes">{{ t('investmentsPage.operationForm.fields.notes') }}</label>
                <div class="inv-form__field">
                    <v-textarea
                        id="operation-form-notes"
                        v-model="form.notes"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        rows="2"
                        auto-grow
                        :maxlength="OPERATION_NOTES_MAX"
                        :error-messages="fieldErrors.notes || undefined"
                    />
                </div>
            </div>

            <p class="inv-form__hint">
                {{
                    form.transactionPublicId
                        ? t('investmentsPage.operationForm.transactionLinked')
                        : t('investmentsPage.operationForm.transactionHint')
                }}
            </p>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
/* grille libellé 170 px | champ (cf. formulaire objectif d'épargne) */
.inv-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.inv-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.inv-form__row--top {
    align-items: start;
}

.inv-form__row--top .inv-form__label {
    padding-top: 11px;
}

.inv-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
}

.inv-form__unit {
    color: var(--gray);
    font-size: 13px;
}

.inv-form__field {
    min-width: 0;
}

.inv-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.inv-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
    font-variant-numeric: tabular-nums;
}

.inv-form__hint {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.inv-form__caption {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.inv-form__caption--error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .inv-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .inv-form__row--top .inv-form__label {
        padding-top: 0;
    }
}
</style>
