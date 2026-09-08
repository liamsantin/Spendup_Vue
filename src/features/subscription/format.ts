import type { SubscriptionPlan, SubscriptionQuota, SubscriptionUsage, UserSubscription } from '@/features/subscription/types';

export type QuotaUsageRow = {
    code: string;
    name: string;
    unit: string;
    used: number;
    /** `null` = illimité. */
    limit: number | null;
    /** 0..1, `null` si illimité ou limite 0. */
    ratio: number | null;
    reached: boolean;
};

export function isUnlimited(quota: Pick<SubscriptionQuota, 'limit'>): boolean {
    return quota.limit == null;
}

export function usageFor(usage: readonly SubscriptionUsage[], code: string): number {
    const entry = usage.find((item) => item.code === code);
    const used = entry?.used ?? 0;
    return Number.isFinite(used) && used > 0 ? used : 0;
}

/** Fusionne quotas du plan et consommation ; les quotas sans usage sont à 0. */
export function quotaUsageRows(subscription: Pick<UserSubscription, 'plan' | 'usage'>): QuotaUsageRow[] {
    return subscription.plan.quotas.map((quota) => {
        const used = usageFor(subscription.usage, quota.code);
        const limit = quota.limit;
        const ratio = limit == null || limit <= 0 ? null : Math.min(1, used / limit);
        return {
            code: quota.code,
            name: quota.name,
            unit: quota.unit,
            used,
            limit,
            ratio,
            reached: limit != null && used >= limit
        };
    });
}

export function isSubscriptionActive(subscription: Pick<UserSubscription, 'status'> | null | undefined): boolean {
    return subscription?.status === 'active';
}

export function findPlan(plans: readonly SubscriptionPlan[], code: string | null | undefined): SubscriptionPlan | null {
    const needle = code?.trim();
    if (!needle) return null;
    return plans.find((plan) => plan.code === needle) ?? null;
}

export function planHasFeature(plan: Pick<SubscriptionPlan, 'features'> | null | undefined, featureCode: string): boolean {
    return !!plan?.features.some((feature) => feature.code === featureCode);
}

export function planQuotaLimit(plan: Pick<SubscriptionPlan, 'quotas'> | null | undefined, quotaCode: string): number | null | undefined {
    const quota = plan?.quotas.find((item) => item.code === quotaCode);
    return quota ? quota.limit : undefined;
}

/**
 * Premier plan (dans l’ordre renvoyé par l’API) qui inclut la feature.
 * Sert à l’upsell : « Cette fonctionnalité nécessite le plan X ».
 */
export function firstPlanWithFeature(plans: readonly SubscriptionPlan[], featureCode: string): SubscriptionPlan | null {
    return plans.find((plan) => planHasFeature(plan, featureCode)) ?? null;
}

/** Premier plan dont le quota est illimité ou ≥ `needed`. */
export function firstPlanWithQuota(plans: readonly SubscriptionPlan[], quotaCode: string, needed = 1): SubscriptionPlan | null {
    return (
        plans.find((plan) => {
            const limit = planQuotaLimit(plan, quotaCode);
            if (limit === undefined) return false;
            return limit == null || limit >= needed;
        }) ?? null
    );
}

/** Union ordonnée des codes de features / quotas de tous les plans (lignes du comparatif). */
export function comparisonRows(plans: readonly SubscriptionPlan[]): {
    features: { code: string; name: string }[];
    quotas: { code: string; name: string; unit: string }[];
} {
    const features = new Map<string, { code: string; name: string }>();
    const quotas = new Map<string, { code: string; name: string; unit: string }>();
    for (const plan of plans) {
        for (const feature of plan.features) {
            if (!features.has(feature.code)) features.set(feature.code, { code: feature.code, name: feature.name });
        }
        for (const quota of plan.quotas) {
            if (!quotas.has(quota.code)) quotas.set(quota.code, { code: quota.code, name: quota.name, unit: quota.unit });
        }
    }
    return { features: [...features.values()], quotas: [...quotas.values()] };
}

export function formatSubscriptionDate(value: string | null | undefined, locale?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'long' }).format(date);
}
