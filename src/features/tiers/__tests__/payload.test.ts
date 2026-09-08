import { describe, expect, it } from 'vitest';
import {
    buildCreateTierPayload,
    buildUpdateTierPayload,
    emptyTierFormFields,
    isTierFormDirty,
    tierToFormFields,
    type TierFormFields
} from '@/features/tiers/payload';
import type { Tier } from '@/features/tiers/types';

const now = new Date('2026-09-08T10:00:00Z');

function fields(partial: Partial<TierFormFields> = {}): TierFormFields {
    return {
        ...emptyTierFormFields('company'),
        name: 'Migros',
        email: 'Contact@Migros.ch',
        phone: '+41 58 570 00 00',
        website: 'migros.ch',
        roles: ['fournisseur'],
        company: { legalName: 'Migros-Genossenschafts-Bund', vatNumber: 'CHE-105.821.212', companyRegistrationNumber: '' },
        ...partial
    };
}

function tier(partial: Partial<Tier> = {}): Tier {
    return {
        publicId: 'tier-1',
        name: 'Migros',
        nature: 'company',
        email: 'contact@migros.ch',
        phone: '+41 58 570 00 00',
        website: 'https://migros.ch/',
        notes: null,
        roles: ['fournisseur'],
        person: null,
        company: { legalName: 'Migros-Genossenschafts-Bund', vatNumber: 'CHE-105.821.212', companyRegistrationNumber: null },
        organization: null,
        createdAt: '2026-09-07T14:32:10Z',
        updatedAt: null,
        ...partial
    };
}

describe('tier payload', () => {
    it('envoie l’état complet : e-mail en minuscules, site préfixé, seul le volet de la nature', () => {
        const result = buildCreateTierPayload(fields({ name: '  Migros  ' }), { now });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({
                name: 'Migros',
                nature: 'company',
                email: 'contact@migros.ch',
                phone: '+41 58 570 00 00',
                website: 'https://migros.ch/',
                notes: null,
                roles: ['fournisseur'],
                person: null,
                company: { legalName: 'Migros-Genossenschafts-Bund', vatNumber: 'CHE-105.821.212', companyRegistrationNumber: null },
                organization: null
            });
        }
    });

    it('ignore les volets non concernés par la nature et remet les champs vides à null', () => {
        const result = buildUpdateTierPayload(
            fields({
                nature: 'person',
                email: '',
                phone: '',
                website: '',
                roles: [],
                person: { firstName: ' Jean ', lastName: '', birthDate: null }
            }),
            { now }
        );
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.company).toBeNull();
            expect(result.payload.organization).toBeNull();
            expect(result.payload.person).toEqual({ firstName: 'Jean', lastName: null, birthDate: null });
            expect(result.payload.email).toBeNull();
            expect(result.payload.roles).toEqual([]);
        }
    });

    it('administration / unknown : les trois volets sont null', () => {
        const result = buildCreateTierPayload(fields({ nature: 'administration' }), { now });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.person).toBeNull();
            expect(result.payload.company).toBeNull();
            expect(result.payload.organization).toBeNull();
        }
    });

    it('refuse nom vide / trop long / doublon, e-mail, téléphone et site invalides', () => {
        expect(buildCreateTierPayload(fields({ name: '   ' }))).toMatchObject({ ok: false, code: 'nameRequired', field: 'name' });
        expect(buildCreateTierPayload(fields({ name: 'x'.repeat(201) }))).toMatchObject({ ok: false, code: 'nameTooLong' });
        expect(buildCreateTierPayload(fields({ name: 'migros' }), { knownTiers: [tier()] })).toMatchObject({
            ok: false,
            code: 'nameDuplicate'
        });
        expect(buildUpdateTierPayload(fields({ name: 'migros' }), { knownTiers: [tier()], excludePublicId: 'tier-1' }).ok).toBe(true);
        expect(buildCreateTierPayload(fields({ email: 'nope' }))).toMatchObject({ ok: false, code: 'emailInvalid', field: 'email' });
        expect(buildCreateTierPayload(fields({ phone: '12' }))).toMatchObject({ ok: false, code: 'phoneInvalid', field: 'phone' });
        expect(buildCreateTierPayload(fields({ website: 'ftp://x.ch' }))).toMatchObject({ ok: false, code: 'websiteInvalid' });
        expect(buildCreateTierPayload(fields({ notes: 'n'.repeat(4001) }))).toMatchObject({ ok: false, code: 'notesTooLong' });
    });

    it('refuse un rôle inconnu ou en double, et une date de naissance future', () => {
        expect(buildCreateTierPayload(fields({ roles: ['banque', 'BANQUE' as 'banque'] }))).toMatchObject({
            ok: false,
            code: 'rolesDuplicate'
        });
        expect(buildCreateTierPayload(fields({ roles: ['inconnu' as 'banque'] }))).toMatchObject({ ok: false, code: 'rolesInvalid' });
        expect(
            buildCreateTierPayload(fields({ nature: 'person', person: { firstName: '', lastName: '', birthDate: '2027-01-01' } }), { now })
        ).toMatchObject({ ok: false, code: 'personBirthDateFuture', field: 'person.birthDate' });
        expect(
            buildCreateTierPayload(fields({ nature: 'person', person: { firstName: '', lastName: '', birthDate: '2026-02-30' } }), { now })
        ).toMatchObject({ ok: false, code: 'personBirthDateInvalid' });
    });

    it('remet les rôles dans l’ordre de l’énumération', () => {
        const result = buildCreateTierPayload(fields({ roles: ['preteur', 'bailleur'] }), { now });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.payload.roles).toEqual(['bailleur', 'preteur']);
    });

    it('détecte le dirty d’édition (volet, rôles, contact, nature)', () => {
        const current = tier();
        const form = tierToFormFields(current);
        expect(isTierFormDirty(current, form)).toBe(false);
        expect(isTierFormDirty(current, { ...form, name: 'Migros SA' })).toBe(true);
        expect(isTierFormDirty(current, { ...form, email: 'CONTACT@migros.ch' })).toBe(false);
        expect(isTierFormDirty(current, { ...form, roles: ['fournisseur', 'service'] })).toBe(true);
        expect(isTierFormDirty(current, { ...form, company: { ...form.company, vatNumber: '' } })).toBe(true);
        expect(isTierFormDirty(current, { ...form, nature: 'person' })).toBe(true);
    });
});
