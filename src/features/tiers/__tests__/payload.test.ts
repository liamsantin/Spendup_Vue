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
        bank: null,
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
                organization: null,
                bank: null
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

describe('tier payload : volet banque', () => {
    const ubs = { bankPublicId: 'bank-00230', bankName: 'UBS Switzerland AG', bic: 'UBSWCHZH80A', iid: '00230', countryCode: 'CH' };

    it('référentiel : envoie seulement bankPublicId et ajoute le rôle banque', () => {
        const result = buildCreateTierPayload(
            fields({
                name: 'UBS',
                roles: [],
                bank: { enabled: true, mode: 'registry', bankPublicId: 'bank-00230', bankName: 'UBS Switzerland AG', bic: 'X', iid: '1' }
            }),
            { now }
        );
        expect(result.ok && result.payload.bank).toEqual({ bankPublicId: 'bank-00230' });
        expect(result.ok && result.payload.roles).toEqual(['banque']);
    });

    it('hors référentiel : BIC normalisé, IID facultatif, formats contrôlés', () => {
        const custom = (bic: string, iid: string) =>
            buildCreateTierPayload(
                fields({ name: 'Revolut', bank: { enabled: true, mode: 'custom', bankPublicId: '', bankName: '', bic, iid } }),
                { now }
            );
        const ok = custom(' revolt21 ', '');
        expect(ok.ok && ok.payload.bank).toEqual({ bic: 'REVOLT21', iid: null });
        expect(custom('ABC', '')).toMatchObject({ ok: false, code: 'bankBicInvalid', field: 'bank.bic' });
        expect(custom('', '123456')).toMatchObject({ ok: false, code: 'bankIidInvalid', field: 'bank.iid' });
        expect(custom('', '')).toMatchObject({ ok: false, code: 'bankRequired' });
    });

    it('référentiel sans établissement choisi → bankRequired', () => {
        const result = buildCreateTierPayload(fields({ bank: { ...emptyTierFormFields().bank, enabled: true } }), { now });
        expect(result).toMatchObject({ ok: false, code: 'bankRequired', field: 'bank' });
    });

    it('le PUT renvoie le volet reçu du GET ; désactivé → bank: null', () => {
        const bankTier = tier({ name: 'UBS', roles: ['banque'], bank: ubs });
        const form = tierToFormFields(bankTier);
        expect(isTierFormDirty(bankTier, form)).toBe(false);
        const kept = buildUpdateTierPayload(form, { now });
        expect(kept.ok && kept.payload.bank).toEqual({ bankPublicId: 'bank-00230' });

        form.bank.enabled = false;
        expect(isTierFormDirty(bankTier, form)).toBe(true);
        const removed = buildUpdateTierPayload(form, { now });
        expect(removed.ok && removed.payload.bank).toBeNull();
    });

    it('banque hors référentiel : repasse en mode custom avec BIC / IID', () => {
        const form = tierToFormFields(
            tier({ bank: { bankPublicId: null, bankName: null, bic: 'REVOLT21', iid: null, countryCode: null } })
        );
        expect(form.bank).toMatchObject({ enabled: true, mode: 'custom', bic: 'REVOLT21', iid: '' });
    });
});
