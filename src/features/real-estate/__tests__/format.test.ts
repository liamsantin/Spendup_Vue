import { describe, expect, it } from 'vitest';
import {
    formatRealEstateAddress,
    formatRealEstatePeriod,
    formatSignedRealEstateAmount,
    isFileLinkedToDocumentError,
    isRentalAlive,
    matchesRealEstateSearch,
    monthlyEquivalentOf,
    rentalMonthlyTotal,
    sortCharges,
    sortRentals,
    sumCurrentMonthlyCharges,
    unitNameOf
} from '@/features/real-estate/format';
import { realEstateDetailPath, realEstatePublicIdFromPath, REAL_ESTATE_BASE } from '@/features/real-estate/paths';
import type { RealEstateDetails } from '@/features/assets/types';

const details = {
    propertyType: 'appartement',
    addressLine1: 'Rue du Jura 1',
    addressLine2: null,
    postalCode: '2800',
    city: 'Delémont',
    country: 'CH'
} as RealEstateDetails;

describe('format immobilier', () => {
    it('formate l’adresse en omettant les parties vides', () => {
        expect(formatRealEstateAddress(details)).toBe('Rue du Jura 1 · 2800 Delémont');
        expect(formatRealEstateAddress({ ...details, addressLine1: ' ' })).toBe('2800 Delémont');
        expect(formatRealEstateAddress(null)).toBe('');
    });

    it('cherche sur le nom, la ville et l’adresse', () => {
        const asset = { name: 'Appartement Jura', realEstate: { details, summary: null } };
        expect(matchesRealEstateSearch(asset, 'delémont')).toBe(true);
        expect(matchesRealEstateSearch(asset, '2800')).toBe(true);
        expect(matchesRealEstateSearch(asset, 'lausanne')).toBe(false);
    });

    it('ramène une charge au mois selon sa périodicité', () => {
        expect(monthlyEquivalentOf(1200, 'annuelle')).toBe(100);
        expect(monthlyEquivalentOf(300, 'trimestrielle')).toBe(100);
        expect(monthlyEquivalentOf(600, 'semestrielle')).toBe(100);
        expect(monthlyEquivalentOf(100, 'mensuelle')).toBe(100);
        expect(monthlyEquivalentOf(5000, 'ponctuelle')).toBe(0);
    });

    it('somme les charges en cours et trie en cours d’abord', () => {
        const charges = [
            { name: 'B', isCurrent: false, monthlyEquivalent: 50 },
            { name: 'C', isCurrent: true, monthlyEquivalent: 100 },
            { name: 'A', isCurrent: true, monthlyEquivalent: 25 }
        ];
        expect(sumCurrentMonthlyCharges(charges)).toBe(125);
        expect(sortCharges(charges).map((c) => c.name)).toEqual(['A', 'C', 'B']);
    });

    it('trie les baux : actifs, à venir, suspendus, terminés puis début décroissant', () => {
        const rentals = [
            { status: 'terminee' as const, startDate: '2025-01-01' },
            { status: 'active' as const, startDate: '2025-06-01' },
            { status: 'aVenir' as const, startDate: '2027-01-01' },
            { status: 'active' as const, startDate: '2026-01-01' },
            { status: 'suspendue' as const, startDate: '2024-01-01' }
        ];
        expect(sortRentals(rentals).map((r) => `${r.status}:${r.startDate}`)).toEqual([
            'active:2026-01-01',
            'active:2025-06-01',
            'aVenir:2027-01-01',
            'suspendue:2024-01-01',
            'terminee:2025-01-01'
        ]);
        expect(isRentalAlive({ status: 'suspendue' })).toBe(true);
        expect(isRentalAlive({ status: 'terminee' })).toBe(false);
        expect(rentalMonthlyTotal({ monthlyRent: 1500, monthlyCharges: null })).toBe(1500);
    });

    it('signe les montants avec + et le vrai signe moins', () => {
        expect(formatSignedRealEstateAmount(100, 'CHF')).toMatch(/^\+.*CHF$/);
        expect(formatSignedRealEstateAmount(-100, 'CHF')).toMatch(/^−.*CHF$/);
        expect(formatSignedRealEstateAmount(0, 'CHF')).not.toMatch(/^[+−]/);
    });

    it('formate une période et retrouve un lot', () => {
        expect(formatRealEstatePeriod(null, null)).toBe('');
        expect(formatRealEstatePeriod('2026-04-01', null)).toMatch(/ –$/);
        expect(unitNameOf([{ publicId: 'u-1', name: 'Studio' }], 'u-1')).toBe('Studio');
        expect(unitNameOf([], null)).toBeNull();
    });

    it('reconnaît le 400 « fichier lié à un document »', () => {
        expect(isFileLinkedToDocumentError({ status: 400, message: 'Ce fichier est lié à un document immobilier.' })).toBe(true);
        expect(isFileLinkedToDocumentError({ status: 404, message: 'document' })).toBe(false);
    });
});

describe('chemins immobilier', () => {
    it('aller-retour publicId ↔ chemin', () => {
        const path = realEstateDetailPath('abc-1');
        expect(path).toBe(`${REAL_ESTATE_BASE}/abc-1`);
        expect(realEstatePublicIdFromPath(path)).toBe('abc-1');
        expect(realEstatePublicIdFromPath(REAL_ESTATE_BASE)).toBeNull();
        expect(realEstatePublicIdFromPath('/app/autre')).toBeNull();
    });
});
