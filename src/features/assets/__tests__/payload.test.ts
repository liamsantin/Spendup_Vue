import { describe, expect, it } from 'vitest';
import {
    assetToFormFields,
    buildCreateAssetPayload,
    buildSaveMaintenancePayload,
    buildSaveMileagePayload,
    buildSaveValuationPayload,
    buildUpdateAssetPayload,
    emptyAssetFormFields,
    emptyVehicleMaintenanceFormFields,
    isAssetFormDirty,
    type AssetFormFields
} from '@/features/assets/payload';
import type { Asset } from '@/features/assets/types';

function vehicleForm(partial: Partial<AssetFormFields> = {}): AssetFormFields {
    const fields = emptyAssetFormFields({ type: 'vehicule', currency: 'CHF' });
    fields.name = 'Ma voiture';
    fields.estimatedValue = '12000';
    fields.vehicle = { ...fields.vehicle, brand: 'Toyota', model: 'Yaris', vehicleType: 'voiture', currentMileage: '42000' };
    return { ...fields, ...partial };
}

const savedVehicle: Asset = {
    publicId: 'a-1',
    name: 'Ma voiture',
    type: 'vehicule',
    estimatedValue: 12000,
    currency: 'CHF',
    acquisitionDate: null,
    acquisitionPrice: null,
    description: null,
    notes: null,
    isActive: true,
    lastValuationDate: '2026-10-26',
    isValueFromAccount: false,
    vehicle: {
        brand: 'Toyota',
        model: 'Yaris',
        vehicleType: 'voiture',
        fuel: null,
        firstRegistrationYear: null,
        plate: null,
        currentMileage: 42000
    },
    crypto: null,
    valuableItem: null,
    savingsAccount: null,
    other: null,
    realEstate: null,
    createdAt: '2026-10-26T10:00:00Z',
    updatedAt: null
};

describe('assets payload — racine', () => {
    it('construit une création de véhicule avec seulement son détail', () => {
        const built = buildCreateAssetPayload(vehicleForm());
        expect(built.ok).toBe(true);
        if (!built.ok) return;
        expect(built.payload).toMatchObject({
            name: 'Ma voiture',
            type: 'vehicule',
            estimatedValue: 12000,
            currency: 'CHF',
            vehicle: { brand: 'Toyota', model: 'Yaris', vehicleType: 'voiture', fuel: null, currentMileage: 42000 }
        });
        expect('crypto' in built.payload).toBe(false);
        expect('realEstate' in built.payload).toBe(false);
    });

    it('refuse les champs obligatoires et les bornes', () => {
        expect(buildCreateAssetPayload(vehicleForm({ name: '  ' }))).toMatchObject({ ok: false, code: 'nameRequired', field: 'name' });
        expect(buildCreateAssetPayload(vehicleForm({ name: 'x'.repeat(151) }))).toMatchObject({ ok: false, code: 'nameTooLong' });
        expect(buildCreateAssetPayload(vehicleForm({ type: '' }))).toMatchObject({ ok: false, code: 'typeInvalid' });
        expect(buildCreateAssetPayload(vehicleForm({ estimatedValue: '-1' }))).toMatchObject({ ok: false, code: 'estimatedValueNegative' });
        expect(buildCreateAssetPayload(vehicleForm({ acquisitionPrice: '-5' }))).toMatchObject({
            ok: false,
            code: 'acquisitionPriceNegative'
        });
        expect(buildCreateAssetPayload(vehicleForm({ description: 'x'.repeat(501) }))).toMatchObject({
            ok: false,
            code: 'descriptionTooLong'
        });
        const noBrand = vehicleForm();
        noBrand.vehicle.brand = '';
        expect(buildCreateAssetPayload(noBrand)).toMatchObject({ ok: false, code: 'vehicleBrandRequired', field: 'vehicle.brand' });
    });

    it('valide crypto, épargne et immobilier', () => {
        const crypto = emptyAssetFormFields({ type: 'crypto' });
        crypto.name = 'BTC';
        crypto.crypto = { name: 'Bitcoin', symbol: 'btc', quantity: '0.000000000001', averagePurchasePrice: '', platform: '' };
        const builtCrypto = buildCreateAssetPayload(crypto);
        expect(builtCrypto.ok && builtCrypto.payload.crypto).toMatchObject({ symbol: 'BTC', quantity: 0.000000000001 });
        crypto.crypto.quantity = '';
        expect(buildCreateAssetPayload(crypto)).toMatchObject({ ok: false, code: 'cryptoQuantityInvalid' });

        const savings = emptyAssetFormFields({ type: 'compteEpargne' });
        savings.name = 'Épargne';
        savings.savingsAccount.accountPublicId = 'acc-x';
        expect(buildCreateAssetPayload(savings, { allowedAccountIds: new Set(['acc-1']) })).toMatchObject({
            ok: false,
            code: 'accountInvalid'
        });
        savings.savingsAccount.accountPublicId = 'acc-1';
        expect(buildCreateAssetPayload(savings, { allowedAccountIds: new Set(['acc-1']) }).ok).toBe(true);

        const flat = emptyAssetFormFields({ type: 'immobilier' });
        flat.name = 'Appartement';
        flat.realEstate.country = 'che';
        expect(buildCreateAssetPayload(flat)).toMatchObject({ ok: false, code: 'countryInvalid', field: 'realEstate.country' });
        flat.realEstate.country = 'ch';
        flat.realEstate.rooms = '4,5';
        const builtFlat = buildCreateAssetPayload(flat);
        expect(builtFlat.ok && builtFlat.payload.realEstate).toMatchObject({ country: 'CH', rooms: 4.5, propertyType: 'appartement' });
    });

    it('construit une mise à jour état complet avec devise figée et isActive', () => {
        const fields = assetToFormFields(savedVehicle);
        fields.sold = true;
        const built = buildUpdateAssetPayload(fields, { lockedCurrency: 'CHF', lockedType: 'vehicule' });
        expect(built).toMatchObject({ ok: true, payload: { currency: 'CHF', isActive: false } });
        expect(built.ok && 'type' in built.payload).toBe(false);
        expect(buildUpdateAssetPayload(fields, { lockedType: 'vehicule' })).toMatchObject({ ok: false, code: 'currencyLocked' });
        fields.currency = 'EUR';
        expect(buildUpdateAssetPayload(fields, { lockedCurrency: 'CHF', lockedType: 'vehicule' })).toMatchObject({
            ok: false,
            code: 'currencyLocked'
        });
    });

    it('recopie la valeur courante pour une épargne adossée à un compte', () => {
        const fields = vehicleForm({ estimatedValue: 'abc' });
        const built = buildUpdateAssetPayload(fields, {
            lockedCurrency: 'CHF',
            lockedType: 'vehicule',
            isValueFromAccount: true,
            currentEstimatedValue: 4321
        });
        expect(built).toMatchObject({ ok: true, payload: { estimatedValue: 4321 } });
    });

    it('détecte un formulaire modifié', () => {
        const fields = assetToFormFields(savedVehicle);
        expect(isAssetFormDirty(savedVehicle, fields)).toBe(false);
        fields.vehicle.plate = 'JU 1';
        expect(isAssetFormDirty(savedVehicle, fields)).toBe(true);
    });
});

