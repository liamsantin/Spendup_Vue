import { describe, expect, it } from 'vitest';
import {
    hasDuplicateRoles,
    isDuplicateTierName,
    isValidEmail,
    isValidPhone,
    normalizeRoles,
    normalizeWebsite,
    matchesTierSearch,
    sortTiers,
    tierSelectItems
} from '@/features/tiers/format';
import type { Tier } from '@/features/tiers/types';

function tier(partial: Partial<Tier> = {}): Tier {
    return {
        publicId: 'tier-1',
        name: 'Migros',
        nature: 'company',
        email: null,
        phone: null,
        website: null,
        notes: null,
        roles: ['fournisseur'],
        person: null,
        company: { legalName: null, vatNumber: null, companyRegistrationNumber: null },
        organization: null,
        createdAt: '2026-09-07T14:32:10Z',
        updatedAt: null,
        ...partial
    };
}

describe('tiers format', () => {
    it('normalise un site web : hôte nu → https, refuse ftp et localhost', () => {
        expect(normalizeWebsite('migros.ch')).toBe('https://migros.ch/');
        expect(normalizeWebsite('http://www.coop.ch/fr')).toBe('http://www.coop.ch/fr');
        expect(normalizeWebsite('  HTTPS://Example.COM  ')).toBe('https://example.com/');
        expect(normalizeWebsite('ftp://files.example.com')).toBeNull();
        expect(normalizeWebsite('localhost')).toBeNull();
        expect(normalizeWebsite('http://localhost:5173')).toBeNull();
        expect(normalizeWebsite('pas une url')).toBeNull();
        expect(normalizeWebsite('')).toBeNull();
    });

    it('valide e-mail et téléphone', () => {
        expect(isValidEmail('contact@migros.ch')).toBe(true);
        expect(isValidEmail('contact@migros')).toBe(false);
        expect(isValidEmail('contact migros.ch')).toBe(false);
        expect(isValidPhone('+41 58 570 00 00')).toBe(true);
        expect(isValidPhone('(022) 123-45.67')).toBe(true);
        expect(isValidPhone('12')).toBe(false);
        expect(isValidPhone('+41 abc')).toBe(false);
    });

    it('déduplique les rôles (casse ignorée) dans l’ordre de l’énumération', () => {
        expect(normalizeRoles(['preteur', 'bailleur', 'Bailleur'])).toEqual(['bailleur', 'preteur']);
        expect(normalizeRoles(['inconnu'])).toEqual([]);
        expect(hasDuplicateRoles(['banque', 'BANQUE'])).toBe(true);
        expect(hasDuplicateRoles(['banque', 'assurance'])).toBe(false);
    });

    it('trie par nom (casse ignorée) puis publicId', () => {
        const sorted = sortTiers([
            tier({ publicId: 'b', name: 'coop' }),
            tier({ publicId: 'a', name: 'Coop' }),
            tier({ publicId: 'c', name: 'Aldi' })
        ]);
        expect(sorted.map((item) => item.publicId)).toEqual(['c', 'a', 'b']);
    });

    it('recherche sur le libellé, le prénom et les volets', () => {
        const papa = tier({
            publicId: 'papa',
            name: 'Papa',
            nature: 'person',
            person: { firstName: 'John', lastName: 'Doe', birthDate: null },
            company: null
        });
        expect(matchesTierSearch(papa, 'john')).toBe(true);
        expect(matchesTierSearch(papa, 'DOE')).toBe(true);
        expect(matchesTierSearch(papa, 'papa')).toBe(true);
        expect(matchesTierSearch(papa, 'john doe')).toBe(true);
        expect(matchesTierSearch(papa, 'migros')).toBe(false);
    });

    it('trie par nom décroissant ou par date de création', () => {
        const a = tier({ publicId: 'a', name: 'Aldi', createdAt: '2026-01-01T00:00:00Z' });
        const b = tier({ publicId: 'b', name: 'Coop', createdAt: '2026-06-01T00:00:00Z' });
        expect(sortTiers([a, b], 'nameDesc').map((item) => item.publicId)).toEqual(['b', 'a']);
        expect(sortTiers([a, b], 'recent').map((item) => item.publicId)).toEqual(['b', 'a']);
        expect(sortTiers([a, b], 'oldest').map((item) => item.publicId)).toEqual(['a', 'b']);
    });

    it('trie par type A → Z (libellé) puis nom', () => {
        const labels: Record<string, string> = {
            person: 'Personne',
            company: 'Entreprise',
            organization: 'Organisation',
            administration: 'Administration',
            unknown: 'Non précisé'
        };
        const sorted = sortTiers(
            [
                tier({ publicId: 'p', name: 'Zoé', nature: 'person' }),
                tier({ publicId: 'c2', name: 'Coop', nature: 'company' }),
                tier({ publicId: 'c1', name: 'Aldi', nature: 'company' }),
                tier({ publicId: 'u', name: 'X', nature: 'unknown' }),
                tier({ publicId: 'a', name: 'Commune', nature: 'administration' })
            ],
            'natureAsc',
            { natureLabel: (nature) => labels[nature] }
        );
        expect(sorted.map((item) => item.publicId)).toEqual(['a', 'c1', 'c2', 'u', 'p']);
    });

    it('détecte un doublon de nom (casse ignorée) hors tier exclu', () => {
        const items = [tier({ publicId: 'tier-1', name: 'Migros' })];
        expect(isDuplicateTierName(' migros ', items)).toBe(true);
        expect(isDuplicateTierName('Migros', items, 'tier-1')).toBe(false);
        expect(isDuplicateTierName('Coop', items)).toBe(false);
    });

    it('construit les items de sélecteur avec une option vide', () => {
        const items = tierSelectItems([tier({ publicId: 'b', name: 'Coop' }), tier({ publicId: 'a', name: 'Aldi' })], {
            noneTitle: 'Aucune'
        });
        expect(items).toEqual([
            { title: 'Aucune', value: '' },
            { title: 'Aldi', value: 'a' },
            { title: 'Coop', value: 'b' }
        ]);
    });
});
