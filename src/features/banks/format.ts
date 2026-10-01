import { normalizeIban } from '@/features/accounts/format';
import { BANK_RESOLVABLE_IBAN_COUNTRIES, BANK_RESOLVABLE_IBAN_LENGTH, type Bank, type BankChoice } from '@/features/banks/types';
import type { Tier } from '@/features/tiers/types';

/** BIC : 8 ou 11 caractères (ex. `UBSWCHZH80A`). */
export function normalizeBic(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

export function isValidBic(value: string | null | undefined): boolean {
    return /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(normalizeBic(value));
}

/** IID : 1 à 5 chiffres. */
export function normalizeIid(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '');
}

export function isValidIid(value: string | null | undefined): boolean {
    return /^\d{1,5}$/.test(normalizeIid(value));
}

/** IBAN CH / LI complet : on peut appeler `/api/banks/resolve`. */
export function isResolvableIban(value: string | null | undefined): boolean {
    const iban = normalizeIban(value);
    if (iban.length !== BANK_RESOLVABLE_IBAN_LENGTH) return false;
    return (BANK_RESOLVABLE_IBAN_COUNTRIES as readonly string[]).includes(iban.slice(0, 2));
}

export function bankChoiceFromTier(tier: Pick<Tier, 'publicId' | 'name' | 'bank'>): BankChoice {
    return {
        kind: 'tier',
        tierPublicId: tier.publicId,
        name: tier.name,
        bankPublicId: tier.bank?.bankPublicId ?? null,
        bankName: tier.bank?.bankName ?? null
    };
}

export function bankChoiceFromRegistry(bank: Pick<Bank, 'publicId' | 'name'>): BankChoice {
    return { kind: 'registry', bankPublicId: bank.publicId, name: bank.name };
}

/** Établissement du référentiel derrière un choix (`null` = banque hors référentiel). */
export function bankChoiceRegistryId(choice: BankChoice | null | undefined): string | null {
    if (!choice) return null;
    return choice.bankPublicId ?? null;
}

/**
 * Choix à proposer pour un établissement : mon tier banque s’il existe déjà
 * (même `bank.bankPublicId`), sinon l’établissement du référentiel.
 */
export function preferredBankChoice(bank: Pick<Bank, 'publicId' | 'name'>, myBanks: readonly Tier[]): BankChoice {
    const mine = myBanks.find((tier) => tier.bank?.bankPublicId === bank.publicId);
    return mine ? bankChoiceFromTier(mine) : bankChoiceFromRegistry(bank);
}

/** Retire du référentiel les établissements déjà présents dans « Mes banques ». */
export function dedupeRegistryBanks(registry: readonly Bank[], myBanks: readonly Tier[]): Bank[] {
    const mine = new Set(myBanks.map((tier) => tier.bank?.bankPublicId).filter((id): id is string => !!id));
    return registry.filter((bank) => !mine.has(bank.publicId));
}

export function sameBankChoice(a: BankChoice | null | undefined, b: BankChoice | null | undefined): boolean {
    if (!a || !b) return !a && !b;
    if (a.kind === 'tier' && b.kind === 'tier') return a.tierPublicId === b.tierPublicId;
    if (a.kind === 'registry' && b.kind === 'registry') return a.bankPublicId === b.bankPublicId;
    return false;
}