describe('assets payload — sous-ressources', () => {
    it('refuse une valorisation future ou négative', () => {
        const today = '2026-10-27';
        expect(buildSaveValuationPayload({ valuationDate: '2026-10-28', value: '10' }, { today })).toMatchObject({
            ok: false,
            code: 'valuationDateFuture'
        });
        expect(buildSaveValuationPayload({ valuationDate: '2026-10-20', value: '-1' }, { today })).toMatchObject({
            ok: false,
            code: 'valuationValueNegative'
        });
        expect(buildSaveValuationPayload({ valuationDate: '2026-10-20', value: '11500' }, { today })).toEqual({
            ok: true,
            payload: { valuationDate: '2026-10-20', value: 11500 }
        });
    });

    it('valide un relevé kilométrique', () => {
        expect(buildSaveMileagePayload({ statementDate: '2026-10-20', kilometrage: '' })).toMatchObject({
            ok: false,
            code: 'kilometrageInvalid'
        });
        expect(buildSaveMileagePayload({ statementDate: '2026-10-20', kilometrage: '43000' })).toEqual({
            ok: true,
            payload: { statementDate: '2026-10-20', kilometrage: 43000 }
        });
    });

    it('valide un entretien et conserve la transaction liée', () => {
        const fields = { ...emptyVehicleMaintenanceFormFields({ date: '2026-10-20' }), transactionPublicId: 'tx-1', cost: '250' };
        expect(buildSaveMaintenancePayload(fields, { today: '2026-10-27' })).toMatchObject({
            ok: true,
            payload: {
                maintenanceDate: '2026-10-20',
                maintenanceType: 'revision',
                cost: 250,
                transactionPublicId: 'tx-1',
                garageTierPublicId: null
            }
        });
        expect(buildSaveMaintenancePayload({ ...fields, nextMaintenanceDate: '2026-10-01' })).toMatchObject({
            ok: false,
            code: 'nextMaintenanceBeforeDate'
        });
        expect(buildSaveMaintenancePayload({ ...fields, maintenanceType: '' })).toMatchObject({
            ok: false,
            code: 'maintenanceTypeInvalid'
        });
    });
});
