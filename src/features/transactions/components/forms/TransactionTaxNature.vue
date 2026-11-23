<script setup lang="ts">
/**
 * Nature fiscale d'une transaction existante : suggestion de la catégorie à confirmer en un geste,
 * ou nature choisie / écartée. Chaque geste est enregistré tout de suite (route dédiée), à part du
 * formulaire : il ne touche ni le montant ni les mouvements.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { taxNaturesApi } from '@/features/categories/api';
import { taxNatureCodesForType } from '@/features/categories/tax-natures';
import { resolveTaxNature, type SetTransactionTaxNaturePayload, type TransactionTaxNatureStatus } from '@/features/transactions/tax-nature';
import type { TransactionType } from '@/features/transactions/types';

const props = defineProps<{
    taxNature: string | null | undefined;
    taxNatureStatus: TransactionTaxNatureStatus | null | undefined;
    /** Enfant gardé déjà enregistré (nature « garde »). */
    taxBeneficiary?: string | null;
    /** Nature par défaut de la catégorie choisie dans le formulaire. */
    categoryNature: string | null | undefined;
    /** Tiers de la transaction : sert à suggérer une nature quand ni geste ni catégorie n'en donnent. */
    tierPublicId?: string | null;
    transactionType: TransactionType;
    disabled?: boolean;
}>();

const emit = defineEmits<{
    change: [payload: SetTransactionTaxNaturePayload];
}>();

const { t } = useI18n();
const choosing = ref(false);
const chosen = ref('');
const beneficiary = ref(props.taxBeneficiary ?? '');
watch(
    () => props.taxBeneficiary,
    (value) => {
        beneficiary.value = value ?? '';
    }
);

const tierSuggestion = ref<{ code: string; source: 'eligible' | 'history' } | null>(null);

const effective = computed(() =>
    resolveTaxNature({ taxNature: props.taxNature, taxNatureStatus: props.taxNatureStatus }, props.categoryNature)
);

/** Suggestion du tiers : seulement sans nature ni suggestion de la catégorie ; une erreur réseau la laisse simplement absente. */
watch(
    () => [props.tierPublicId, props.transactionType, effective.value.state] as const,
    async ([tierPublicId, type, state]) => {
        tierSuggestion.value = null;
        if (!tierPublicId || state !== 'none' || type === 'transfert') return;
        try {
            const result = await taxNaturesApi.suggestForTier(tierPublicId, type);
            if (result.taxNature && result.source) tierSuggestion.value = { code: result.taxNature, source: result.source };
        } catch {
            tierSuggestion.value = null;
        }
    },
    { immediate: true }
);

function confirmTierSuggestion() {
    if (tierSuggestion.value) emit('change', { taxNature: tierSuggestion.value.code });
}

const label = computed(() => (effective.value.code ? t(`taxNatures.${effective.value.code}`) : null));

const items = computed(() =>
    taxNatureCodesForType(props.transactionType === 'revenu' ? 'revenu' : 'depense').map((code) => ({
        title: t(`taxNatures.${code}`),
        value: code
    }))
);

function confirmSuggestion() {
    if (effective.value.code) emit('change', { taxNature: effective.value.code });
}

function startChoosing() {
    chosen.value = effective.value.code ?? '';
    choosing.value = true;
}

/** Le choix s'applique dès la sélection : pas de second bouton à trouver sous la liste. */
function pick(value: unknown) {
    if (typeof value !== 'string' || !value) return;
    chosen.value = value;
    emit('change', { taxNature: value });
    choosing.value = false;
}

const isChildcare = computed(() => effective.value.state === 'confirmed' && effective.value.code === 'childcare');

function saveBeneficiary() {
    emit('change', { taxNature: 'childcare', beneficiary: beneficiary.value.trim() || null });
}

function dismiss() {
    emit('change', { taxNature: null, dismissed: true });
    choosing.value = false;
}

function reset() {
    emit('change', { taxNature: null });
    choosing.value = false;
}
</script>

