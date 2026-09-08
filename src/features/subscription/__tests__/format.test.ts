import { describe, expect, it } from 'vitest';
import { comparisonRows, firstPlanWithFeature, firstPlanWithQuota, quotaUsageRows } from '@/features/subscription/format';
import type { SubscriptionPlan, UserSubscription } from '@/features/subscription/types';

function plan(partial: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, 'code'>): SubscriptionPlan {
    return {
        name: partial.code,
        description: null,
        isCurrent: false,
        features: [],
        quotas: [],
        ...partial
    };
}

const free = plan({
    code: 'free',
    features: [{ code: 'accounts', name: 'Comptes', description: null }],
    quotas: [
        { code: 'accounts', name: 'Comptes', unit: 'compte', limit: 3 },
        { code: 'familyMembers', name: 'Membres', unit: 'membre', limit: 0 }
    ]
});

const family = plan({
    code: 'family',
    features: [
        { code: 'accounts', name: 'Comptes', description: null },
        { code: 'household', name: 'Foyer', description: null }
    ],
    quotas: [
        { code: 'accounts', name: 'Comptes', unit: 'compte', limit: null },
        { code: 'familyMembers', name: 'Membres', unit: 'membre', limit: 5 }
    ]
});

describe('subscription format', () => {
    it('fusionne quotas et consommation, illimité si limite null', () => {
        const subscription: Pick<UserSubscription, 'plan' | 'usage'> = {
            plan: family,
            usage: [{ code: 'familyMembers', used: 2 }]
        };
        const rows = quotaUsageRows(subscription);
        expect(rows).toEqual([
            { code: 'accounts', name: 'Comptes', unit: 'compte', used: 0, limit: null, ratio: null, reached: false },
            { code: 'familyMembers', name: 'Membres', unit: 'membre', used: 2, limit: 5, ratio: 0.4, reached: false }
        ]);
    });

    it('marque un quota atteint et plafonne le ratio', () => {
        const rows = quotaUsageRows({ plan: free, usage: [{ code: 'accounts', used: 4 }] });
        expect(rows[0]).toMatchObject({ used: 4, limit: 3, ratio: 1, reached: true });
        expect(rows[1]).toMatchObject({ used: 0, limit: 0, ratio: null, reached: true });
    });

    it('trouve le premier plan qui offre une feature ou un quota suffisant', () => {
        const plans = [free, family];
        expect(firstPlanWithFeature(plans, 'household')?.code).toBe('family');
        expect(firstPlanWithFeature(plans, 'accounts')?.code).toBe('free');
        expect(firstPlanWithFeature(plans, 'nope')).toBeNull();
        expect(firstPlanWithQuota(plans, 'familyMembers', 1)?.code).toBe('family');
        expect(firstPlanWithQuota(plans, 'accounts', 10)?.code).toBe('family');
        expect(firstPlanWithQuota(plans, 'accounts', 2)?.code).toBe('free');
    });

    it('construit l’union ordonnée des lignes du comparatif', () => {
        const rows = comparisonRows([free, family]);
        expect(rows.features.map((row) => row.code)).toEqual(['accounts', 'household']);
        expect(rows.quotas.map((row) => row.code)).toEqual(['accounts', 'familyMembers']);
    });
});
