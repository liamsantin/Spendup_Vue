import { describe, expect, it } from 'vitest';
import {
    assetTypeTile,
    filterDirectoryAssets,
    formatAssetTotals,
    isValidYmd,
    matchesAssetSearch,
    normalizeAsset,
    normalizeListQuery,
    parseAssetStateFilter,
    queryMatchesAsset,
    sumAssetValuesByCurrency
} from '@/features/assets/format';
import type { Asset } from '@/features/assets/types';

function asset(partial: Partial<Asset> = {}): Asset {
    return {
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
            fuel: 'hybride',
            firstRegistrationYear: 2021,
            plate: 'JU 12345',
            currentMileage: 42000
        },
        crypto: null,
        valuableItem: null,
        savingsAccount: null,
        other: null,
        realEstate: null,
        createdAt: '2026-10-26T10:00:00Z',
        updatedAt: null,
        ...partial
    };
}

const flat = asset({
    publicId: 'a-2',
    name: 'Appartement',
    type: 'immobilier',
    estimatedValue: 800000,
    vehicle: null,
    realEstate: {
        details: {
            propertyType: 'appartement',
            addressLine1: 'Rue du Jura 1',
            addressLine2: null,
            postalCode: '2800',
            city: 'Delémont',
            country: 'ch',
            livingAreaM2: 95,
            landAreaM2: null,
            rooms: 4.5,
            bedrooms: 3,
            bathrooms: 1,
            floor: 2,
            hasElevator: true,
            hasBalcony: true,
            hasCellar: true,
            hasGarage: false,
            constructionYear: 1998,
            renovationYear: 2019,
            taxValue: 420000
        },
        summary: null
    }
});

const btc = asset({
    publicId: 'a-3',
    name: 'Bitcoin',
    type: 'crypto',
    estimatedValue: 3000,
    currency: 'EUR',
    vehicle: null,
    crypto: { name: 'Bitcoin', symbol: 'BTC', quantity: 0.05, averagePurchasePrice: null, platform: 'Kraken' }
});

describe('assets format', () => {
    it('valide les dates civiles', () => {
        expect(isValidYmd('2026-02-28')).toBe(true);
        expect(isValidYmd('2026-02-30')).toBe(false);
        expect(isValidYmd('26-02-01')).toBe(false);
    });

    it('normalise un actif et met le pays en majuscules', () => {
        const normalized = normalizeAsset({ ...flat, estimatedValue: '800000' as unknown as number });
        expect(normalized.estimatedValue).toBe(800000);
        expect(normalized.realEstate?.details.country).toBe('CH');
        expect(normalized.isActive).toBe(true);
    });

    it('recherche dans le nom et les détails', () => {
        expect(matchesAssetSearch(asset(), 'yaris')).toBe(true);
        expect(matchesAssetSearch(btc, 'kraken')).toBe(true);
        expect(matchesAssetSearch(btc, 'toyota')).toBe(false);
    });

    it('filtre l’annuaire : « Tous » exclut l’immobilier', () => {
        const items = [asset(), flat, btc];
        expect(filterDirectoryAssets(items).map((item) => item.publicId)).toEqual(['a-1', 'a-3']);
        expect(filterDirectoryAssets(items, { type: 'immobilier' }).map((item) => item.publicId)).toEqual(['a-2']);
        expect(filterDirectoryAssets(items, { search: 'bitcoin' }).map((item) => item.publicId)).toEqual(['a-3']);
    });

    it('lit le filtre d’état (défaut actif)', () => {
        expect(parseAssetStateFilter(undefined)).toBe('active');
        expect(parseAssetStateFilter('sold')).toBe('sold');
        expect(parseAssetStateFilter('autre')).toBe('active');
    });

    it('somme les valeurs par devise sans conversion', () => {
        const items = [asset(), asset({ publicId: 'a-4', estimatedValue: 500.5 }), btc];
        expect(sumAssetValuesByCurrency(items)).toEqual([
            { currency: 'CHF', total: 12500.5 },
            { currency: 'EUR', total: 3000 }
        ]);
        expect(formatAssetTotals(items, 'CHF')).toContain(' + ');
        expect(formatAssetTotals([], 'CHF')).toContain('CHF');
    });

    it('associe une teinte par type et applique les filtres de liste', () => {
        expect(assetTypeTile('vehicule')).toBe('su-tile--teal');
        expect(normalizeListQuery({ type: 'nope' as never, active: true })).toEqual({ type: null, active: true });
        expect(queryMatchesAsset({ active: false }, asset())).toBe(false);
        expect(queryMatchesAsset({ type: 'vehicule', active: true }, asset())).toBe(true);
    });
});
