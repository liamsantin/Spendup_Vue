export type TierNature = 'person' | 'company' | 'organization' | 'administration' | 'unknown';

export type TierRole =
    | 'contactPersonnel'
    | 'banque'
    | 'assurance'
    | 'employeur'
    | 'bailleur'
    | 'service'
    | 'fournisseur'
    | 'administration'
    | 'medecin'
    | 'preteur'
    | 'emprunteur'
    | 'other';

export type TierPersonPayload = {
    firstName: string | null;
    lastName: string | null;
    /** Date calendaire `yyyy-MM-dd`, jamais dans le futur. */
    birthDate: string | null;
};

export type TierCompanyPayload = {
    legalName: string | null;
    vatNumber: string | null;
    companyRegistrationNumber: string | null;
};

export type TierOrganizationPayload = {
    officialName: string | null;
    organizationType: string | null;
};

export type Tier = {
    publicId: string;
    name: string;
    nature: TierNature;
    /** Stocké en minuscules côté serveur. */
    email: string | null;
    phone: string | null;
    /** Toujours une URL absolue `https://…` ou `http://…` en réponse. */
    website: string | null;
    notes: string | null;
    /** Ordre stable (ordre de l’énumération). */
    roles: TierRole[];
    person: TierPersonPayload | null;
    company: TierCompanyPayload | null;
    organization: TierOrganizationPayload | null;
    createdAt: string;
    updatedAt: string | null;
};

export type TierList = {
    items: Tier[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListTiersQuery = {
    nature?: TierNature;
    role?: TierRole;
    search?: string;
    page?: number;
    pageSize?: number;
};

/** Corps POST / PUT — état complet du tier. */
export type TierWritePayload = {
    name: string;
    nature: TierNature;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    roles: TierRole[];
    person: TierPersonPayload | null;
    company: TierCompanyPayload | null;
    organization: TierOrganizationPayload | null;
};

export type CreateTierPayload = TierWritePayload;
export type UpdateTierPayload = TierWritePayload;

export const TIER_NATURES: TierNature[] = ['person', 'company', 'organization', 'administration', 'unknown'];

export const TIER_ROLES: TierRole[] = [
    'contactPersonnel',
    'banque',
    'assurance',
    'employeur',
    'bailleur',
    'service',
    'fournisseur',
    'administration',
    'medecin',
    'preteur',
    'emprunteur',
    'other'
];

/** Natures qui portent un volet (objet toujours présent en réponse). */
export const TIER_NATURES_WITH_PANEL: TierNature[] = ['person', 'company', 'organization'];

export const TIER_NAME_MAX = 200;
export const TIER_EMAIL_MAX = 180;
export const TIER_PHONE_MAX = 50;
export const TIER_NOTES_MAX = 4000;
export const TIER_SEARCH_MAX = 100;
export const TIER_PERSON_NAME_MAX = 100;
export const TIER_COMPANY_LEGAL_NAME_MAX = 200;
export const TIER_COMPANY_IDENTIFIER_MAX = 100;
export const TIER_ORGANIZATION_NAME_MAX = 200;
export const TIER_ORGANIZATION_TYPE_MAX = 100;

export const TIER_PAGE_SIZE_DEFAULT = 50;
export const TIER_PAGE_SIZE_MAX = 200;
