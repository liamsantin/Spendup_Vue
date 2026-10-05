<script setup lang="ts">
/**
 * Sélecteur de plan — écran autonome et réutilisable.
 * Piloté par `useSubscriptionStore().selectorOpen` (ouvert via `openPlanSelector(reason?)`),
 * ou en `v-model` local. Confirmation → `PUT /api/subscription` → `changed`.
 *
 * Seule la confirmation évoluera pour intégrer le prestataire de paiement.
 */
defineOptions({ name: 'PlanSelectorModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { comparisonRows } from '@/features/subscription/format';
import { useSubscriptionStore } from '@/features/subscription/stores/subscription-store';
import type { PlanSelectorReason, SubscriptionPlan, UserSubscription } from '@/features/subscription/types';
import PlanCard from '@/features/subscription/components/PlanCard.vue';

const props = withDefaults(
    defineProps<{
        /** Si omis, la modale suit `store.selectorOpen` (host global). */
        modelValue?: boolean | null;
        reason?: PlanSelectorReason | null;
    }>(),
    {
        modelValue: null,
        reason: null
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    changed: [subscription: UserSubscription];
}>();

const { t } = useI18n();
const store = useSubscriptionStore();

const controlled = computed(() => props.modelValue !== null);
const open = computed({
    get: () => (controlled.value ? !!props.modelValue : store.selectorOpen),
    set: (value: boolean) => {
        if (controlled.value) emit('update:modelValue', value);
        else if (!value) store.closePlanSelector();
        else store.openPlanSelector(store.selectorReason);
    }
});

const reason = computed(() => (controlled.value ? props.reason : store.selectorReason));
const highlightedCode = computed(() => reason.value?.requiredPlanCode ?? null);

const localError = ref<string | null>(null);
const pendingPlan = ref<SubscriptionPlan | null>(null);
const confirmOpen = computed({
    get: () => !!pendingPlan.value,
    set: (value: boolean) => {
        if (!value) pendingPlan.value = null;
    }
});

const rows = computed(() => comparisonRows(store.publicPlans));
const loading = computed(() => store.plansLoading && !store.publicPlans.length);

async function load(force = false) {
    localError.value = null;
    try {
        await Promise.all([store.loadPlans(force), store.subscription ? Promise.resolve() : store.loadSubscription()]);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

watch(
    open,
    (value) => {
        if (!value) {
            pendingPlan.value = null;
            return;
        }
        void load();
    },
    { immediate: true }
);

function onChoose(plan: SubscriptionPlan) {
    localError.value = null;
    pendingPlan.value = plan;
}

async function confirmChange() {
    const plan = pendingPlan.value;
    if (!plan) return;
    localError.value = null;
    try {
        const updated = await store.changePlan(plan.code);
        pendingPlan.value = null;
        emit('changed', updated);
        open.value = false;
    } catch (e: unknown) {
        // 400 métier : message serveur affichable tel quel, la modale reste ouverte.
        pendingPlan.value = null;
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('subscriptionPage.selector.title')"
        :subtitle="reason?.message || t('subscriptionPage.selector.subtitle')"
        :max-width="960"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
        :show-footer="false"
    >
        <AppAlert v-if="localError || store.error" type="error" class="mb-4" closable @dismiss="((localError = null), store.clearError())">
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="loading" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.publicPlans.length" class="su-empty">
            {{ t('subscriptionPage.selector.empty') }}
        </div>
        <div v-else class="plan-selector__grid">
            <PlanCard
                v-for="plan in store.publicPlans"
                :key="plan.code"
                :plan="plan"
                :feature-rows="rows.features"
                :quota-rows="rows.quotas"
                :highlighted="plan.code === highlightedCode"
                :disabled="store.changing"
                @choose="onChoose"
            />
        </div>

        <p class="plan-selector__note">{{ t('subscriptionPage.selector.noPaymentNote') }}</p>
    </AppModalBase>

    <AppConfirmationModal
        v-model="confirmOpen"
        :title="t('subscriptionPage.selector.confirmTitle', { name: pendingPlan?.name ?? '' })"
        :message="t('subscriptionPage.selector.confirmBody', { name: pendingPlan?.name ?? '' })"
        :confirm-label="t('subscriptionPage.selector.confirm')"
        :loading="store.changing"
        @confirm="confirmChange"
    />
</template>

<style scoped>
.plan-selector__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    align-items: stretch;
}

.plan-selector__note {
    margin: 16px 0 0;
    font-size: 0.78rem;
    color: var(--ink-muted);
    text-align: center;
}
</style>
