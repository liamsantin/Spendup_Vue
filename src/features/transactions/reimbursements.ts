/** Liens facture ↔ remboursement d'une transaction (miroir des contrats de l'API). */

export type ReimbursementLink = {
    invoicePublicId: string;
    invoiceLabel: string;
    reimbursementPublicId: string;
    reimbursementLabel: string;
    reimbursementDate: string;
    amount: number;
};

/** Comme facture : `reimbursed` et `net` (à charge). Comme remboursement : `allocated` et `remaining` (à relier). */
export type TransactionReimbursements = {
    publicId: string;
    totalAmount: number;
    reimbursed: number;
    net: number;
    allocated: number;
    remaining: number;
    reimbursements: ReimbursementLink[];
    invoices: ReimbursementLink[];
};

export type ReimbursementCandidate = {
    publicId: string;
    label: string;
    date: string;
    totalAmount: number;
    remaining: number;
    /** `sameTier`, `sameAmount`. */
    reasons: string[];
};

export type LinkReimbursementPayload = {
    invoicePublicId: string;
    amount: number;
};

/** Part à relier d'une candidate : le plus petit de ce qui reste du remboursement et de la facture. */
export function suggestedLinkAmount(reimbursementRemaining: number, candidate: Pick<ReimbursementCandidate, 'remaining'>): number {
    return Math.max(0, Math.min(reimbursementRemaining, candidate.remaining));
}
