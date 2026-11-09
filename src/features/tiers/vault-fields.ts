/**
 * Champs du périmètre étendu d’un tiers (`tier.email`, `phone`, `website`, `notes` ; `tier_person.first_name`,
 * `name` ; `tier_company.vat_number`, `company_registration_number`) : déchiffrés à la lecture, chiffrés à
 * l’envoi quand le Coffre est ouvert et que l’offre le permet. Le store du Coffre décide seul du périmètre
 * (catalogue + `allowedScope`) : ici, on ne fait que nommer les colonnes.
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import type { Tier, TierWritePayload } from '@/features/tiers/types';

export const TIER_VAULT_TABLE = 'tier';
export const TIER_PERSON_VAULT_TABLE = 'tier_person';
export const TIER_COMPANY_VAULT_TABLE = 'tier_company';

export const TIER_VAULT_COLUMNS = { email: 'email', phone: 'phone', website: 'website', notes: 'notes' } as const;
export const TIER_PERSON_VAULT_COLUMNS = { firstName: 'first_name', lastName: 'name' } as const;
export const TIER_COMPANY_VAULT_COLUMNS = { vatNumber: 'vat_number', companyRegistrationNumber: 'company_registration_number' } as const;

type TierField = { table: string; column: string; get: (tier: TierWritePayload) => string | null | undefined };

/** Toutes les colonnes chiffrables d’un tiers, dans l’ordre du catalogue. */
const TIER_FIELDS: readonly TierField[] = [
    { table: TIER_VAULT_TABLE, column: TIER_VAULT_COLUMNS.email, get: (t) => t.email },
    { table: TIER_VAULT_TABLE, column: TIER_VAULT_COLUMNS.phone, get: (t) => t.phone },
    { table: TIER_VAULT_TABLE, column: TIER_VAULT_COLUMNS.website, get: (t) => t.website },
    { table: TIER_VAULT_TABLE, column: TIER_VAULT_COLUMNS.notes, get: (t) => t.notes },
    { table: TIER_PERSON_VAULT_TABLE, column: TIER_PERSON_VAULT_COLUMNS.firstName, get: (t) => t.person?.firstName },
    { table: TIER_PERSON_VAULT_TABLE, column: TIER_PERSON_VAULT_COLUMNS.lastName, get: (t) => t.person?.lastName },
    { table: TIER_COMPANY_VAULT_TABLE, column: TIER_COMPANY_VAULT_COLUMNS.vatNumber, get: (t) => t.company?.vatNumber },
    {
        table: TIER_COMPANY_VAULT_TABLE,
        column: TIER_COMPANY_VAULT_COLUMNS.companyRegistrationNumber,
        get: (t) => t.company?.companyRegistrationNumber
    }
];

function isPlain(value: string | null | undefined): value is string {
    return typeof value === 'string' && value !== '' && !isCipher(value);
}

/**
 * Remplace les chiffrés lisibles par leur clair ; un chiffré illisible reste tel quel (« 🔒 illisible »).
 * @param tier Tiers tel que renvoyé par l’API.
 */
