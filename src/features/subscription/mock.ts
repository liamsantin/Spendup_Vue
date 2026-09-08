import { AppError } from '@/utils/errors/app-error';
import type { ChangePlanPayload, SubscriptionPlan, UserSubscription } from '@/features/subscription/types';

/**
 * Mock en mémoire du contrat `/api/subscription` — à retirer quand le backend existe.
 * Trois plans (`free` par défaut, `solo`, `family`), un abonnement `active` sur `free` sans échéance.
 * Le `PUT` bascule le plan et remet `isCurrent`.
 */

const MOCK_LATENCY_MS = 120;

type MockPlanDef = Omit<SubscriptionPlan, 'isCurrent'>;

const FEATURES = {
    accounts: { code: 'accounts', name: 'Comptes et transactions', description: 'Suivi des comptes, transactions et catégories.' },
    sharing: { code: 'accountSharing', name: 'Partage de comptes', description: 'Inviter des co-détenteurs sur vos comptes.' },
    tiers: { code: 'tiers', name: 'Annuaire de tiers', description: 'Contreparties personnelles rattachées aux transactions.' },
    budgets: { code: 'budgets', name: 'Budgets', description: 'Enveloppes et alertes budgétaires.' },
    household: { code: 'household', name: 'Foyer', description: 'Un espace commun pour toute la famille.' },
    exports: { code: 'exports', name: 'Exports', description: 'Export CSV / PDF des relevés.' }
} as const;

const PLAN_DEFS: MockPlanDef[] = [
    {
        code: 'free',
        name: 'Gratuit',
        description: 'L’essentiel pour suivre ses finances personnelles.',
        features: [FEATURES.accounts, FEATURES.tiers],
        quotas: [
            { code: 'accounts', name: 'Comptes', unit: 'compte', limit: 3 },
            { code: 'familyMembers', name: 'Membres du foyer', unit: 'membre', limit: 0 },
            { code: 'sharedAccounts', name: 'Comptes partagés', unit: 'compte', limit: 1 }
        ]
    },
    {
        code: 'solo',
        name: 'Solo',
        description: 'Pour une gestion complète, sans limite de comptes.',
        features: [FEATURES.accounts, FEATURES.tiers, FEATURES.sharing, FEATURES.budgets, FEATURES.exports],
        quotas: [
            { code: 'accounts', name: 'Comptes', unit: 'compte', limit: null },
            { code: 'familyMembers', name: 'Membres du foyer', unit: 'membre', limit: 0 },
            { code: 'sharedAccounts', name: 'Comptes partagés', unit: 'compte', limit: 5 }
        ]
    },
    {
        code: 'family',
        name: 'Famille',
        description: 'Un foyer partagé jusqu’à cinq membres.',
        features: [FEATURES.accounts, FEATURES.tiers, FEATURES.sharing, FEATURES.budgets, FEATURES.exports, FEATURES.household],
        quotas: [
            { code: 'accounts', name: 'Comptes', unit: 'compte', limit: null },
            { code: 'familyMembers', name: 'Membres du foyer', unit: 'membre', limit: 5 },
            { code: 'sharedAccounts', name: 'Comptes partagés', unit: 'compte', limit: null }
        ]
    }
];

type MockState = {
    currentPlanCode: string;
    startedAt: string;
    usage: { code: string; used: number }[];
};

function initialState(): MockState {
    return {
        currentPlanCode: 'free',
        startedAt: '2026-01-15T09:00:00Z',
        usage: [
            { code: 'accounts', used: 2 },
            { code: 'familyMembers', used: 0 },
            { code: 'sharedAccounts', used: 1 }
        ]
    };
}

let state: MockState = initialState();

function delay(): Promise<void> {
    if (MOCK_LATENCY_MS <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function toPlan(def: MockPlanDef): SubscriptionPlan {
    return clone({ ...def, isCurrent: def.code === state.currentPlanCode });
}

function currentSubscription(): UserSubscription {
    const def = PLAN_DEFS.find((plan) => plan.code === state.currentPlanCode) ?? PLAN_DEFS[0];
    return {
        plan: toPlan(def),
        status: 'active',
        startedAt: state.startedAt,
        expiresAt: null,
        canceledAt: null,
        usage: clone(state.usage)
    };
}

export const subscriptionMockApi = {
    async listPlans(): Promise<SubscriptionPlan[]> {
        await delay();
        return PLAN_DEFS.map(toPlan);
    },

    async get(): Promise<UserSubscription> {
        await delay();
        return currentSubscription();
    },

    async changePlan(body: ChangePlanPayload): Promise<UserSubscription> {
        await delay();
        const code = String(body?.planCode ?? '').trim();
        const def = PLAN_DEFS.find((plan) => plan.code === code);
        if (!def) {
            throw new AppError('Ce plan est inconnu ou n’est pas disponible.', 400, 'plan_unknown');
        }
        if (def.code === state.currentPlanCode) {
            throw new AppError('Vous êtes déjà sur ce plan.', 400, 'plan_already_current');
        }
        state = {
            ...state,
            currentPlanCode: def.code,
            startedAt: new Date().toISOString()
        };
        return currentSubscription();
    }
};

/** Tests uniquement : remet le mock à son état initial. */
export function resetSubscriptionMock() {
    state = initialState();
}
