import { describe, expect, it } from 'vitest';
import { readForm } from '@/features/tax/reader/engine';
import { readPages } from '@/features/tax/reader/pdf';
import { findProfile } from '@/features/tax/reader/profiles';
import { FR_2025 } from '@/features/tax/reader/profiles/fr-2025';
import type { PageTokens, Token } from '@/features/tax/reader/types';

const word = (text: string, x: number, y: number, w: number): Token => ({ text, x, w, y });

/** Montant aligné à droite : son bord droit tombe sur `right`, quelle que soit sa largeur. */
const amount = (text: string, right: number, y: number): Token => {
    const w = text.length * 4.2;
    return word(text, right - w, y, w);
};

const P1 = 494;
const P2 = 527;
const WEALTH = 561;

interface Row {
    code: string;
    p1?: string;
    p2?: string;
    wealth?: string;
    /** Le code est écrit un peu plus bas que ses montants (comme « 6.910 » dans le PDF réel). */
    codeOffset?: number;
}

/** Page type FriTax : libellé à gauche, code à x=400, signe « - » des déductions, puis colonnes P1, P2 et fortune. */
function page(rows: Row[], pageNumber = 4): PageTokens {
    const tokens: Token[] = [word('ETAT DE FRIBOURG', 20, 800, 90), word('Déclaration d’impôt 2025', 120, 800, 120)];
    rows.forEach((row, index) => {
        const y = 760 - index * 14;
        tokens.push(word('libellé du formulaire (voir annexe 03, lettre B)', 40, y, 300));
        tokens.push(word(row.code, 400, y - (row.codeOffset ?? 0), 24));
        tokens.push(word('-', 432, y, 4));
        if (row.p1) tokens.push(amount(row.p1, P1, y));
        if (row.p2) tokens.push(amount(row.p2, P2, y));
        if (row.wealth) tokens.push(amount(row.wealth, WEALTH, y));
    });
    return { page: pageNumber, tokens };
}

const run = (rows: Row[], pageNumber = 4) => readForm([page(rows, pageNumber)], FR_2025);

describe('profil FriTax 2025', () => {
    it('lit la colonne de la personne 1 sans prendre le signe « - » pour un montant négatif', () => {
        const report = run([
            { code: '1.110', p1: "84'317" },
            { code: '1.510', p1: "2'719" },
            { code: '2.130', p1: "2'611" }
        ]);
        const byTarget = Object.fromEntries(report.suggestions.map((item) => [item.code, item.amount]));
        expect(byTarget).toMatchObject({ 'income.employed': 84317, 'income.unemployment': 2719, 'deduction.jobExpenses': 2611 });
    });

    it('sépare la colonne revenu et la colonne fortune d’une même ligne', () => {
        const report = run([{ code: '3.210', p1: "1'483", wealth: "37'409" }, { code: '3.220' }, { code: '3.230' }]);
        const byTarget = Object.fromEntries(report.suggestions.map((item) => [item.code, item.amount]));
        expect(byTarget).toMatchObject({ 'income.securities': 1483, 'asset.cashAndSecurities': 37409 });
    });

    it('attribue la colonne de la personne 2 à la personne 2', () => {
        const report = run([{ code: '1.110', p1: "50'000", p2: "70'000" }, { code: '1.120' }, { code: '1.510' }]);
        const byPerson = Object.fromEntries(report.suggestions.map((item) => [item.person, item.amount]));
        expect(byPerson).toEqual({ '1': 50000, '2': 70000 });
    });

    it('reconnaît les dettes dans la colonne fortune des intérêts de dettes', () => {
        const report = run([{ code: '4.210', p1: "1'873", wealth: "6'592" }, { code: '4.220' }, { code: '4.310' }], 5);
        const byTarget = Object.fromEntries(report.suggestions.map((item) => [item.code, item.amount]));
        expect(byTarget).toMatchObject({ 'deduction.debtInterest': 1873, 'liability.debts': 6592 });
    });

    it('ignore les renvois « à reporter au code » des annexes, hors de la colonne des codes', () => {
        const tokens: Token[] = [
            word('FRIBOURG', 10, 800, 60),
            word('Déclaration d’impôt 2025', 80, 800, 120),
            ...['1.110', '2.130', '1.120'].flatMap((code, index) => [
                word(code, 335, 700 - index * 14, 24),
                amount("99'999", 428, 700 - index * 14)
            ])
        ];
        const report = readForm([{ page: 4, tokens }], FR_2025);
        expect(report.lines).toHaveLength(0);
    });

    it('recoupe les totaux, même quand le code est écrit un peu plus bas que ses montants', () => {
        const report = run(
            [
                { code: '4.910', p1: "62'681" },
                { code: '5.110', p1: '994' },
                { code: '5.120', p1: '641' },
                { code: '6.910', p1: "61'046", wealth: "35'536", codeOffset: 3.5 },
                { code: '7.110', wealth: "55'000" },
                { code: '7.910', p1: "61'046" }
            ],
            5
        );
        const status = (code: string, label: string) =>
            report.totals.find((total) => total.code === code && total.label.includes(label))?.status;
        expect(status('6.910', 'Revenu')).toBe('ok');
        expect(status('7.910', 'Revenu imposable')).toBe('ok');
        // fortune imposable : (35 536 - 55 000) plafonné à zéro, et le total imprimé à zéro n'a pas de montant
        expect(status('7.910', 'Fortune imposable')).toBe('ok');
    });

    it('signale un total imprimé qui ne correspond pas aux lignes lues', () => {
        const report = run([
            { code: '1.110', p1: "60'000" },
            { code: '1.120', p1: "5'000" },
            { code: '1.910', p1: "99'000" }
        ]);
        expect(report.totals.find((total) => total.code === '1.910' && total.status === 'mismatch')).toBeDefined();
    });
});

describe('colonne de la personne 2 superposée à la colonne fortune', () => {
    it('lit la colonne de droite comme personne 2 en haut de la page, et comme fortune plus bas', () => {
        const report = run([
            { code: '1.110', p1: "84'317", wealth: "61'853" },
            { code: '2.130', wealth: "2'000" },
            { code: '3.210', p1: "1'483", wealth: "37'409" }
        ]);
        const found = (target: string, person: string) =>
            report.suggestions.find((item) => item.code === target && item.person === person)?.amount;
        expect(found('income.employed', '2')).toBe(61853);
        expect(found('deduction.jobExpenses', '2')).toBe(2000);
        expect(found('asset.cashAndSecurities', '1')).toBe(37409);
        expect(found('asset.cashAndSecurities', '2')).toBeUndefined();
    });
});

describe('revenu net négatif', () => {
    it('considère cohérent un revenu net imprimé à zéro quand les déductions dépassent les revenus', () => {
        const report = run(
            [{ code: '3.910', p1: "10'000" }, { code: '4.130', p1: "6'831" }, { code: '4.210', p1: "20'000" }, { code: '4.910' }],
            5
        );
        const net = report.totals.find((total) => total.code === '4.910');
        expect(net?.status).toBe('ok');
    });
});

describe('détection du formulaire', () => {
    it('distingue Fribourg et le Jura, et refuse un format inconnu', () => {
        expect(findProfile('ETAT DE FRIBOURG Déclaration d’impôt 2025')?.id).toBe('fr-2025');
        expect(findProfile('JuraTax Online version 2025')?.id).toBe('ju-2025');
        expect(findProfile('Déclaration vaudoise')).toBeNull();
        expect(readPages([{ page: 1, tokens: [word('Déclaration vaudoise', 0, 0, 80)] }])).toBeNull();
    });
});
