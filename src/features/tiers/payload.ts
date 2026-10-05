import { isValidBic, isValidIid, normalizeBic, normalizeIid } from '@/features/banks/format';
import {
    emptyToNull,
    hasDuplicateRoles,
    isDateInFutureUtc,
    isDuplicateTierName,
    isTierNature,
    isTierRole,
    isValidEmail,
    isValidPhone,
    isValidYmd,
    normalizeEmail,
    normalizeName,
    normalizeRoles,
    normalizeWebsite
} from '@/features/tiers/format';
import {
    TIER_COMPANY_IDENTIFIER_MAX,
    TIER_COMPANY_LEGAL_NAME_MAX,
    TIER_EMAIL_MAX,
    TIER_NAME_MAX,
    TIER_NOTES_MAX,
    TIER_ORGANIZATION_NAME_MAX,
    TIER_ORGANIZATION_TYPE_MAX,
    TIER_PERSON_NAME_MAX,
    TIER_PHONE_MAX,
    type CreateTierPayload,
    type Tier,
    type TierBankPayload,
    type TierCompanyPayload,
    type TierNature,
    type TierOrganizationPayload,
    type TierPersonPayload,
    type TierRole,
    type TierWritePayload,
    type UpdateTierPayload
} from '@/features/tiers/types';

export type TierPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'nameDuplicate'
    | 'natureInvalid'
    | 'emailInvalid'
    | 'emailTooLong'
    | 'phoneInvalid'
    | 'phoneTooLong'
    | 'websiteInvalid'
    | 'notesTooLong'
    | 'rolesInvalid'
    | 'rolesDuplicate'
    | 'personFirstNameTooLong'
    | 'personLastNameTooLong'
    | 'personBirthDateInvalid'
    | 'personBirthDateFuture'
    | 'companyLegalNameTooLong'
    | 'companyVatNumberTooLong'
    | 'companyRegistrationNumberTooLong'
    | 'organizationOfficialNameTooLong'
    | 'organizationTypeTooLong'
    | 'bankRequired'
    | 'bankBicInvalid'
    | 'bankIidInvalid';

/**
 * Volet banque du formulaire. `registry` : établissement SIX (`bankPublicId`) ;
 * `custom` : banque hors référentiel (BIC / IID saisis).
 */
export type TierBankFormFields = {
    enabled: boolean;
    mode: 'registry' | 'custom';
    bankPublicId: string;
    /** Nom officiel de l’établissement choisi (affichage du sélecteur). */
    bankName: string;
    bic: string;
    iid: string;
};

/** Champs UI : un seul formulaire de volet, commuté par `nature`. Les volets non concernés sont ignorés à l’envoi. */
export type TierFormFields = {
    name: string;
    nature: TierNature;
    email: string;
    phone: string;
    website: string;
    notes: string;
    roles: TierRole[];
    person: { firstName: string; lastName: string; birthDate: string | null };
    company: { legalName: string; vatNumber: string; companyRegistrationNumber: string };
    organization: { officialName: string; organizationType: string };
    bank: TierBankFormFields;
};

export type BuildTierPayloadOk<T> = { ok: true; payload: T };
export type BuildTierPayloadFail = { ok: false; code: TierPayloadErrorCode; field?: string };
export type BuildTierPayloadResult<T> = BuildTierPayloadOk<T> | BuildTierPayloadFail;

function fail(code: TierPayloadErrorCode, field?: string): BuildTierPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptyTierFormFields(nature: TierNature = 'company'): TierFormFields {
    return {
        name: '',
        nature,
        email: '',
        phone: '',
        website: '',
        notes: '',
        roles: [],
        person: { firstName: '', lastName: '', birthDate: null },
        company: { legalName: '', vatNumber: '', companyRegistrationNumber: '' },
        organization: { officialName: '', organizationType: '' },
        bank: emptyTierBankFormFields()
    };
}

export function emptyTierBankFormFields(enabled = false): TierBankFormFields {
    return { enabled, mode: 'registry', bankPublicId: '', bankName: '', bic: '', iid: '' };
}

function tierBankToFormFields(tier: Tier): TierBankFormFields {
    const bank = tier.bank;
    if (!bank) return emptyTierBankFormFields();
    return {
        enabled: true,
        mode: bank.bankPublicId ? 'registry' : 'custom',
        bankPublicId: bank.bankPublicId ?? '',
        bankName: bank.bankName ?? '',
        bic: bank.bic ?? '',
        iid: bank.iid ?? ''
    };
}

