import { beforeEach, describe, expect, it } from 'vitest';
import { resetSubscriptionMock, subscriptionMockApi } from '@/features/subscription/mock';

describe('subscriptionMockApi', () => {
    beforeEach(() => {
        resetSubscriptionMock();
    });

    it('expose trois plans publics, free courant par défaut', async () => {
        const plans = await subscriptionMockApi.listPlans();
        expect(plans.map((plan) => plan.code)).toEqual(['free', 'solo', 'family']);
        expect(plans.find((plan) => plan.isCurrent)?.code).toBe('free');
        expect(plans.find((plan) => plan.code === 'free')?.quotas.find((q) => q.code === 'familyMembers')?.limit).toBe(0);
        expect(plans.find((plan) => plan.code === 'family')?.quotas.find((q) => q.code === 'familyMembers')?.limit).toBe(5);
    });

    it('renvoie un abonnement actif sur free sans échéance', async () => {
        const subscription = await subscriptionMockApi.get();
        expect(subscription.plan.code).toBe('free');
        expect(subscription.plan.isCurrent).toBe(true);
        expect(subscription.status).toBe('active');
        expect(subscription.expiresAt).toBeNull();
        expect(subscription.usage.some((entry) => entry.code === 'familyMembers')).toBe(true);
    });

    it('PUT bascule le plan et remet isCurrent', async () => {
        const updated = await subscriptionMockApi.changePlan({ planCode: 'family' });
        expect(updated.plan.code).toBe('family');
        expect(updated.plan.isCurrent).toBe(true);
        const plans = await subscriptionMockApi.listPlans();
        expect(plans.filter((plan) => plan.isCurrent).map((plan) => plan.code)).toEqual(['family']);
        const subscription = await subscriptionMockApi.get();
        expect(subscription.plan.code).toBe('family');
    });

    it('refuse un plan inconnu ou déjà courant avec un 400 affichable', async () => {
        await expect(subscriptionMockApi.changePlan({ planCode: 'gold' })).rejects.toMatchObject({ status: 400 });
        await expect(subscriptionMockApi.changePlan({ planCode: 'free' })).rejects.toMatchObject({ status: 400 });
    });
});
