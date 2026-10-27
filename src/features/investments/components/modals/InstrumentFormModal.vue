<script setup lang="ts">
/**
 * Création / modification d'un instrument du catalogue personnel.
 * `symbol`, `type`, `currency` sont figés par l'API dès qu'une opération existe (400 affiché tel quel).
 */
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { isInstrumentCurrency } from '@/features/investments/format';
import {
    buildCreateInstrumentPayload,
    buildUpdateInstrumentPayload,
    emptyInstrumentFormFields,
    instrumentToFormFields,
    isInstrumentFormDirty,
    type InstrumentFormFields,
    type InvestmentPayloadErrorCode
} from '@/features/investments/payload';
import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';
import {
    INSTRUMENT_CURRENCIES,
    INSTRUMENT_ISIN_LENGTH,
    INSTRUMENT_NAME_MAX,
    INSTRUMENT_SYMBOL_MAX,
    INSTRUMENT_TYPES,
    type Instrument,
    type InstrumentCurrency
} from '@/features/investments/types';

type FieldErrors = Partial<Record<keyof InstrumentFormFields, string | null>>;

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        instrument?: Instrument | null;
        /** Symbole prérempli (création depuis le sélecteur : « Créer “X” »). */
        defaultSymbol?: string | null;
        /** Devise proposée à la création (devise du compte, sinon celle des settings). */
        defaultCurrency?: InstrumentCurrency | null;
    }>(),
    {
        instrument: null,
        defaultSymbol: null,
        defaultCurrency: null
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [instrument: Instrument];
}>();

const { t } = useI18n();
const store = useInstrumentsStore();
const settings = useUserSettingsStore();

const form = reactive<InstrumentFormFields>(emptyInstrumentFormFields());
const fieldErrors = reactive<FieldErrors>({});
const localError = reactive({ message: null as string | null });

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.instrument);
const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const canSave = computed(() => !props.instrument || isInstrumentFormDirty(props.instrument, form));

const typeItems = computed(() => INSTRUMENT_TYPES.map((value) => ({ title: t(`investmentsPage.instrumentTypes.${value}`), value })));
const currencyItems = INSTRUMENT_CURRENCIES.map((value) => ({ title: value, value }));

const priceDateModel = computed({
    get: () => form.lastPriceDate,
    set: (value: string | null) => {
        form.lastPriceDate = value;
    }
});

function clearErrors() {
    localError.message = null;
    for (const key of Object.keys(fieldErrors) as (keyof InstrumentFormFields)[]) fieldErrors[key] = null;
}

function applyError(code: InvestmentPayloadErrorCode, field?: string) {
    const message = t(`investmentsPage.errors.${code}`);
    if (field && field in form) {
        fieldErrors[field as keyof InstrumentFormFields] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    clearErrors();
    if (props.instrument) {
        Object.assign(form, instrumentToFormFields(props.instrument));
        return;
    }
    const settingsCurrency = settings.current.defaultCurrency;
    const currency = props.defaultCurrency ?? (isInstrumentCurrency(settingsCurrency) ? settingsCurrency : '');
    Object.assign(form, emptyInstrumentFormFields({ currency, type: 'action' }));
    form.symbol = (props.defaultSymbol ?? '').trim().toUpperCase().slice(0, INSTRUMENT_SYMBOL_MAX);
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) resetForm();
    },
    { immediate: true }
);