export function tierToFormFields(tier: Tier): TierFormFields {
    return {
        name: tier.name,
        nature: tier.nature,
        email: tier.email ?? '',
        phone: tier.phone ?? '',
        website: tier.website ?? '',
        notes: tier.notes ?? '',
        roles: normalizeRoles(tier.roles),
        person: {
            firstName: tier.person?.firstName ?? '',
            lastName: tier.person?.lastName ?? '',
            birthDate: tier.person?.birthDate ?? null
        },
        company: {
            legalName: tier.company?.legalName ?? '',
            vatNumber: tier.company?.vatNumber ?? '',
            companyRegistrationNumber: tier.company?.companyRegistrationNumber ?? ''
        },
        organization: {
            officialName: tier.organization?.officialName ?? '',
            organizationType: tier.organization?.organizationType ?? ''
        },
        bank: tierBankToFormFields(tier)
    };
}

type PanelResult =
    | BuildTierPayloadFail
    | {
          ok: true;
          person: TierPersonPayload | null;
          company: TierCompanyPayload | null;
          organization: TierOrganizationPayload | null;
      };

function buildPanel(fields: TierFormFields, now?: Date): PanelResult {
    switch (fields.nature) {
        case 'person': {
            const firstName = emptyToNull(fields.person.firstName);
            const lastName = emptyToNull(fields.person.lastName);
            const birthDate = emptyToNull(fields.person.birthDate);
            if (firstName && firstName.length > TIER_PERSON_NAME_MAX) return fail('personFirstNameTooLong', 'person.firstName');
            if (lastName && lastName.length > TIER_PERSON_NAME_MAX) return fail('personLastNameTooLong', 'person.lastName');
            if (birthDate) {
                if (!isValidYmd(birthDate)) return fail('personBirthDateInvalid', 'person.birthDate');
                if (isDateInFutureUtc(birthDate, now)) return fail('personBirthDateFuture', 'person.birthDate');
            }
            return { ok: true, person: { firstName, lastName, birthDate }, company: null, organization: null };
        }
        case 'company': {
            const legalName = emptyToNull(fields.company.legalName);
            const vatNumber = emptyToNull(fields.company.vatNumber);
            const companyRegistrationNumber = emptyToNull(fields.company.companyRegistrationNumber);
            if (legalName && legalName.length > TIER_COMPANY_LEGAL_NAME_MAX) return fail('companyLegalNameTooLong', 'company.legalName');
            if (vatNumber && vatNumber.length > TIER_COMPANY_IDENTIFIER_MAX) return fail('companyVatNumberTooLong', 'company.vatNumber');
            if (companyRegistrationNumber && companyRegistrationNumber.length > TIER_COMPANY_IDENTIFIER_MAX) {
                return fail('companyRegistrationNumberTooLong', 'company.companyRegistrationNumber');
            }
            return { ok: true, person: null, company: { legalName, vatNumber, companyRegistrationNumber }, organization: null };
        }
        case 'organization': {
            const officialName = emptyToNull(fields.organization.officialName);
            const organizationType = emptyToNull(fields.organization.organizationType);
            if (officialName && officialName.length > TIER_ORGANIZATION_NAME_MAX) {
                return fail('organizationOfficialNameTooLong', 'organization.officialName');
            }
            if (organizationType && organizationType.length > TIER_ORGANIZATION_TYPE_MAX) {
                return fail('organizationTypeTooLong', 'organization.organizationType');
            }
            return { ok: true, person: null, company: null, organization: { officialName, organizationType } };
        }
        default:
            return { ok: true, person: null, company: null, organization: null };
    }
}

type BankResult = BuildTierPayloadFail | { ok: true; bank: TierBankPayload | null };

/** Référentiel : seul `bankPublicId` part (BIC / IID repris par le serveur, `400` sinon). */
function buildBank(fields: TierFormFields): BankResult {
    const bank = fields.bank;
    if (!bank?.enabled) return { ok: true, bank: null };
    if (bank.mode === 'registry') {
        const bankPublicId = bank.bankPublicId.trim();
        if (!bankPublicId) return fail('bankRequired', 'bank');
        return { ok: true, bank: { bankPublicId } };
    }
    const bic = normalizeBic(bank.bic) || null;
    const iid = normalizeIid(bank.iid) || null;
    if (!bic && !iid) return fail('bankRequired', 'bank');
    if (bic && !isValidBic(bic)) return fail('bankBicInvalid', 'bank.bic');
    if (iid && !isValidIid(iid)) return fail('bankIidInvalid', 'bank.iid');
    return { ok: true, bank: { bic, iid } };
}

export type TierPayloadContext = {
    /** Tiers connus pour la détection locale de doublon de nom. */
    knownTiers?: readonly Tier[];
    excludePublicId?: string | null;
    now?: Date;
};

/**
 * Construit le corps POST / PUT (état complet) à partir du formulaire.
 * Seul le volet correspondant à `nature` est envoyé ; les autres sont `null`.
 */
