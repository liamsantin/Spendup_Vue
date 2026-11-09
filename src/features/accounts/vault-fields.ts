/**
 * Champs du socle d’un compte (`iban`, `account_number`) : déchiffrés à la lecture, chiffrés à l’envoi
 * quand le Coffre est ouvert et que le compte appartient à l’utilisateur. Coffre absent ou verrouillé :
 * tout passe en clair, comme avant.
 */
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { isCipher } from '@/features/vault/crypto';
import type { Account, CreateAccountPayload, UpdateAccountPayload } from '@/features/accounts/types';

export const ACCOUNT_VAULT_TABLE = 'account';
export const ACCOUNT_VAULT_COLUMNS = { iban: 'iban', accountNumber: 'account_number' } as const;

/**
 * Remplace les chiffrés lisibles par leur clair. Un chiffré illisible (ou étranger : compte partagé par
 * un ami) reste tel quel ; l’UI l’affiche « 🔒 illisible » / « 🔒 chiffré par le propriétaire ».
 * @param account Compte tel que renvoyé par l’API.
 */
export async function decryptAccountFields(account: Account): Promise<Account> {
    if (!isCipher(account.iban) && !isCipher(account.accountNumber)) return account;
    if (!account.isOwned) return account;
    const vault = useVaultStore();
    const next = { ...account };
    if (isCipher(account.iban)) {
        const result = await vault.decrypt(ACCOUNT_VAULT_TABLE, ACCOUNT_VAULT_COLUMNS.iban, account.publicId, account.iban);
        if (result.ok) next.iban = result.value;
    }
    if (isCipher(account.accountNumber)) {
        const result = await vault.decrypt(
            ACCOUNT_VAULT_TABLE,
            ACCOUNT_VAULT_COLUMNS.accountNumber,
            account.publicId,
            account.accountNumber
        );
        if (result.ok) next.accountNumber = result.value;
    }
    return next;
}

/** Vrai si le Coffre est ouvert : les champs du socle doivent partir chiffrés. */
export async function isVaultActiveForWrites(): Promise<boolean> {
    return (await useVaultStore().ensureReady()) != null;
}

/**
 * Chiffre `iban` / `accountNumber` d’un payload pour une ligne connue, avec l’empreinte d’IBAN.
 * Un champ déjà chiffré, vide ou absent est laissé tel quel.
 * @param publicId Identifiant public du compte (AAD).
 * @param payload Payload en clair.
 */
export async function encryptAccountPayload<
    T extends Pick<UpdateAccountPayload, 'iban' | 'accountNumber'> & { ibanFingerprint?: string | null }
>(publicId: string, payload: T): Promise<T & { ibanFingerprint?: string | null }> {
    const vault = useVaultStore();
    if (!(await vault.ensureReady())) return payload;
    const next: T & { ibanFingerprint?: string | null } = { ...payload };
    if (typeof payload.iban === 'string' && payload.iban && !isCipher(payload.iban)) {
        next.ibanFingerprint = await vault.fingerprint(payload.iban);
        next.iban = await vault.encrypt(ACCOUNT_VAULT_TABLE, ACCOUNT_VAULT_COLUMNS.iban, publicId, payload.iban);
    }
    if (typeof payload.accountNumber === 'string' && payload.accountNumber && !isCipher(payload.accountNumber)) {
        next.accountNumber = await vault.encrypt(ACCOUNT_VAULT_TABLE, ACCOUNT_VAULT_COLUMNS.accountNumber, publicId, payload.accountNumber);
    }
    return next;
}

/** Vrai si le payload de création porte une valeur du socle à chiffrer. */
export function hasSensitiveCreateFields(payload: CreateAccountPayload): boolean {
    return !!(payload.iban && !isCipher(payload.iban)) || !!(payload.accountNumber && !isCipher(payload.accountNumber));
}

/**
 * Payload PUT « état complet » reconstruit depuis le compte créé, pour poser les champs chiffrés juste
 * après un POST (l’AAD a besoin du `publicId`, que seul le serveur attribue).
 * @param created Compte renvoyé par le POST.
 * @param payload Payload de création en clair.
 */
export function buildPostCreateUpdatePayload(created: Account, payload: CreateAccountPayload): UpdateAccountPayload {
    return {
        name: created.name,
        type: created.type,
        currency: created.currency,
        initialBalance: created.initialBalance ?? payload.initialBalance,
        iban: payload.iban ?? null,
        accountNumber: payload.accountNumber ?? null,
        color: created.color,
        isPrimary: created.isPrimary,
        ...(created.bank?.tierPublicId ? { institutionTierPublicId: created.bank.tierPublicId } : { institutionTierPublicId: null })
    };
}
