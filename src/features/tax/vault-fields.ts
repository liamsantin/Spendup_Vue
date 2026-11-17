/**
 * Champs du Coffre d’une déclaration (`tax_return`) : n° AVS et n° de contribuable (socle), noms, prénoms et notes
 * (étendu). Déchiffrés à la lecture, chiffrés à l’envoi quand le Coffre est ouvert et que l’offre le permet ; le store
 * du Coffre décide seul du périmètre. Un chiffré illisible reste tel quel (« 🔒 Illisible ») et repart inchangé.
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import { generatePublicId } from '@/features/vault/public-id';
import type { TaxIdentity, TaxReturn, UpdateTaxReturnPayload } from '@/features/tax/types';

export const TAX_VAULT_TABLE = 'tax_return';

/** Colonnes SQL des champs chiffrables, par personne. */
const PERSON_COLUMNS = {
    1: { officialName: 'official_name', firstName: 'first_name', vn: 'vn' },
    2: { officialName: 'partner_official_name', firstName: 'partner_first_name', vn: 'partner_vn' }
} as const;

type VaultIdentityKey = 'officialName' | 'firstName' | 'vn';
const IDENTITY_KEYS: readonly VaultIdentityKey[] = ['officialName', 'firstName', 'vn'];

/** Champs du Coffre rechiffrés pour le dossier de l’année suivante (`POST …/next-year`). */
export interface TaxVaultFields {
    taxpayerNumber: string | null;
    person1: Pick<TaxIdentity, VaultIdentityKey> | null;
    person2: Pick<TaxIdentity, VaultIdentityKey> | null;
}

function hasCipher(tax: Pick<TaxReturn, 'taxpayerNumber' | 'notes' | 'person1' | 'person2'>): boolean {
    const people = [tax.person1, tax.person2].filter((p): p is TaxIdentity => p != null);
    return isCipher(tax.taxpayerNumber) || isCipher(tax.notes) || people.some((p) => IDENTITY_KEYS.some((key) => isCipher(p[key])));
}

function hasPlain(values: (string | null | undefined)[]): boolean {
    return values.some((value) => typeof value === 'string' && value !== '' && !isCipher(value));
}

/**
 * Remplace les chiffrés lisibles par leur clair. Sans aucun chiffré, renvoie la déclaration telle quelle (sans toucher
 * au Coffre).
 * @param tax Déclaration telle que renvoyée par l’API.
 */
export async function decryptTaxReturn(tax: TaxReturn): Promise<TaxReturn> {
    if (!hasCipher(tax)) return tax;
    const vault = useVaultStore();
    const read = async (column: string, value: string | null): Promise<string | null> => {
        if (!isCipher(value)) return value;
        const result = await vault.decrypt(TAX_VAULT_TABLE, column, tax.publicId, value);
        return result.ok ? result.value : value;
    };
    const person = async (identity: TaxIdentity | null, which: 1 | 2): Promise<TaxIdentity | null> => {
        if (!identity) return identity;
        const columns = PERSON_COLUMNS[which];
        const [officialName, firstName, vn] = await Promise.all([
            read(columns.officialName, identity.officialName),
            read(columns.firstName, identity.firstName),
            read(columns.vn, identity.vn)
        ]);
        return { ...identity, officialName, firstName, vn };
    };
    const [taxpayerNumber, notes, person1, person2] = await Promise.all([
        read('taxpayer_number', tax.taxpayerNumber),
        read('notes', tax.notes),
        person(tax.person1, 1),
        person(tax.person2, 2)
    ]);
    return { ...tax, taxpayerNumber, notes, person1: person1 ?? tax.person1, person2 };
}

/** Comme {@link decryptTaxReturn}, pour une réponse de création. */
export async function decryptCreated<T extends { declaration: TaxReturn }>(created: T): Promise<T> {
    return { ...created, declaration: await decryptTaxReturn(created.declaration) };
}