export function buildTierPayload(fields: TierFormFields, context: TierPayloadContext = {}): BuildTierPayloadResult<TierWritePayload> {
    if (!isTierNature(fields.nature)) return fail('natureInvalid', 'nature');

    const name = normalizeName(fields.name);
    if (!name) return fail('nameRequired', 'name');
    if (name.length > TIER_NAME_MAX) return fail('nameTooLong', 'name');
    if (isDuplicateTierName(name, context.knownTiers ?? [], context.excludePublicId)) return fail('nameDuplicate', 'name');

    const emailRaw = emptyToNull(fields.email);
    if (emailRaw) {
        if (emailRaw.length > TIER_EMAIL_MAX) return fail('emailTooLong', 'email');
        if (!isValidEmail(emailRaw)) return fail('emailInvalid', 'email');
    }
    const email = normalizeEmail(emailRaw);

    const phone = emptyToNull(fields.phone);
    if (phone) {
        if (phone.length > TIER_PHONE_MAX) return fail('phoneTooLong', 'phone');
        if (!isValidPhone(phone)) return fail('phoneInvalid', 'phone');
    }

    const websiteRaw = emptyToNull(fields.website);
    const website = websiteRaw ? normalizeWebsite(websiteRaw) : null;
    if (websiteRaw && !website) return fail('websiteInvalid', 'website');

    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > TIER_NOTES_MAX) return fail('notesTooLong', 'notes');

    if (hasDuplicateRoles(fields.roles)) return fail('rolesDuplicate', 'roles');
    if ((fields.roles ?? []).some((role) => !isTierRole(role))) return fail('rolesInvalid', 'roles');

    const panel = buildPanel(fields, context.now);
    if (!panel.ok) return panel;

    const bank = buildBank(fields);
    if (!bank.ok) return bank;
    // Un tier avec volet banque porte toujours le rôle `banque` (le serveur l’ajoute aussi).
    const roles = normalizeRoles(bank.bank && !fields.roles.includes('banque') ? [...fields.roles, 'banque'] : fields.roles);

    return {
        ok: true,
        payload: {
            name,
            nature: fields.nature,
            email,
            phone,
            website,
            notes,
            roles,
            person: panel.person,
            company: panel.company,
            organization: panel.organization,
            bank: bank.bank
        }
    };
}

export function buildCreateTierPayload(
    fields: TierFormFields,
    context: TierPayloadContext = {}
): BuildTierPayloadResult<CreateTierPayload> {
    return buildTierPayload(fields, context);
}

export function buildUpdateTierPayload(
    fields: TierFormFields,
    context: TierPayloadContext = {}
): BuildTierPayloadResult<UpdateTierPayload> {
    return buildTierPayload(fields, context);
}

function sameNullable(a: string | null | undefined, b: string | null | undefined): boolean {
    return emptyToNull(a ?? null) === emptyToNull(b ?? null);
}

function isTierBankDirty(tier: Tier, bank: TierBankFormFields | undefined): boolean {
    const enabled = !!bank?.enabled;
    if (enabled !== !!tier.bank) return true;
    if (!bank || !enabled || !tier.bank) return false;
    if (bank.mode === 'registry') return bank.bankPublicId.trim() !== (tier.bank.bankPublicId ?? '');
    if (tier.bank.bankPublicId) return true;
    return normalizeBic(bank.bic) !== normalizeBic(tier.bank.bic) || normalizeIid(bank.iid) !== normalizeIid(tier.bank.iid);
}

export function isTierFormDirty(tier: Tier, fields: TierFormFields): boolean {
    if (normalizeName(fields.name) !== normalizeName(tier.name)) return true;
    if (fields.nature !== tier.nature) return true;
    if (normalizeEmail(fields.email) !== normalizeEmail(tier.email)) return true;
    if (!sameNullable(fields.phone, tier.phone)) return true;
    if (!sameNullable(fields.website, tier.website)) return true;
    if (!sameNullable(fields.notes, tier.notes)) return true;
    const formRoles = normalizeRoles(fields.roles);
    const tierRoles = normalizeRoles(tier.roles);
    if (formRoles.length !== tierRoles.length || formRoles.some((role, i) => role !== tierRoles[i])) return true;
    if (isTierBankDirty(tier, fields.bank)) return true;
    switch (fields.nature) {
        case 'person':
            return (
                !sameNullable(fields.person.firstName, tier.person?.firstName) ||
                !sameNullable(fields.person.lastName, tier.person?.lastName) ||
                !sameNullable(fields.person.birthDate, tier.person?.birthDate)
            );
        case 'company':
            return (
                !sameNullable(fields.company.legalName, tier.company?.legalName) ||
                !sameNullable(fields.company.vatNumber, tier.company?.vatNumber) ||
                !sameNullable(fields.company.companyRegistrationNumber, tier.company?.companyRegistrationNumber)
            );
        case 'organization':
            return (
                !sameNullable(fields.organization.officialName, tier.organization?.officialName) ||
                !sameNullable(fields.organization.organizationType, tier.organization?.organizationType)
            );
        default:
            return false;
    }
}
