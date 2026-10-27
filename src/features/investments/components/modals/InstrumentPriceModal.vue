<script setup lang="ts">
/**
 * Saisie manuelle du cours d'un instrument (`POST /api/instruments/{id}/price`).
 * Date ≤ aujourd'hui (fuseau des settings) ; le serveur pousse `investmentPriceUpdated` sur chaque compte porteur.
 */
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatCalendarDate, formatPrice } from '@/features/investments/format';
import { buildSetPricePayload, emptyPriceFormFields, type PriceFormFields } from '@/features/investments/payload';
import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';
import type { Instrument } from '@/features/investments/types';

const props = defineProps<{
    modelValue: boolean;
    instrument: Instrument | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [instrument: Instrument];
}>();

const { t, locale } = useI18n();
const store = useInstrumentsStore();
const settings = useUserSettingsStore();

const form = reactive<PriceFormFields>(emptyPriceFormFields());
const fieldErrors = reactive<{ price: string | null; date: string | null }>({ price: null, date: null });
const localError = reactive({ message: null as string | null });

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));

const currentQuote = computed(() => {
    const instrument = props.instrument;
    if (!instrument || instrument.lastPrice == null) return t('investmentsPage.priceForm.noQuote');
    const price = formatPrice(instrument.lastPrice, instrument.currency, locale.value);
    if (!instrument.lastPriceDate) return price;
    return t('investmentsPage.priceForm.currentQuote', { price, date: formatCalendarDate(instrument.lastPriceDate, locale.value) });
});

const dateModel = computed({
    get: () => form.date,
    set: (value: string | null) => {
        form.date = value;
    }
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        localError.message = null;
        fieldErrors.price = null;
        fieldErrors.date = null;
        Object.assign(form, emptyPriceFormFields({ date: today.value }));
    },
    { immediate: true }
);

async function onSave() {
    const instrument = props.instrument;
    if (!instrument || store.acting) return;
    localError.message = null;
    fieldErrors.price = null;
    fieldErrors.date = null;
    const built = buildSetPricePayload(form, { today: today.value });
    if (!built.ok) {
        const message = t(`investmentsPage.errors.${built.code}`);
        if (built.field === 'date') fieldErrors.date = message;
        else fieldErrors.price = message;
        return;
    }
    try {
        const saved = await store.setPrice(instrument.publicId, form, { today: today.value });
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
        :title="t('investmentsPage.priceForm.title', { symbol: instrument?.symbol ?? '' })"
        :subtitle="instrument?.name || t('investmentsPage.priceForm.subtitle')"
        :max-width="520"
        :scrollable="false"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <p class="price-form__current">{{ currentQuote }}</p>

        <div class="price-form">
            <div class="price-form__row">
                <label class="price-form__label" for="price-form-price">
                    {{ t('investmentsPage.priceForm.fields.price') }} *
                    <span v-if="instrument" class="price-form__unit">{{ instrument.currency }}</span>
                </label>
                <div class="price-form__field">
                    <v-text-field
                        id="price-form-price"
                        v-model="form.price"
                        inputmode="decimal"
                        color="primary"
                        variant="outlined"
                        hide-details="auto"
                        autocomplete="off"
                        autofocus
                        :error-messages="fieldErrors.price || undefined"
                        @keydown.enter.prevent="onSave"
                    />
                </div>
            </div>
            <div class="price-form__row">
                <label class="price-form__label">{{ t('investmentsPage.priceForm.fields.date') }}</label>
                <div class="price-form__field">
                    <AppDatePicker
                        v-model="dateModel"
                        :label="t('investmentsPage.priceForm.fields.date')"
                        :max="today"
                        :clearable="false"
                    />
                    <p v-if="fieldErrors.date" class="price-form__caption price-form__caption--error">{{ fieldErrors.date }}</p>
                    <p v-else class="price-form__caption">{{ t('investmentsPage.priceForm.dateHint') }}</p>
                </div>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !instrument" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.price-form__current {
    margin: 0 0 16px;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.price-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.price-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.price-form__label {
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
}

.price-form__unit {
    color: var(--gray);
    font-size: 13px;
}

.price-form__field {
    min-width: 0;
}

.price-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.price-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
    font-variant-numeric: tabular-nums;
}

.price-form__caption {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.price-form__caption--error {
    color: var(--danger);
}

@media (max-width: 599.98px) {
    .price-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
