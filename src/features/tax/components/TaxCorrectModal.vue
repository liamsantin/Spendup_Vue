<script setup lang="ts">
/** Correction d'un montant d'une déclaration déposée : nouveau montant (vide = case vidée) et motif obligatoire. */
defineOptions({ name: 'TaxCorrectModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import type { TaxCompetence, TaxLine } from '@/features/tax/types';

export interface TaxCorrectPayload {
    competence: TaxCompetence;
    amount: number | null;
    reason: string;
}

const REASON_MAX = 500;

const open = defineModel<boolean>({ required: true });

const props = defineProps<{
    line: TaxLine | null;
    /** Montant actuel par ressort, pour la personne affichée. */
    current: Partial<Record<TaxCompetence, number>>;
    saving: boolean;
    error: string;
}>();

const emit = defineEmits<{ submit: [payload: TaxCorrectPayload] }>();

const { t } = useI18n();
const money = useTaxMoney();

const competence = ref<TaxCompetence>('both');
const amount = ref('');
const reason = ref('');

const competences = computed<TaxCompetence[]>(() => (props.line?.splitsCompetence ? ['cantonal', 'federal'] : ['both']));
const currentAmount = computed(() => props.current[competence.value] ?? null);

function textOf(value: number | null): string {
    return value == null ? '' : String(value);
}

watch(open, (isOpen) => {
    if (!isOpen) return;
    competence.value = competences.value[0];
    amount.value = textOf(currentAmount.value);
    reason.value = '';
});

watch(competence, () => {
    amount.value = textOf(currentAmount.value);
});

const parsed = computed<number | null | undefined>(() => {
    const trimmed = amount.value.trim().replace(/\s/g, '').replace(/'/g, '').replace(',', '.');
    if (trimmed === '') return null;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
});

const canSubmit = computed(
    () => !props.saving && parsed.value !== undefined && parsed.value !== currentAmount.value && reason.value.trim().length > 0
);

function submit() {
    if (!canSubmit.value || parsed.value === undefined) return;
    emit('submit', { competence: competence.value, amount: parsed.value, reason: reason.value.trim() });
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('taxPage.correctModal.title')"
        :subtitle="line?.label ?? ''"
        :max-width="520"
        mobile-layout="fullscreen"
    >
        <form id="tax-correct-form" class="tax-form tax-form--modal" @submit.prevent="submit">
            <p v-if="error" class="tax-error" role="alert">{{ error }}</p>
            <p class="tax-muted">{{ t('taxPage.correctModal.message') }}</p>
            <div v-if="competences.length > 1" class="tax-form__row">
                <span class="tax-form__label">{{ t('taxPage.correctModal.competence') }}</span>
                <div class="tax-form__field tax-form__actions">
                    <button
                        v-for="value in competences"
                        :key="value"
                        type="button"
                        class="su-btn"
                        :class="{ 'su-btn--ink': competence === value }"
                        :aria-pressed="competence === value"
                        @click="competence = value"
                    >
                        {{ t(`taxPage.${value}`) }}
                    </button>
                </div>
            </div>
            <div class="tax-form__row">
                <span class="tax-form__label">{{ t('taxPage.correctModal.current') }}</span>
                <p class="tax-form__field tax-line__hint">
                    {{ currentAmount == null ? t('taxPage.correctModal.empty') : money(currentAmount) }}
                </p>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-correct-amount">{{ t('taxPage.correctModal.amount') }}</label>
                <div class="tax-form__field">
                    <v-text-field
                        id="tax-correct-amount"
                        v-model="amount"
                        :placeholder="t('taxPage.emptyCell')"
                        color="primary"
                        variant="outlined"
                        hide-details
                    />
                </div>
            </div>
            <div class="tax-form__row">
                <label class="tax-form__label" for="tax-correct-reason">{{ t('taxPage.correctModal.reason') }}</label>
                <div class="tax-form__field tax-form__field--wide">
                    <v-textarea
                        id="tax-correct-reason"
                        v-model="reason"
                        :maxlength="REASON_MAX"
                        :placeholder="t('taxPage.correctModal.reasonPlaceholder')"
                        rows="3"
                        auto-grow
                        color="primary"
                        variant="outlined"
                        hide-details
                    />
                </div>
            </div>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="close">
                {{ t('taxPage.cancel') }}
            </button>
            <button type="submit" form="tax-correct-form" class="su-btn su-btn--ink" :disabled="!canSubmit">
                {{ t('taxPage.correctModal.confirm') }}
            </button>
        </template>
    </AppModalBase>
</template>
