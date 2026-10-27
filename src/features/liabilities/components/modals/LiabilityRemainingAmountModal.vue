<script setup lang="ts">
/**
 * Geste rapide « Mettre à jour le restant » (`POST /remaining-amount`) : un seul champ, bornes 0–initial.
 */
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { formatLiabilityAmount } from '@/features/liabilities/format';
import { buildSetRemainingAmountPayload, type LiabilityRemainingAmountFields } from '@/features/liabilities/payload';
import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';
import type { Liability } from '@/features/liabilities/types';

const props = defineProps<{
    modelValue: boolean;
    liability: Liability | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [liability: Liability];
}>();

const { t, locale } = useI18n();
const store = useLiabilitiesStore();

const form = reactive<LiabilityRemainingAmountFields>({ remainingAmount: '' });
const state = reactive({ error: null as string | null, fieldError: null as string | null });

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const title = computed(() => props.liability?.name ?? t('liabilitiesPage.remainingModal.title'));
const hint = computed(() => {
    if (!props.liability) return '';
    return t('liabilitiesPage.remainingModal.hint', {
        initial: formatLiabilityAmount(props.liability.initialAmount, props.liability.currency, locale.value)
    });
});

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        state.error = null;
        state.fieldError = null;
        form.remainingAmount = props.liability ? String(props.liability.remainingAmount) : '';
    }
);

async function onSave() {
    const target = props.liability;
    if (!target) return;
    state.error = null;
    state.fieldError = null;
    const built = buildSetRemainingAmountPayload(form, { initialAmount: target.initialAmount });
    if (!built.ok) {
        state.fieldError = t(`liabilitiesPage.form.errors.${built.code}`);
        return;
    }
    try {
        const saved = await store.setRemainingAmount(target.publicId, form);
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        state.error = err.status === 404 ? t('liabilitiesPage.errors.notFound') : getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="title"
        :subtitle="t('liabilitiesPage.remainingModal.subtitle')"
        :max-width="480"
        :scrollable="false"
    >
        <AppAlert v-if="state.error" type="error" class="mb-4" closable @dismiss="state.error = null">
            {{ state.error }}
        </AppAlert>

        <div class="remaining-form__row">
            <label class="remaining-form__label" for="liability-remaining-amount"
                >{{ t('liabilitiesPage.form.fields.remainingAmount') }} *</label
            >
            <div class="remaining-form__field">
                <v-text-field
                    id="liability-remaining-amount"
                    v-model="form.remainingAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    :max="liability?.initialAmount"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autofocus
                    :error="!!state.fieldError"
                    :error-messages="state.fieldError || undefined"
                    @keydown.enter.prevent="onSave"
                />
                <p v-if="hint" class="remaining-form__hint">{{ hint }}</p>
            </div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !liability" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.remaining-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.remaining-form__label {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.3;
}

.remaining-form__field {
    min-width: 0;
}

.remaining-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.remaining-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.remaining-form__hint {
    margin: 6px 0 0;
    color: var(--gray);
    font-size: 13px;
}

@media (max-width: 599.98px) {
    .remaining-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }
}
</style>
