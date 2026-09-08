import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import { subscriptionMockApi } from '@/features/subscription/mock';
import type { ChangePlanPayload, SubscriptionPlan, UserSubscription } from '@/features/subscription/types';

/**
 * `VITE_SUBSCRIPTION_MOCK` : `false` → API réelle. Toute autre valeur (ou absente) → mock en mémoire,
 * tant que le backend `/api/subscription` n’existe pas.
 */
export function isSubscriptionMockEnabled(): boolean {
    const raw = String(import.meta.env.VITE_SUBSCRIPTION_MOCK ?? '')
        .trim()
        .toLowerCase();
    return raw !== 'false' && raw !== '0';
}

const subscriptionHttpApi = {
    listPlans() {
        return fetchWrapper.get('/api/subscription/plans') as Promise<SubscriptionPlan[]>;
    },

    get() {
        return fetchWrapper.get('/api/subscription') as Promise<UserSubscription>;
    },

    changePlan(body: ChangePlanPayload) {
        return fetchWrapper.put('/api/subscription', body) as Promise<UserSubscription>;
    }
};

export const subscriptionApi = {
    listPlans(): Promise<SubscriptionPlan[]> {
        return isSubscriptionMockEnabled() ? subscriptionMockApi.listPlans() : subscriptionHttpApi.listPlans();
    },

    get(): Promise<UserSubscription> {
        return isSubscriptionMockEnabled() ? subscriptionMockApi.get() : subscriptionHttpApi.get();
    },

    changePlan(body: ChangePlanPayload): Promise<UserSubscription> {
        return isSubscriptionMockEnabled() ? subscriptionMockApi.changePlan(body) : subscriptionHttpApi.changePlan(body);
    }
};
