/**
 * Prêts entre personnes — contrat API `/api/personal-loans` (voir `docs/features/personal-loans/contract.md`).
 * La contrepartie est un tier (quelqu’un hors Spend.Up) ; pour un ami Spend.Up → dettes partagées.
 * `pret` = je prête (créance), `emprunt` = j’emprunte (passif). Statut dérivé du restant comme les passifs.
 */

export type LoanDirection = 'pret' | 'emprunt';

export type LoanStatus = 'active' | 'rembourse' | 'annule';

export type PersonalLoanCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type PersonalLoan = {
    publicId: string;
    direction: LoanDirection;
    /** Tier contrepartie (rôle `emprunteur` ou `preteur` posé par l’API). */
    counterpartTierPublicId: string | null;
    counterpartName: string | null;
    label: string | null;
    initialAmount: number;
    remainingAmount: number;
    /** `initialAmount` − `remainingAmount`. */
    repaidAmount: number;
    /** 0–100, calculé par l’API. */
    percentRepaid: number;
    currency: PersonalLoanCurrency;
    /** Date civile `yyyy-MM-dd`. */
    startDate: string | null;
    plannedEndDate: string | null;
    status: LoanStatus;
    /** Actif et `plannedEndDate` dépassée (fuseau des paramètres). */
    isOverdue: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type PersonalLoansListResult = {
    items: PersonalLoan[];
    totalCount: number;
    /** Somme des restants des prêts actifs `pret`, en devise de base. */
    totalLent: number;
    /** Somme des restants des prêts actifs `emprunt`, en devise de base. */
    totalBorrowed: number;
    currency: PersonalLoanCurrency | null;
};

export type ListPersonalLoansQuery = {
    status?: LoanStatus;
    direction?: LoanDirection;
};

export type CreatePersonalLoanPayload = {
    direction: LoanDirection;
    counterpartTierPublicId: string;
    initialAmount: number;
    startDate: string;
    label: string | null;
    /** `null` = égal au montant initial. */
    remainingAmount: number | null;
    plannedEndDate: string | null;
    /** `null` = devise des paramètres. */
    currency: PersonalLoanCurrency | null;
    notes: string | null;
};

export type UpdatePersonalLoanPayload = {
    /** Modifiable seulement sur un prêt `active` (400 sinon). */
    direction: LoanDirection;
    /** Modifiable seulement sur un prêt `active` (400 sinon). */
    counterpartTierPublicId: string;
    label: string | null;
    initialAmount: number;
    remainingAmount: number;
    startDate: string;
    plannedEndDate: string | null;
    /** Figée à la création : renvoyer la devise stockée. */
    currency: PersonalLoanCurrency;
    /** `'annule'` colle ensuite ; `null` = le serveur dérive le statut du restant. */
    status: 'annule' | null;
    notes: string | null;
};

export const LOAN_DIRECTIONS: LoanDirection[] = ['pret', 'emprunt'];

export const LOAN_STATUSES: LoanStatus[] = ['active', 'rembourse', 'annule'];

export const PERSONAL_LOAN_CURRENCIES: PersonalLoanCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const PERSONAL_LOAN_LABEL_MAX = 150;

/** Borne UI des notes (pas de règle serveur documentée). */
export const PERSONAL_LOAN_NOTES_MAX = 2000;

export const PERSONAL_LOAN_NOT_FOUND_MESSAGE = 'Prêt introuvable.';