async function sealIdentity(publicId: string, identity: TaxIdentity, which: 1 | 2): Promise<TaxIdentity> {
    const vault = useVaultStore();
    const columns = PERSON_COLUMNS[which];
    const [officialName, firstName, vn] = await Promise.all([
        vault.encrypt(TAX_VAULT_TABLE, columns.officialName, publicId, identity.officialName),
        vault.encrypt(TAX_VAULT_TABLE, columns.firstName, publicId, identity.firstName),
        vault.encrypt(TAX_VAULT_TABLE, columns.vn, publicId, identity.vn)
    ]);
    return { ...identity, officialName, firstName, vn };
}

function vaultValues(payload: Pick<UpdateTaxReturnPayload, 'taxpayerNumber' | 'notes' | 'person1' | 'person2'>): (string | null)[] {
    const people = [payload.person1, payload.person2].filter((p): p is TaxIdentity => p != null);
    return [payload.taxpayerNumber, payload.notes, ...people.flatMap((p) => IDENTITY_KEYS.map((key) => p[key]))];
}

/**
 * Chiffre les champs du Coffre d’un en-tête avant `PUT /api/tax-returns/{id}`. Champ vide, déjà chiffré ou hors
 * périmètre : laissé tel quel.
 * @param publicId Identifiant public de la déclaration (AAD).
 * @param payload En-tête en clair.
 */
export async function encryptTaxUpdate(publicId: string, payload: UpdateTaxReturnPayload): Promise<UpdateTaxReturnPayload> {
    if (!hasPlain(vaultValues(payload))) return payload;
    const vault = useVaultStore();
    const [taxpayerNumber, notes, person1, person2] = await Promise.all([
        vault.encrypt(TAX_VAULT_TABLE, 'taxpayer_number', publicId, payload.taxpayerNumber),
        vault.encrypt(TAX_VAULT_TABLE, 'notes', publicId, payload.notes),
        sealIdentity(publicId, payload.person1, 1),
        payload.person2 ? sealIdentity(publicId, payload.person2, 2) : Promise.resolve(null)
    ]);
    return { ...payload, taxpayerNumber, notes, person1, person2 };
}

/**
 * Prépare « Créer N+1 » : un chiffré est lié à l’identifiant de son dossier, l’API ne le recopie pas. Quand le
 * Coffre chiffre au moins un champ, on tire l’identifiant du nouveau dossier et on y rechiffre les champs lisibles
 * de la déclaration d’origine (déjà déchiffrée). Sinon `null` : l’API recopie le clair et laisse vide le chiffré.
 * @param source Déclaration d’origine, déchiffrée.
 */
export async function sealForNextYear(source: TaxReturn): Promise<{ publicId: string; vaultFields: TaxVaultFields } | null> {
    if (!hasPlain(vaultValues({ ...source, notes: null }))) return null;
    const publicId = generatePublicId();
    const vault = useVaultStore();
    const pick = (identity: TaxIdentity): Pick<TaxIdentity, VaultIdentityKey> => ({
        officialName: identity.officialName,
        firstName: identity.firstName,
        vn: identity.vn
    });
    const plainOnly = (value: string | null) => (isCipher(value) ? null : value);
    const [taxpayerNumber, person1, person2] = await Promise.all([
        vault.encrypt(TAX_VAULT_TABLE, 'taxpayer_number', publicId, plainOnly(source.taxpayerNumber)),
        sealIdentity(
            publicId,
            {
                ...source.person1,
                officialName: plainOnly(source.person1.officialName),
                firstName: plainOnly(source.person1.firstName),
                vn: plainOnly(source.person1.vn)
            },
            1
        ),
        source.person2
            ? sealIdentity(
                  publicId,
                  {
                      ...source.person2,
                      officialName: plainOnly(source.person2.officialName),
                      firstName: plainOnly(source.person2.firstName),
                      vn: plainOnly(source.person2.vn)
                  },
                  2
              )
            : Promise.resolve(null)
    ]);
    const fields: TaxVaultFields = { taxpayerNumber, person1: pick(person1), person2: person2 ? pick(person2) : null };
    const sealedSomething = [
        fields.taxpayerNumber,
        ...[fields.person1, fields.person2].flatMap((p) => (p ? IDENTITY_KEYS.map((k) => p[k]) : []))
    ].some((value) => isCipher(value));
    return sealedSomething ? { publicId, vaultFields: fields } : null;
}
