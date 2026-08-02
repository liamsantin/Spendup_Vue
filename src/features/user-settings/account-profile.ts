import type { UpdateProfilePayload } from '@/features/auth';

export type ProfileSnapshot = {
    firstName: string | null;
    name: string | null;
    phone: string | null;
    birthDate: string | null;
    street: string | null;
    streetNumber: string | null;
    countryId: number | null;
};

export function emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function buildProfilePayload(fields: {
    firstName: string;
    name: string;
    phone: string;
    birthDate: string;
    street: string;
    streetNumber: string;
    countryId: number | null;
}): UpdateProfilePayload {
    return {
        firstName: emptyToNull(fields.firstName),
        name: emptyToNull(fields.name),
        phone: emptyToNull(fields.phone),
        birthDate: emptyToNull(fields.birthDate),
        street: emptyToNull(fields.street),
        streetNumber: emptyToNull(fields.streetNumber),
        countryId: fields.countryId
    };
}

export function takeProfileSnapshot(fields: {
    firstName: string;
    name: string;
    phone: string;
    birthDate: string;
    street: string;
    streetNumber: string;
    countryId: number | null;
}): ProfileSnapshot {
    return {
        firstName: emptyToNull(fields.firstName),
        name: emptyToNull(fields.name),
        phone: emptyToNull(fields.phone),
        birthDate: emptyToNull(fields.birthDate),
        street: emptyToNull(fields.street),
        streetNumber: emptyToNull(fields.streetNumber),
        countryId: fields.countryId
    };
}

export function isProfileDirty(current: ProfileSnapshot, baseline: ProfileSnapshot | null): boolean {
    if (!baseline) return false;
    return (
        current.firstName !== baseline.firstName ||
        current.name !== baseline.name ||
        current.phone !== baseline.phone ||
        current.birthDate !== baseline.birthDate ||
        current.street !== baseline.street ||
        current.streetNumber !== baseline.streetNumber ||
        current.countryId !== baseline.countryId
    );
}

/** Règles MDP alignées UI compte (8+, lettre, chiffre). */
export function isValidAccountPassword(password: string): boolean {
    return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
