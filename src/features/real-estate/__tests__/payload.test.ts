import { describe, expect, it } from 'vitest';
import {
    buildChargePayload,
    buildCreateDocumentPayload,
    buildCreateRentalPayload,
    buildMaintenancePayload,
    buildUnitPayload,
    buildUpdateDocumentPayload,
    buildUpdateRentalPayload,
    emptyChargeFormFields,
    emptyDocumentFormFields,
    emptyMaintenanceFormFields,
    emptyRentalFormFields,
    emptyUnitFormFields,
    isRentalFormDirty,
    isUnitFormDirty,
    rentalToFormFields,
    unitToFormFields
} from '@/features/real-estate/payload';
import type { RealEstateRental, RealEstateUnit } from '@/features/real-estate/types';

const unit: RealEstateUnit = {
    publicId: 'u-1',
    name: 'Appartement 1er',
    unitType: 'appartement',
    surfaceM2: 85,
    rooms: 3.5,
    floor: 1,
    isRentable: true,
    isOccupied: false,
    notes: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

const rental: RealEstateRental = {
    publicId: 'r-1',
    tenantTierPublicId: 't-1',
    tenantName: 'Jean Locataire',
    unitPublicId: 'u-1',
    startDate: '2026-04-01',
    endDate: null,
    monthlyRent: 1500,
    monthlyCharges: 200,
    deposit: 4500,
    currency: 'CHF',
    status: 'active',
    storedStatus: 'active',
    recurringIncomePublicId: null,
    notes: null,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: null
};

describe('lots', () => {
    it('construit le payload avec nombres décimaux et notes nulles', () => {
        const built = buildUnitPayload({ ...emptyUnitFormFields(), name: ' Studio ', surfaceM2: '32,5', rooms: '1.5', floor: '-1' });
        expect(built).toEqual({
            ok: true,
            payload: { name: 'Studio', unitType: 'appartement', surfaceM2: 32.5, rooms: 1.5, floor: -1, isRentable: true, notes: null }
        });
    });

    it('refuse un nom vide, un étage non entier et une surface négative', () => {
        expect(buildUnitPayload(emptyUnitFormFields())).toMatchObject({ ok: false, code: 'nameRequired', field: 'name' });
        expect(buildUnitPayload({ ...emptyUnitFormFields(), name: 'A', floor: '1.5' })).toMatchObject({ ok: false, code: 'floorInvalid' });
        expect(buildUnitPayload({ ...emptyUnitFormFields(), name: 'A', surfaceM2: '-3' })).toMatchObject({
            ok: false,
            code: 'surfaceInvalid'
        });
    });

    it('détecte les modifications', () => {
        const fields = unitToFormFields(unit);
        expect(isUnitFormDirty(unit, fields)).toBe(false);
        expect(isUnitFormDirty(unit, { ...fields, isRentable: false })).toBe(true);
    });
});

describe('charges', () => {
    const base = {
        ...emptyChargeFormFields(),
        name: 'Assurance bâtiment',
        chargeType: 'assuranceBatiment' as const,
        amount: '1200',
        periodicity: 'annuelle' as const
    };

    it('construit le payload (champs optionnels à null)', () => {
        expect(buildChargePayload(base)).toEqual({
            ok: true,
            payload: {
                name: 'Assurance bâtiment',
                chargeType: 'assuranceBatiment',
                amount: 1200,
                periodicity: 'annuelle',
                startDate: null,
                endDate: null,
                unitPublicId: null,
                tierPublicId: null,
                transactionPublicId: null
            }
        });
    });

    it('refuse montant négatif, fin avant début et lot inconnu', () => {
        expect(buildChargePayload({ ...base, amount: '-5' })).toMatchObject({ ok: false, code: 'amountNegative' });
        expect(buildChargePayload({ ...base, startDate: '2026-05-01', endDate: '2026-04-01' })).toMatchObject({
            ok: false,
            code: 'endDateBeforeStart',
            field: 'endDate'
        });
        expect(buildChargePayload({ ...base, unitPublicId: 'x' }, { unitIds: new Set(['u-1']) })).toMatchObject({
            ok: false,
            code: 'unitInvalid'
        });
    });
});

describe('travaux', () => {
    it('refuse une date future et une échéance antérieure', () => {
        const fields = { ...emptyMaintenanceFormFields({ today: '2026-10-27' }), maintenanceType: 'peinture' as const };
        expect(buildMaintenancePayload({ ...fields, maintenanceDate: '2026-10-28' }, { today: '2026-10-27' })).toMatchObject({
            ok: false,
            code: 'maintenanceDateFuture'
        });
        expect(buildMaintenancePayload({ ...fields, nextMaintenanceDate: '2026-01-01' }, { today: '2026-10-27' })).toMatchObject({
            ok: false,
            code: 'nextDateBeforeDate'
        });
        const ok = buildMaintenancePayload({ ...fields, cost: '2500', description: ' Cage ' }, { today: '2026-10-27' });
        expect(ok).toMatchObject({ ok: true, payload: { maintenanceDate: '2026-10-27', cost: 2500, description: 'Cage' } });
    });

    it('exige une date', () => {
        expect(buildMaintenancePayload({ ...emptyMaintenanceFormFields(), maintenanceType: 'peinture' })).toMatchObject({
            ok: false,
            code: 'maintenanceDateRequired'
        });
    });
});

describe('documents', () => {
    it('exige un fichier à la création seulement', () => {
        expect(buildCreateDocumentPayload(emptyDocumentFormFields())).toMatchObject({ ok: false, code: 'fileRequired' });
        expect(buildUpdateDocumentPayload(emptyDocumentFormFields())).toEqual({
            ok: true,
            payload: { name: null, documentType: 'other', documentDate: null, notes: null, unitPublicId: null }
        });
        expect(buildCreateDocumentPayload({ ...emptyDocumentFormFields(), filePublicId: 'f-1', documentType: 'acteVente' })).toMatchObject({
            ok: true,
            payload: { filePublicId: 'f-1', documentType: 'acteVente' }
        });
    });
});

describe('baux', () => {
    const fields = { ...emptyRentalFormFields({ today: '2026-04-01' }), tenantTierPublicId: 't-1', monthlyRent: '1500' };

    it('construit le payload de création', () => {
        expect(buildCreateRentalPayload({ ...fields, deposit: '4500' })).toEqual({
            ok: true,
            payload: {
                tenantTierPublicId: 't-1',
                startDate: '2026-04-01',
                monthlyRent: 1500,
                endDate: null,
                monthlyCharges: null,
                deposit: 4500,
                unitPublicId: null,
                recurringIncomePublicId: null,
                notes: null
            }
        });
    });

    it('refuse locataire manquant et lot non louable', () => {
        expect(buildCreateRentalPayload({ ...fields, tenantTierPublicId: '' })).toMatchObject({ ok: false, code: 'tenantRequired' });
        expect(
            buildCreateRentalPayload(
                { ...fields, unitPublicId: 'u-2' },
                { unitIds: new Set(['u-1', 'u-2']), rentableUnitIds: new Set(['u-1']) }
            )
        ).toMatchObject({ ok: false, code: 'unitNotRentable' });
    });

    it('envoie le statut stocké en édition, null quand vide, refuse aVenir', () => {
        const edit = rentalToFormFields(rental);
        expect(edit.status).toBe('active');
        expect(buildUpdateRentalPayload(edit)).toMatchObject({ ok: true, payload: { status: 'active' } });
        expect(buildUpdateRentalPayload({ ...edit, status: '' })).toMatchObject({ ok: true, payload: { status: null } });
        expect(buildUpdateRentalPayload({ ...edit, status: 'aVenir' as never })).toMatchObject({ ok: false, code: 'statusInvalid' });
    });

    it('détecte les modifications du bail', () => {
        const edit = rentalToFormFields(rental);
        expect(isRentalFormDirty(rental, edit)).toBe(false);
        expect(isRentalFormDirty(rental, { ...edit, status: 'suspendue' })).toBe(true);
        expect(isRentalFormDirty(rental, { ...edit, monthlyRent: '1600' })).toBe(true);
    });
});