export async function decryptTierFields(tier: Tier): Promise<Tier> {
    const hasCipher =
        isCipher(tier.email) ||
        isCipher(tier.phone) ||
        isCipher(tier.website) ||
        isCipher(tier.notes) ||
        isCipher(tier.person?.firstName) ||
        isCipher(tier.person?.lastName) ||
        isCipher(tier.company?.vatNumber) ||
        isCipher(tier.company?.companyRegistrationNumber);
    if (!hasCipher) return tier;
    const vault = useVaultStore();
    const read = async (table: string, column: string, value: string | null | undefined): Promise<string | null> => {
        if (!isCipher(value)) return value ?? null;
        const result = await vault.decrypt(table, column, tier.publicId, value);
        return result.ok ? result.value : value;
    };
    const [email, phone, website, notes] = await Promise.all([
        read(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.email, tier.email),
        read(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.phone, tier.phone),
        read(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.website, tier.website),
        read(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.notes, tier.notes)
    ]);
    const next: Tier = { ...tier, email, phone, website, notes };
    if (tier.person) {
        const [firstName, lastName] = await Promise.all([
            read(TIER_PERSON_VAULT_TABLE, TIER_PERSON_VAULT_COLUMNS.firstName, tier.person.firstName),
            read(TIER_PERSON_VAULT_TABLE, TIER_PERSON_VAULT_COLUMNS.lastName, tier.person.lastName)
        ]);
        next.person = { ...tier.person, firstName, lastName };
    }
    if (tier.company) {
        const [vatNumber, companyRegistrationNumber] = await Promise.all([
            read(TIER_COMPANY_VAULT_TABLE, TIER_COMPANY_VAULT_COLUMNS.vatNumber, tier.company.vatNumber),
            read(TIER_COMPANY_VAULT_TABLE, TIER_COMPANY_VAULT_COLUMNS.companyRegistrationNumber, tier.company.companyRegistrationNumber)
        ]);
        next.company = { ...tier.company, vatNumber, companyRegistrationNumber };
    }
    return next;
}

/**
 * Vrai si le payload porte au moins une valeur en clair que le Coffre chiffrerait (périmètre ouvert).
 * Sert à décider le double appel POST puis PUT à la création.
 * @param payload Payload en clair.
 */
export async function needsTierVaultWrite(payload: TierWritePayload): Promise<boolean> {
    const vault = useVaultStore();
    for (const field of TIER_FIELDS) {
        if (isPlain(field.get(payload)) && (await vault.canEncrypt(field.table, field.column))) return true;
    }
    return false;
}

/** Payload de création sans les champs chiffrables : ils sont posés par un PUT une fois le `publicId` connu. */
export function stripSensitiveTierFields(payload: TierWritePayload): TierWritePayload {
    return {
        ...payload,
        email: null,
        phone: null,
        website: null,
        notes: null,
        person: payload.person ? { ...payload.person, firstName: null, lastName: null } : null,
        company: payload.company ? { ...payload.company, vatNumber: null, companyRegistrationNumber: null } : null
    };
}

/**
 * Chiffre les champs du périmètre étendu d’un payload pour un tiers connu. Un champ hors périmètre,
 * vide ou déjà chiffré est laissé tel quel.
 * @param publicId Identifiant public du tiers (AAD).
 * @param payload Payload en clair.
 */
export async function encryptTierPayload(publicId: string, payload: TierWritePayload): Promise<TierWritePayload> {
    const vault = useVaultStore();
    if (!(await vault.canEncryptScope('extended'))) return payload;
    const seal = (table: string, column: string, value: string | null | undefined) =>
        isPlain(value) ? vault.encrypt(table, column, publicId, value) : Promise.resolve(value ?? null);
    const [email, phone, website, notes] = await Promise.all([
        seal(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.email, payload.email),
        seal(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.phone, payload.phone),
        seal(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.website, payload.website),
        seal(TIER_VAULT_TABLE, TIER_VAULT_COLUMNS.notes, payload.notes)
    ]);
    const next: TierWritePayload = { ...payload, email, phone, website, notes };
    if (payload.person) {
        const [firstName, lastName] = await Promise.all([
            seal(TIER_PERSON_VAULT_TABLE, TIER_PERSON_VAULT_COLUMNS.firstName, payload.person.firstName),
            seal(TIER_PERSON_VAULT_TABLE, TIER_PERSON_VAULT_COLUMNS.lastName, payload.person.lastName)
        ]);
        next.person = { ...payload.person, firstName, lastName };
    }
    if (payload.company) {
        const [vatNumber, companyRegistrationNumber] = await Promise.all([
            seal(TIER_COMPANY_VAULT_TABLE, TIER_COMPANY_VAULT_COLUMNS.vatNumber, payload.company.vatNumber),
            seal(TIER_COMPANY_VAULT_TABLE, TIER_COMPANY_VAULT_COLUMNS.companyRegistrationNumber, payload.company.companyRegistrationNumber)
        ]);
        next.company = { ...payload.company, vatNumber, companyRegistrationNumber };
    }
    return next;
}
