import type { TaxIdentity, TaxStatus } from '@/features/tax/types';

export const emptyIdentity = (): TaxIdentity => ({
    officialName: null,
    firstName: null,
    vn: null,
    municipality: null,
    job: null
});

/** Identité prête à envoyer : champs rognés, vides ramenés à `null`. */
export function cleanIdentity(identity: TaxIdentity): TaxIdentity {
    return {
        officialName: identity.officialName?.trim() || null,
        firstName: identity.firstName?.trim() || null,
        vn: identity.vn?.trim() || null,
        municipality: identity.municipality?.trim() || null,
        job: identity.job?.trim() || null
    };
}

/** En-tête de la déclaration tel qu'il se modifie à l'écran (texte, pas de `null`). */
export interface TaxHeaderState {
    name: string;
    canton: string;
    couple: boolean;
    status: TaxStatus;
    taxpayerNumber: string;
    notes: string;
    person1: TaxIdentity;
    person2: TaxIdentity;
}

export function emptyHeader(): TaxHeaderState {
    return {
        name: '',
        canton: 'VD',
        couple: false,
        status: 'enCours',
        taxpayerNumber: '',
        notes: '',
        person1: emptyIdentity(),
        person2: emptyIdentity()
    };
}
