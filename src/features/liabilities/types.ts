/**
 * Passifs — contrat API `/api/liabilities` (voir `docs/features/liabilities/contract.md`).
 * Un passif = une dette envers un prêteur (tier) : crédit, hypothèque, dette personnelle, carte de crédit…
 * Le statut est dérivé du restant (`rembourse` à zéro), sauf `annule` posé explicitement et qui colle.
 */

export type LiabilityType = 'credit' | 'hypotheque' | 'dettePersonnelle' | 'carteCredit' | 'other';

export type LiabilityStatus = 'active' | 'rembourse' | 'annule';

export type LiabilityCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type Liability = {
    publicId: string;
    name: string;
    type: LiabilityType;
    /** Tier prêteur (rôle `banque` ou `preteur` posé par l’API). */
    lenderTierPublicId: string | null;
    lenderTierName: string | null;
    /** Actif possédé financé par ce passif (hypothèque → bien, leasing → véhicule). */
    assetPublicId: string | null;
    initialAmount: number;
    remainingAmount: number;
    /** `initialAmount` − `remainingAmount`. */
    repaidAmount: number;
    /** 0–100, calculé par l’API. */
    percentRepaid: number;
    currency: LiabilityCurrency;
    /** Taux annuel en pourcent, 0–100. */
    interestRate: number | null;
    /** Date civile `yyyy-MM-dd`. */
    startDate: string | null;
    plannedEndDate: string | null;
    status: LiabilityStatus;
    createdAt: string;
    updatedAt: string | null;
};

export type LiabilitiesListResult = {
    items: Liability[];
    totalCount: number;
};

export type ListLiabilitiesQuery = {
    type?: LiabilityType;
    status?: LiabilityStatus;
};

export type CreateLiabilityPayload = {
    name: string;
    type: LiabilityType;
    initialAmount: number;
    /** `null` = égal au montant initial. */
    remainingAmount: number | null;
    /** `null` = devise des paramètres. */
    currency: LiabilityCurrency | null;
    interestRate: number | null;
    startDate: string | null;
    plannedEndDate: string | null;
    lenderTierPublicId: string | null;
    assetPublicId: string | null;
};

export type UpdateLiabilityPayload = {
    name: string;
    type: LiabilityType;
    initialAmount: number;
    remainingAmount: number;
    /** Figée à la création : renvoyer la devise stockée. */
    currency: LiabilityCurrency;
    interestRate: number | null;
    startDate: string | null;
    plannedEndDate: string | null;
    lenderTierPublicId: string | null;
    assetPublicId: string | null;
    /** `'annule'` colle ensuite ; `null` = le serveur dérive le statut du restant. */
    status: 'annule' | null;
};

export type SetRemainingAmountPayload = {
    remainingAmount: number;
};

export const LIABILITY_TYPES: LiabilityType[] = ['credit', 'hypotheque', 'dettePersonnelle', 'carteCredit', 'other'];

export const LIABILITY_STATUSES: LiabilityStatus[] = ['active', 'rembourse', 'annule'];

export const LIABILITY_CURRENCIES: LiabilityCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const LIABILITY_NAME_MAX = 150;

export const LIABILITY_NOT_FOUND_MESSAGE = 'Passif introuvable.';
