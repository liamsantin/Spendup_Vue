<script setup lang="ts">
/**
 * Écran d’upsell générique : « Cette fonctionnalité nécessite le plan X ».
 * Pas encore branché — prêt à être posé sur un écran (ex. « créer un foyer »).
 *
 * Résout le plan requis via `featureCode` / `quotaCode`, ou `requiredPlanCode` explicite.
 */
defineOptions({ name: 'PlanUpsell' });

import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { SparklesIcon } from 'vue-tabler-icons';
import { useSubscriptionStore } from '@/features/subscription/stores/subscription-store';
import type { SubscriptionPlan } from '@/features/subscription/types';

const props = withDefaults(
    defineProps<{
        /** Feature qui manque au plan courant. */
        featureCode?: string | null;
        /** Quota atteint (ex. `familyMembers`). */
        quotaCode?: string | null;
        /** Plan requis si déjà connu ; sinon déduit des plans publics. */
        requiredPlanCode?: string | null;
        /** Libellé humain de la fonctionnalité (ex. « Créer un foyer »). */
        featureName?: string | null;
        /** Variante compacte (bandeau) au lieu de la carte pleine. */
        compact?: boolean;
    }>(),
    {
        featureCode: null,
        quotaCode: null,
        requiredPlanCode: null,
        featureName: null,
        compact: false
    }
);

const { t } = useI18n();
const store = useSubscriptionStore();

const requiredPlan = computed<SubscriptionPlan | null>(() => {
    if (props.requiredPlanCode) return store.planByCode(props.requiredPlanCode);
    if (props.featureCode) return store.requiredPlanForFeature(props.featureCode);
    if (props.quotaCode) return store.requiredPlanForQuota(props.quotaCode, 1);
    return null;
});

const featureLabel = computed(() => {
    if (props.featureName) return props.featureName;
    if (props.featureCode) {
        const fromPlan = requiredPlan.value?.features.find((feature) => feature.code === props.featureCode);
        if (fromPlan) return fromPlan.name;
    }
    if (props.quotaCode) {
        const fromPlan = requiredPlan.value?.quotas.find((quota) => quota.code === props.quotaCode);
        if (fromPlan) return fromPlan.name;
    }
    return t('subscriptionPage.upsell.thisFeature');
});

const title = computed(() =>
    requiredPlan.value
        ? t('subscriptionPage.upsell.title', { feature: featureLabel.value, plan: requiredPlan.value.name })
        : t('subscriptionPage.upsell.titleGeneric', { feature: featureLabel.value })
);

onMounted(() => {
    if (!store.plans.length) void store.loadPlans().catch(() => undefined);
});

function openSelector() {
    store.openPlanSelector({
        code: props.featureCode ?? props.quotaCode ?? undefined,
        requiredPlanCode: requiredPlan.value?.code ?? props.requiredPlanCode ?? undefined,
        message: title.value
    });
}
</script>

<template>
    <div class="plan-upsell" :class="{ 'plan-upsell--compact': compact }" role="status">
        <span class="plan-upsell__icon">
            <SparklesIcon :size="compact ? 16 : 22" stroke-width="1.8" />
        </span>
        <div class="plan-upsell__body">
            <p class="plan-upsell__title">{{ title }}</p>
            <p v-if="!compact" class="plan-upsell__text">{{ t('subscriptionPage.upsell.body') }}</p>
        </div>
        <button type="button" class="su-btn su-btn--ink plan-upsell__cta" @click="openSelector">
            {{ t('subscriptionPage.upsell.cta') }}
        </button>
    </div>
</template>

<style scoped>
.plan-upsell {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border-radius: var(--radius-surface, 18px);
    border: 1px dashed rgba(var(--v-theme-primary), 0.45);
    background: rgba(var(--v-theme-primary), 0.05);
}

.plan-upsell--compact {
    padding: 10px 14px;
    gap: 10px;
    border-radius: 12px;
}

.plan-upsell__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}

.plan-upsell--compact .plan-upsell__icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
}

.plan-upsell__body {
    flex: 1 1 auto;
    min-width: 0;
}

.plan-upsell__title {
    margin: 0;
    font-weight: 650;
    font-size: 0.92rem;
    letter-spacing: -0.01em;
}

.plan-upsell--compact .plan-upsell__title {
    font-size: 0.84rem;
}

.plan-upsell__text {
    margin: 2px 0 0;
    font-size: 0.82rem;
    color: var(--ink-muted);
}

.plan-upsell__cta {
    flex: none;
}

@media (max-width: 599.98px) {
    .plan-upsell {
        flex-wrap: wrap;
    }

    .plan-upsell__cta {
        width: 100%;
        justify-content: center;
    }
}
</style>
