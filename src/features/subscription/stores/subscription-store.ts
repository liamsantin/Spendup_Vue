import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { AppError } from '@/utils/errors/app-error';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import { subscriptionApi } from '@/features/subscription/api';
import { findPlan, firstPlanWithFeature, firstPlanWithQuota, planHasFeature, quotaUsageRows } from '@/features/subscription/format';
import type { PlanSelectorReason, SubscriptionPlan, UserSubscription } from '@/features/subscription/types';

export const SUBSCRIPTION_MAX_AGE_MS = 60_000;

const KEY_SUBSCRIPTION = 'subscription';
const KEY_PLANS = 'plans';

/**
 * Abonnement courant + plans publics + état du sélecteur de plan (ouvert depuis Settings ou un upsell).
 */
export const useSubscriptionStore = defineStore('subscription', () => {
    const subscription = ref<UserSubscription | null>(null);
    const plans = ref<SubscriptionPlan[]>([]);
    const loading = ref(false);
    const plansLoading = ref(false);
    const changing = ref(false);
    const error = ref<string | null>(null);

    const selectorOpen = ref(false);
    const selectorReason = ref<PlanSelectorReason | null>(null);

    const cache = createResourceCache({ defaultMaxAgeMs: SUBSCRIPTION_MAX_AGE_MS });

    const currentPlan = computed(() => subscription.value?.plan ?? null);
    const currentPlanCode = computed(() => currentPlan.value?.code ?? null);
    const quotaRows = computed(() => (subscription.value ? quotaUsageRows(subscription.value) : []));
    const publicPlans = computed(() =>
        plans.value.map((plan) => ({ ...plan, isCurrent: currentPlanCode.value ? plan.code === currentPlanCode.value : plan.isCurrent }))
    );

    function clearError() {
        error.value = null;
    }

    function applySubscription(next: UserSubscription) {
        subscription.value = next;
        plans.value = plans.value.map((plan) => ({ ...plan, isCurrent: plan.code === next.plan.code }));
    }

    async function loadSubscription(force = false) {
        loading.value = true;
        clearError();
        try {
            await cache.ensure(
                KEY_SUBSCRIPTION,
                async () => {
                    const result = await subscriptionApi.get();
                    applySubscription(result);
                },
                { force }
            );
        } catch (e: unknown) {
            error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function loadPlans(force = false) {
        plansLoading.value = true;
        clearError();
        try {
            await cache.ensure(
                KEY_PLANS,
                async () => {
                    const result = await subscriptionApi.listPlans();
                    const list = Array.isArray(result) ? result : [];
                    const code = currentPlanCode.value;
                    plans.value = code ? list.map((plan) => ({ ...plan, isCurrent: plan.code === code })) : list;
                },
                { force }
            );
        } catch (e: unknown) {
            error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            plansLoading.value = false;
        }
    }

    /**
     * `PUT /api/subscription` — libre tant que le paiement n’existe pas.
     * Un `400` remonte avec le message serveur affichable tel quel.
     */
    async function changePlan(planCode: string): Promise<UserSubscription> {
        const code = planCode.trim();
        if (!code) throw new AppError('Choisissez un plan.', 400, 'plan_required');
        changing.value = true;
        clearError();
        try {
            const result = await subscriptionApi.changePlan({ planCode: code });
            applySubscription(result);
            cache.touch(KEY_SUBSCRIPTION);
            return result;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            changing.value = false;
        }
    }

    /** Point d’entrée générique (Settings, upsell « créer un foyer », …). */
    function openPlanSelector(reason?: PlanSelectorReason | null) {
        selectorReason.value = reason ?? null;
        selectorOpen.value = true;
    }

    function closePlanSelector() {
        selectorOpen.value = false;
        selectorReason.value = null;
    }

    function hasFeature(featureCode: string): boolean {
        return planHasFeature(currentPlan.value, featureCode);
    }

    /** Plan minimum à proposer pour une feature (`null` si aucun plan ne l’offre ou plans non chargés). */
    function requiredPlanForFeature(featureCode: string): SubscriptionPlan | null {
        return firstPlanWithFeature(plans.value, featureCode);
    }

    function requiredPlanForQuota(quotaCode: string, needed = 1): SubscriptionPlan | null {
        return firstPlanWithQuota(plans.value, quotaCode, needed);
    }

    function planByCode(code: string | null | undefined): SubscriptionPlan | null {
        return findPlan(plans.value, code);
    }

    function reset() {
        subscription.value = null;
        plans.value = [];
        loading.value = false;
        plansLoading.value = false;
        changing.value = false;
        error.value = null;
        selectorOpen.value = false;
        selectorReason.value = null;
        cache.reset();
    }

    return {
        subscription,
        plans,
        publicPlans,
        currentPlan,
        currentPlanCode,
        quotaRows,
        loading,
        plansLoading,
        changing,
        error,
        selectorOpen,
        selectorReason,
        clearError,
        loadSubscription,
        loadPlans,
        changePlan,
        openPlanSelector,
        closePlanSelector,
        hasFeature,
        requiredPlanForFeature,
        requiredPlanForQuota,
        planByCode,
        reset
    };
});
