/** Agrégat `{ type, count, total }` renvoyé par `GET /api/net-worth` (comptes, actifs, passifs par type). */
export type NetWorthBucket = {
    /** Type métier en camelCase (`epargne`, `vehicule`, `hypotheque`, `pretAccorde`, `compteCredit`, …). */
    type: string;
    count: number;
    /** Toujours positif, en devise de base ; les passifs sont affichés en négatif côté UI. */
    total: number;
};

/** Éléments dans une autre devise que la devise de base : comptés ici, jamais sommés. */
export type NetWorthExcluded = {
    currency: string;
    accountsCount: number;
    assetsCount: number;
    liabilitiesCount: number;
};

export type NetWorthFriendsBalance = {
    /** Ce que les amis me doivent. */
    receivable: number;
    /** Ce que je dois aux amis. */
    payable: number;
};

/** Dernier snapshot persisté ; `delta` = calcul courant − snapshot. */
export type NetWorthLastSnapshot = {
    periode: string;
    netWorth: number;
    delta: number;
};

/** Calcul du jour (`GET /api/net-worth`). `netWorth = totalAccounts + totalAssets − totalLiabilities`. */
export type NetWorthOverview = {
    currency: string;
    /** `yyyy-MM-dd` dans le fuseau des settings. */
    asOf: string;
    totalAccounts: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    /** Part titres des comptes `investissement` / `crypto` (déjà incluse dans `totalAccounts`). */
    investments: number;
    /** Positions comptées au PRU faute de cours. */
    investmentsWithoutQuote: number;
    accountsByType: NetWorthBucket[];
    assetsByType: NetWorthBucket[];
    liabilitiesByType: NetWorthBucket[];
    friendsBalance: NetWorthFriendsBalance;
    excluded: NetWorthExcluded[];
    lastSnapshot: NetWorthLastSnapshot | null;
};

/** Snapshot mensuel (`periode` = 1er du mois). `savingsRate` en %, `null` sans revenu. */
export type NetWorthSnapshot = {
    periode: string;
    totalAccounts: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number | null;
    currency: string;
    computedAt: string;
};

/** `from` / `to` en `yyyy-MM-dd` ; 12 derniers mois par défaut, 60 au plus. */
export type ListSnapshotsQuery = {
    from?: string;
    to?: string;
};

/** L’API peut renvoyer un tableau nu ou `{ items }` : `normalizeSnapshotsResult` aplatit les deux. */
export type SnapshotsListResult = NetWorthSnapshot[] | { items: NetWorthSnapshot[] };

/** Point de la courbe d’évolution : snapshots mensuels + point courant (`isCurrent`). */
export type NetWorthEvolutionPoint = {
    periode: string;
    netWorth: number;
    isCurrent: boolean;
};

export const NET_WORTH_SNAPSHOTS_MAX_MONTHS = 60;
