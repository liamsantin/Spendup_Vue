import { describe, expect, it } from 'vitest';
import { readForm } from '@/features/tax/reader/engine';
import { JU_2025 } from '@/features/tax/reader/profiles/ju-2025';
import type { PageTokens, Token } from '@/features/tax/reader/types';
import layout from './fixtures/ju-di24-layout.json';

/**
 * Mise en page réelle du formulaire jurassien DI24 (positions des codes et signes relevées dans le PDF vierge, sans
 * aucun libellé ni donnée personnelle). Les montants ci-dessous sont inventés et posés à droite de leur code,
 * comme JuraTax les imprime.
 */
const blank = layout as PageTokens[];

/** Montants inventés, par code (contribuable) et, pour quelques lignes, pour le conjoint. */
const FAKE: Record<string, [string, string?]> = {
    '100': ['85’000', '42’000'],
    '110': ['1’200'],
    '200': ['24’000'],
    '300': ['6’300'],
    '340': ['480'],
    '500': ['2’000', '1’800'],
    '520': ['7’056'],
    '530': ['3’100'],
    '700': ['520’000'],
    '740': ['38’000'],
    '800': ['310’000']
};

function filled(pageNumbers: number[]): PageTokens[] {
    return blank
        .filter((page) => pageNumbers.includes(page.page))
        .map((page) => {
            const extra: Token[] = [];
            for (const token of page.tokens) {
                const plain = /^\d{3}$/.test(token.text) ? FAKE[token.text] : undefined;
                if (plain) {
                    extra.push({ text: plain[0], x: token.x + 82, w: 36, y: token.y });
                    const conj = plain[1] ? page.tokens.find((t) => t.text === `${token.text}C`) : undefined;
                    if (conj && plain[1]) extra.push({ text: plain[1], x: conj.x + 69, w: 36, y: conj.y });
                }
            }
            return { page: page.page, tokens: [...page.tokens, ...extra] };
        });
}

const summary = (pages: PageTokens[]) => readForm(pages, JU_2025).lines.map((line) => `${line.code}/${line.person}=${line.amount}`);

describe('lecture de la mise en page réelle DI24 (montants inventés)', () => {
    it('ne lit aucun montant sur le formulaire vierge', () => {
        expect(summary(blank)).toEqual([]);
    });

    it('page 2 : revenus du contribuable et du conjoint (code du conjoint sur la même ligne)', () => {
        expect(summary(filled([2]))).toEqual(['100/1=85000', '100/2=42000', '110/1=1200', '200/1=24000', '300/1=6300', '340/1=480']);
    });

    it('page 4 : fortune et dettes, une seule colonne', () => {
        expect(summary(filled([4]))).toEqual(['700/1=520000', '740/1=38000', '800/1=310000']);
    });

    it('page 3 (déductions) : le code du conjoint est sur la ligne suivante, le montant est lu quand même', () => {
        // la page est présentée comme la page 2 : le profil ne lit pas la page 3 (voir le test suivant)
        const page3 = filled([3]).map((page) => ({ ...page, page: 2 }));
        expect(summary(page3)).toEqual(['500/1=2000', '500/2=1800', '520/1=7056', '530/1=3100']);
    });

    // Le profil ne lit que les pages 2, 4 et 5 (impression JuraTax Online). Sur le formulaire DI24, les déductions
    // sont en page 3 : elles sont ignorées. À trancher avec une impression JuraTax 2025 remplie.
    it.todo('lit les déductions de la page 3 du formulaire papier DI24');
});