async function onSave() {
    if (!canSave.value || store.acting) return;
    clearErrors();
    const built = props.instrument ? buildUpdateInstrumentPayload(form) : buildCreateInstrumentPayload(form, { today: today.value });
    if (!built.ok) {
        applyError(built.code, built.field);
        return;
    }
    try {
        const saved = props.instrument
            ? await store.updateInstrument(props.instrument.publicId, form)
            : await store.createInstrument(form, { today: today.value });
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.message = err.status === 404 ? t('investmentsPage.errors.instrumentNotFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="isEdit ? t('investmentsPage.instrumentForm.editTitle') : t('investmentsPage.instrumentForm.createTitle')"
        :subtitle="t('investmentsPage.instrumentForm.subtitle')"
        :max-width="600"
        :height="680"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <div class="inv-form">
            <div class="inv-form__row">
                <label class="inv-form__label" for="instrument-form-symbol"
                    >{{ t('investmentsPage.instrumentForm.fields.symbol') }} *</label
                >
                <div class="inv-form__field">
                    <v-text-field
                        id="instrument-form-symbol"
                        v-model="form.symbol"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        autocomplete="off"
                        :maxlength="INSTRUMENT_SYMBOL_MAX"
                        :error-messages="fieldErrors.symbol || undefined"
                    />
                </div>
            </div>

            <div class="inv-form__row">
                <label class="inv-form__label" for="instrument-form-name">{{ t('investmentsPage.instrumentForm.fields.name') }} *</label>
                <div class="inv-form__field">
                    <v-text-field
                        id="instrument-form-name"
                        v-model="form.name"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        autocomplete="off"
                        :maxlength="INSTRUMENT_NAME_MAX"
                        :error-messages="fieldErrors.name || undefined"
                    />
                </div>
            </div>

            <div class="inv-form__row">
                <label class="inv-form__label">{{ t('investmentsPage.instrumentForm.fields.type') }} *</label>
                <div class="inv-form__field">
                    <AppSelect
                        v-model="form.type"
                        :items="typeItems"
                        :label="t('investmentsPage.instrumentForm.fields.type')"
                        hide-details="auto"
                        :error-messages="fieldErrors.type || undefined"
                    />
                </div>
            </div>

            <div class="inv-form__row">
                <label class="inv-form__label">{{ t('investmentsPage.instrumentForm.fields.currency') }} *</label>
                <div class="inv-form__field">
                    <AppSelect
                        v-model="form.currency"
                        :items="currencyItems"
                        :label="t('investmentsPage.instrumentForm.fields.currency')"
                        hide-details="auto"
                        :error-messages="fieldErrors.currency || undefined"
                    />
                </div>
            </div>

            <p v-if="isEdit" class="inv-form__hint">{{ t('investmentsPage.instrumentForm.lockedHint') }}</p>

            <div class="inv-form__row">
                <label class="inv-form__label" for="instrument-form-isin">{{ t('investmentsPage.instrumentForm.fields.isin') }}</label>
                <div class="inv-form__field">
                    <v-text-field
                        id="instrument-form-isin"
                        v-model="form.isin"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        autocomplete="off"
                        class="inv-form__mono"
                        :maxlength="INSTRUMENT_ISIN_LENGTH + 3"
                        :error-messages="fieldErrors.isin || undefined"
                    />
                </div>
            </div>

            <template v-if="!isEdit">
                <div class="inv-form__row">
                    <label class="inv-form__label" for="instrument-form-price">{{
                        t('investmentsPage.instrumentForm.fields.lastPrice')
                    }}</label>
                    <div class="inv-form__field">
                        <v-text-field
                            id="instrument-form-price"
                            v-model="form.lastPrice"
                            inputmode="decimal"
                            color="primary"
                            variant="outlined"
                            hide-details="auto"
                            autocomplete="off"
                            :error-messages="fieldErrors.lastPrice || undefined"
                        />
                        <p class="inv-form__caption">{{ t('investmentsPage.instrumentForm.lastPriceHint') }}</p>
                    </div>
                </div>

                <div v-if="form.lastPrice.trim()" class="inv-form__row">
                    <label class="inv-form__label">{{ t('investmentsPage.instrumentForm.fields.lastPriceDate') }}</label>
                    <div class="inv-form__field">
                        <AppDatePicker
                            v-model="priceDateModel"
                            :label="t('investmentsPage.instrumentForm.fields.lastPriceDate')"
                            :max="today"
                            clearable
                        />
                        <p v-if="fieldErrors.lastPriceDate" class="inv-form__caption inv-form__caption--error">
                            {{ fieldErrors.lastPriceDate }}
                        </p>
                        <p v-else class="inv-form__caption">{{ t('investmentsPage.instrumentForm.lastPriceDateHint') }}</p>
                    </div>
                </div>
            </template>
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

.inv-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.3;
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
}

.inv-form__mono :deep(input) {
    font-family: var(--font-mono);
}

.inv-form__hint {
    margin: 0;
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
}
</style>
