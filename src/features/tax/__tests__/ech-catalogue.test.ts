import { describe, expect, it } from 'vitest';
import {
    CATALOGUE_ECH_FIELDS,
    labelTokens,
    loadEchDictionary,
    suggestTargets,
    type EchDictionary
} from '@/features/tax/reader/ech/ech-catalogue';

let dictionary: EchDictionary;
const load = async () => (dictionary ??= await loadEchDictionary());

describe('dictionnaire eCH-0278', () => {
    it('contient les champs de montant avec leurs libellés dans les trois langues', async () => {
        const { fields } = await load();
        expect(fields.length).toBeGreaterThan(250);
        for (const field of fields) {
            expect(field.fr).not.toBe('');
            expect(field.de).not.toBe('');
            expect(field.it).not.toBe('');
        }
    });

    it('relie chaque ligne du catalogue à des champs qui existent dans la norme', async () => {
        const known = new Set((await load()).fields.map((field) => field.field));
        const missing = Object.values(CATALOGUE_ECH_FIELDS)
            .flat()
            .filter((name) => !known.has(name));
        expect(missing).toEqual([]);
    });

    it('hérite des personnes et du ressort du groupe parent', async () => {
        const employed = (await load()).fields.find((field) => field.field === 'employedRevenueTotal');
        expect(employed).toMatchObject({ person1: true, person2: true, cantonal: true, federal: true });
    });
});

describe('labelTokens', () => {
    it('ignore accents, ponctuation, mots vides et pluriels', () => {
        expect(labelTokens('Frais de garde des enfants')).toEqual(['frai', 'garde', 'enfant']);
    });
});

describe('suggestTargets', () => {
    const top = async (label: string, language: 'fr' | 'de' | 'it' = 'fr') =>
        (suggestTargets(label, await load(), language)[0] ?? null)?.target;

    it('rapproche des libellés de formulaires cantonaux de lignes de Spend.Up', async () => {
        expect(await top('Rente AVS')).toBe('income.retirementPension');
        expect(await top('Rente AI')).toBe('income.disabilityPension');
        expect(await top('Frais de garde des enfants')).toBe('deduction.childcare');
        expect(await top('Frais de formation et de perfectionnement')).toBe('deduction.education');
        expect(await top('Intérêts passifs')).toBe('deduction.debtInterest');
        expect(await top('Bénéfice de liquidation')).toBe('income.liquidationProfit');
    });

    it('fonctionne aussi avec les libellés allemands', async () => {
        expect(await top('Schuldzinsen', 'de')).toBe('deduction.debtInterest');
    });

    it('ne propose rien pour un libellé sans rapport', async () => {
        expect(suggestTargets('Observations générales', await load())).toEqual([]);
        expect(suggestTargets('', await load())).toEqual([]);
    });
});
