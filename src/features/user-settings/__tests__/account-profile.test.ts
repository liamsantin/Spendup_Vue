import { describe, expect, it } from 'vitest';
import { buildProfilePayload, emptyToNull, isProfileDirty, isValidAccountPassword, takeProfileSnapshot } from '@/features/user-settings/account-profile';

const fields = {
    firstName: ' Alice ',
    name: 'Doe',
    phone: '  ',
    birthDate: '1990-01-01',
    street: 'Rue',
    streetNumber: '12',
    countryId: 33 as number | null
};

describe('account-profile', () => {
    it('emptyToNull trimme et convertit les vides', () => {
        expect(emptyToNull('  x  ')).toBe('x');
        expect(emptyToNull('   ')).toBeNull();
        expect(emptyToNull('')).toBeNull();
    });

    it('buildProfilePayload normalise les champs', () => {
        expect(buildProfilePayload(fields)).toEqual({
            firstName: 'Alice',
            name: 'Doe',
            phone: null,
            birthDate: '1990-01-01',
            street: 'Rue',
            streetNumber: '12',
            countryId: 33
        });
    });

    it('isProfileDirty compare au baseline', () => {
        const snap = takeProfileSnapshot(fields);
        expect(isProfileDirty(snap, null)).toBe(false);
        expect(isProfileDirty(snap, snap)).toBe(false);
        expect(isProfileDirty({ ...snap, name: 'Other' }, snap)).toBe(true);
        expect(isProfileDirty({ ...snap, countryId: null }, snap)).toBe(true);
    });

    it('isValidAccountPassword exige 8+, lettre et chiffre', () => {
        expect(isValidAccountPassword('Short1')).toBe(false);
        expect(isValidAccountPassword('longenough')).toBe(false);
        expect(isValidAccountPassword('12345678')).toBe(false);
        expect(isValidAccountPassword('Secret12')).toBe(true);
    });
});