<template>
    <section class="tx-tax-nature" :aria-label="t('transactionsPage.taxNature.title')">
        <div class="tx-tax-nature__head">
            <span class="tx-tax-nature__title">{{ t('transactionsPage.taxNature.title') }}</span>
            <span class="tx-tax-nature__state" :class="`is-${effective.state}`">
                {{ t(`transactionsPage.taxNature.states.${effective.state}`) }}
            </span>
        </div>

        <p v-if="label" class="tx-tax-nature__value">{{ label }}</p>
        <div v-else-if="tierSuggestion" class="tx-tax-nature__choose" data-test="tx-tax-tier-suggestion">
            <p class="tx-tax-nature__value">{{ t(`taxNatures.${tierSuggestion.code}`) }}</p>
            <p class="tx-tax-nature__hint">{{ t(`transactionsPage.taxNature.tierSource.${tierSuggestion.source}`) }}</p>
            <div class="tx-tax-nature__actions">
                <button type="button" class="su-btn su-btn--ink su-btn--sm" :disabled="disabled" @click="confirmTierSuggestion">
                    {{ t('transactionsPage.taxNature.confirm') }}
                </button>
            </div>
        </div>
        <p v-else class="tx-tax-nature__hint">{{ t('transactionsPage.taxNature.noneHint') }}</p>

        <div v-if="isChildcare" class="tx-tax-nature__choose" data-test="tx-tax-beneficiary">
            <v-text-field
                v-model="beneficiary"
                color="primary"
                variant="outlined"
                density="compact"
                hide-details
                maxlength="100"
                :label="t('transactionsPage.taxNature.beneficiary')"
                :placeholder="t('transactionsPage.taxNature.beneficiaryHint')"
                :disabled="disabled"
                @keydown.enter.prevent="saveBeneficiary"
            />
            <div class="tx-tax-nature__actions">
                <button type="button" class="su-btn su-btn--ink su-btn--sm" :disabled="disabled" @click="saveBeneficiary">
                    {{ t('transactionsPage.taxNature.beneficiarySave') }}
                </button>
            </div>
        </div>

        <div v-if="choosing" class="tx-tax-nature__choose">
            <AppSelect
                :model-value="chosen"
                :items="items"
                :label="t('transactionsPage.taxNature.choose')"
                hide-details
                @update:model-value="pick"
            />
            <div class="tx-tax-nature__actions">
                <button type="button" class="su-btn su-btn--ghost su-btn--sm" :disabled="disabled" @click="choosing = false">
                    {{ t('common.cancel') }}
                </button>
            </div>
        </div>

        <div v-else class="tx-tax-nature__actions">
            <button
                v-if="effective.state === 'suggested'"
                type="button"
                class="su-btn su-btn--ink su-btn--sm"
                :disabled="disabled"
                @click="confirmSuggestion"
            >
                {{ t('transactionsPage.taxNature.confirm') }}
            </button>
            <button type="button" class="su-btn su-btn--ghost su-btn--sm" :disabled="disabled" @click="startChoosing">
                {{ effective.code ? t('transactionsPage.taxNature.change') : t('transactionsPage.taxNature.choose') }}
            </button>
            <button
                v-if="effective.state === 'suggested' || effective.state === 'confirmed'"
                type="button"
                class="su-btn su-btn--ghost su-btn--sm"
                :disabled="disabled"
                @click="dismiss"
            >
                {{ t('transactionsPage.taxNature.dismiss') }}
            </button>
            <button
                v-if="effective.state === 'confirmed' || effective.state === 'dismissed'"
                type="button"
                class="su-btn su-btn--ghost su-btn--sm"
                :disabled="disabled"
                @click="reset"
            >
                {{ t('transactionsPage.taxNature.reset') }}
            </button>
        </div>
    </section>
</template>

<style scoped>
.tx-tax-nature {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
}

.tx-tax-nature__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.tx-tax-nature__title {
    font-size: 14px;
    color: var(--ink);
}

.tx-tax-nature__state {
    font-size: 12px;
    color: var(--gray);
}

.tx-tax-nature__state.is-confirmed {
    color: var(--ink);
}

.tx-tax-nature__value {
    margin: 0;
    font-size: 14px;
    color: var(--ink);
}

.tx-tax-nature__hint {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
}

.tx-tax-nature__choose {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tx-tax-nature__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
