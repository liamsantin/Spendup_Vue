export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'pending';

export type SubscriptionFeature = {
    code: string;
    name: string;
    description: string | null;
};

export type SubscriptionQuota = {
    code: string;
    name: string;
    unit: string;
    /** `null` = illimité. */
    limit: number | null;
};

export type SubscriptionPlan = {
    /** ex. `free` | `solo` | `family` — valeurs à confirmer au seed. */
    code: string;
    name: string;
    description: string | null;
    isCurrent: boolean;
    features: SubscriptionFeature[];
    quotas: SubscriptionQuota[];
};

export type SubscriptionUsage = {
    /** Même `code` que le quota du plan. */
    code: string;
    used: number;
};

export type UserSubscription = {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    /** ISO UTC. */
    startedAt: string;
    expiresAt: string | null;
    canceledAt: string | null;
    usage: SubscriptionUsage[];
};

export type ChangePlanPayload = {
    planCode: string;
};

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'canceled', 'expired', 'pending'];

/** Code du plan gratuit (attribué par défaut à l’inscription). */
export const FREE_PLAN_CODE = 'free';

/** Raison d’ouverture du sélecteur (upsell) — libre, sert au libellé contextuel et à la télémétrie future. */
export type PlanSelectorReason = {
    /** Code de feature ou de quota qui a déclenché l’upsell. */
    code?: string;
    /** Plan minimum requis, si connu. */
    requiredPlanCode?: string;
    /** Message contextuel déjà traduit. */
    message?: string;
};
