import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

/**
 * Provision d'impôt mensuelle (`GET /api/tax-returns/provision`) : une estimation fondée sur la dernière décision de taxation,
 * ou sur un montant annuel saisi. L'application ne calcule aucun impôt.
 */
export type TaxProvisionSource = 'decision' | 'saisie' | 'none';

export interface TaxProvision {
    source: TaxProvisionSource;
    /** Année fiscale de la décision retenue (absente pour une saisie). */
    referenceYear: number | null;
    returnPublicId: string | null;
    annualAmount: number | null;
    monthlyAmount: number | null;
    paid: number;
    remaining: number;
    /** Montant annuel saisi par la personne, même si une décision existe. */
    reference: number | null;
    currency: string;
}

export const taxProvisionApi = {
    get() {
        return fetchWrapper.get('/api/tax-returns/provision') as Promise<TaxProvision>;
    },
    /** `null` efface le montant saisi. */
    setReference(amount: number | null) {
        return fetchWrapper.put('/api/tax-returns/provision/reference', { amount }) as Promise<TaxProvision>;
    }
};

/** Y a-t-il une base à afficher ? (`none` : ni décision ni saisie.) */
export function hasProvision(provision: TaxProvision | null | undefined): provision is TaxProvision {
    return !!provision && provision.source !== 'none' && provision.monthlyAmount !== null;
}

/** Part de l'année déjà payée (0 à 1), pour la barre d'avancement ; 0 sans base. */
export function paidShare(provision: TaxProvision): number {
    if (!provision.annualAmount || provision.annualAmount <= 0) return 0;
    return Math.min(1, Math.max(0, provision.paid / provision.annualAmount));
}
