import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { AppError } from '@/utils/errors/app-error';
import type { SubscriptionPlan, UserSubscription } from '@/features/subscription/types';

const api = vi.hoisted(() => ({
    listPlans: vi.fn(),
    get: vi.fn(),
    changePlan: vi.fn()
}));

vi.mock('@/features/subscription/api', () => ({
    subscriptionApi: {
        listPlans: (...args: unknown[]) => api.listPlans(...args),
        get: (...args: unknown[]) => api.get(...args),
        changePlan: (...args: unknown[]) => api.changePlan(...args)
    },
    isSubscriptionMockEnabled: () => true
}));

import { useSubscriptionStore } from '@/features/subscription/stores/subscription-store';

function plan(code: string, isCurrent = false): SubscriptionPlan {
    return {
        code,
        name: code,
        description: null,
        isCurrent,
        features: code === 'family' ? [{ code: 'household', name: 'Foyer', description: null }] : [],
        quotas: [{ code: 'familyMembers', name: 'Membres', unit: 'membre', limit: code === 'family' ? 5 : 0 }]
    };
}

function subscription(code: string): UserSubscription {
    return {
        plan: plan(code, true),
        status: 'active',
        startedAt: '2026-01-15T09:00:00Z',
        expiresAt: null,
        canceledAt: null,
        usage: [{ code: 'familyMembers', used: 0 }]
    };
}

describe('useSubscriptionStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
    });

    it('charge l’abonnement et les plans, et aligne isCurrent sur le plan courant', async () => {
        api.get.mockResolvedValue(subscription('free'));
        api.listPlans.mockResolvedValue([plan('free'), plan('solo'), plan('family')]);
        const store = useSubscriptionStore();
        await store.loadSubscription();
        await store.loadPlans();
        expect(store.currentPlanCode).toBe('free');
        expect(store.publicPlans.find((p) => p.isCurrent)?.code).toBe('free');
        expect(store.quotaRows).toEqual([
            { code: 'familyMembers', name: 'Membres', unit: 'membre', used: 0, limit: 0, ratio: null, reached: true }
        ]);
    });

    it('changePlan applique la réponse PUT et met à jour les plans', async () => {
        api.get.mockResolvedValue(subscription('free'));
        api.listPlans.mockResolvedValue([plan('free'), plan('family')]);
        api.changePlan.mockResolvedValue(subscription('family'));
        const store = useSubscriptionStore();
        await store.loadSubscription();
        await store.loadPlans();
        const updated = await store.changePlan('family');
        expect(api.changePlan).toHaveBeenCalledWith({ planCode: 'family' });
        expect(updated.plan.code).toBe('family');
        expect(store.currentPlanCode).toBe('family');
        expect(store.publicPlans.filter((p) => p.isCurrent).map((p) => p.code)).toEqual(['family']);
        expect(store.hasFeature('household')).toBe(true);
    });

    it('remonte le message 400 serveur tel quel', async () => {
        api.changePlan.mockRejectedValue(new AppError('Changement refusé par une règle métier.', 400));
        const store = useSubscriptionStore();
        await expect(store.changePlan('solo')).rejects.toMatchObject({ status: 400 });
        expect(store.error).toBe('Changement refusé par une règle métier.');
    });

    it('openPlanSelector porte la raison, closePlanSelector la vide', () => {
        const store = useSubscriptionStore();
        store.openPlanSelector({ code: 'household', requiredPlanCode: 'family', message: 'Créer un foyer' });
        expect(store.selectorOpen).toBe(true);
        expect(store.selectorReason?.requiredPlanCode).toBe('family');
        store.closePlanSelector();
        expect(store.selectorOpen).toBe(false);
        expect(store.selectorReason).toBeNull();
    });

    it('requiredPlanForFeature / Quota s’appuient sur les plans publics', async () => {
        api.listPlans.mockResolvedValue([plan('free'), plan('family')]);
        const store = useSubscriptionStore();
        await store.loadPlans();
        expect(store.requiredPlanForFeature('household')?.code).toBe('family');
        expect(store.requiredPlanForQuota('familyMembers', 1)?.code).toBe('family');
        expect(store.requiredPlanForFeature('unknown')).toBeNull();
    });

    it('reset vide tout', async () => {
        api.get.mockResolvedValue(subscription('free'));
        const store = useSubscriptionStore();
        await store.loadSubscription();
        store.openPlanSelector();
        store.reset();
        expect(store.subscription).toBeNull();
        expect(store.plans).toEqual([]);
        expect(store.selectorOpen).toBe(false);
    });
});
