import { describe, expect, it } from 'vitest';
import { buildRows, parseAmount, readForm } from '@/features/tax/reader/engine';
import { extractPages, readPages } from '@/features/tax/reader/pdf';
import { JU_2025 } from '@/features/tax/reader/profiles/ju-2025';
import type { PageTokens, Token } from '@/features/tax/reader/types';

/** Un chiffre éclaté en glyphes, comme dans le PDF réel (« 100 » devient « 1 », « 0 », « 0 »). */
function glyphs(text: string, x: number, y: number): Token[] {
    return [...text].map((char, i) => ({ text: char, x: x + i * 4.45, w: 4.45, y }));
}

const word = (text: string, x: number, y: number, w = 40): Token => ({ text, x, w, y });

interface Row {
    code: string;
    amount?: string;
    sign?: '+' | '-';
    conjCode?: string;
    conjAmount?: string;
    label?: string;
}

/** Page type JuraTax : libellé à gauche, code à x=301, signe, montant à x=387, code du conjoint à x=429. */
function page(rows: Row[], pageNumber = 2): PageTokens {
    const tokens: Token[] = [JURATAX_FOOTER];
    rows.forEach((row, index) => {
        const y = 780 - index * 16;
        tokens.push(word(row.label ?? 'libellé du formulaire (2 ème pilier, Fr. 9’999.--)', 43, y, 200));
        tokens.push(...glyphs(row.code, 301, y));
        if (row.amount) {
            tokens.push(word(row.sign ?? '+', 329, y, 5));
            tokens.push(word(row.amount, 387, y, 36));
        }
        const conj = row.conjCode ?? `${row.code}C`;
        tokens.push(word(conj, 429, y, 22));
        if (row.conjAmount) tokens.push(word(row.conjAmount, 500, y, 36));
    });
    return { page: pageNumber, tokens };
}

const JURATAX_FOOTER = word('JuraTax Online version 2025', 57, 10, 120);

describe('parseAmount', () => {
    it('lit les formats suisses et refuse le reste', () => {
        expect(parseAmount('85’000')).toBe(85000);
        expect(parseAmount("12'345.50")).toBe(12345.5);
        expect(parseAmount('2’500.--')).toBe(2500);
        expect(parseAmount('300')).toBe(300);
        expect(parseAmount('100C')).toBeNull();
        expect(parseAmount('+')).toBeNull();
    });
});

describe('buildRows', () => {
    it('recolle les chiffres éclatés sans fusionner des colonnes distantes', () => {
        const rows = buildRows([...glyphs('100', 301, 700), word('99’999', 387, 700, 30)]);
        expect(rows).toHaveLength(1);
        expect(rows[0].map((token) => token.text)).toEqual(['100', '99’999']);
    });
});

describe('readForm (profil JuraTax 2025)', () => {
    const run = (rows: Row[]) => readForm([page(rows)], JU_2025);

    it('prend le montant, jamais le code du conjoint ni les chiffres du libellé', () => {
        const report = run([{ code: '100', amount: '85’000' }, { code: '200' }, { code: '230' }]);
        expect(report.suggestions).toHaveLength(1);
        expect(report.suggestions[0]).toMatchObject({ code: 'income.employed', person: '1', amount: 85000 });
    });

    it('garde la zone du code et du montant, pour la surbrillance dans la revue', () => {
        const report = run([{ code: '100', amount: '85’000' }, { code: '200' }, { code: '230' }]);
        const line = report.lines.find((item) => item.code === '100');
        // code à x=301 (3 glyphes de 4.45), montant à x=387 sur 36 : la zone va de 301 à 423, ligne y=780
        expect(line?.box).toEqual({ page: 2, x: 301, y: 780, w: 122, h: 9 });
        expect(report.suggestions[0].boxes).toEqual([line?.box]);
    });

    it('additionne les codes qui visent la même ligne', () => {
        const report = run([
            { code: '100', amount: '60’000' },
            { code: '110', amount: '5’000' },
            { code: '130', amount: '1’500' }
        ]);
        expect(report.suggestions.find((item) => item.code === 'income.employed')?.amount).toBe(66500);
    });

    it('attribue la colonne du conjoint à la personne 2', () => {
        const report = run([{ code: '100', amount: '50’000', conjAmount: '70’000' }, { code: '110' }, { code: '130' }]);
        const byPerson = Object.fromEntries(report.suggestions.map((item) => [item.person, item.amount]));
        expect(byPerson).toEqual({ '1': 50000, '2': 70000 });
    });

    it('garde les excédents de dépenses en négatif et ne les propose pas', () => {
        const report = run([{ code: '300', amount: '4’000' }, { code: '310', amount: '9’000', sign: '-' }, { code: '320' }]);
        expect(report.lines.find((line) => line.code === '310')?.amount).toBe(-9000);
        expect(report.suggestions.find((item) => item.code === 'income.property')).toBeUndefined();
    });

    it('propose la déduction générale sur la fortune (860 et 870 sur la même ligne)', () => {
        const report = readForm([page([{ code: '860', amount: '28’500' }, { code: '870', amount: '1’000' }, { code: '892' }], 5)], JU_2025);
        expect(report.suggestions).toHaveLength(1);
        expect(report.suggestions[0]).toMatchObject({ code: 'asset.generalDeduction', amount: 29500 });
        expect(report.unmapped).toHaveLength(0);
    });

    it('signale les lignes lues sans équivalent dans l’application', () => {
        const report = run([{ code: '892', amount: '10’000' }, { code: '894' }, { code: '905' }]);
        expect(report.unmapped.map((line) => line.code)).toEqual(['892']);
    });

    it('recoupe les totaux imprimés avec les lignes lues', () => {
        const ok = run([
            { code: '100', amount: '60’000' },
            { code: '140', amount: '5’000' },
            { code: '480', amount: '65’000' }
        ]);
        expect(ok.totals.find((total) => total.code === '480' && total.label.includes('contribuable'))?.status).toBe('ok');

        const bad = run([
            { code: '100', amount: '60’000' },
            { code: '140', amount: '5’000' },
            { code: '480', amount: '99’000' }
        ]);
        expect(bad.totals.find((total) => total.code === '480' && total.label.includes('contribuable'))?.status).toBe('mismatch');
    });

    it('considère cohérent un total imprimé à zéro dont les lignes somment à zéro', () => {
        const report = readForm([page([{ code: '860' }, { code: '870' }, { code: '892' }], 5)], JU_2025);
        expect(report.totals.find((total) => total.code === '890')?.status).toBe('ok');
    });

    it('ignore les pages hors profil', () => {
        const report = readForm([page([{ code: '100', amount: '85’000' }, { code: '110' }, { code: '130' }], 7)], JU_2025);
        expect(report.lines).toHaveLength(0);
    });
});

describe('readPages', () => {
    it('renvoie null quand aucun profil ne reconnaît le document', () => {
        expect(readPages([{ page: 1, tokens: [word('Déclaration vaudoise', 10, 10)] }])).toBeNull();
    });

    it('reconnaît JuraTax et lit la page', () => {
        const report = readPages([page([{ code: '100', amount: '85’000' }, { code: '110' }, { code: '130' }])]);
        expect(report?.profileId).toBe('ju-2025');
        expect(report?.suggestions[0].amount).toBe(85000);
    });
});

describe('lecture d’un faux PDF (bout en bout, locale)', () => {
    it('extrait puis lit un PDF texte aux montants inventés', async () => {
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const rows = [
            {
                y: 780,
                parts: [
                    [43, 'salaire'],
                    [301, '100'],
                    [329, '+'],
                    [387, '85’000'],
                    [429, '100C']
                ]
            },
            {
                y: 764,
                parts: [
                    [43, 'gain'],
                    [301, '110'],
                    [429, '110C']
                ]
            },
            {
                y: 748,
                parts: [
                    [43, 'jetons'],
                    [301, '130'],
                    [429, '130C']
                ]
            },
            { y: 20, parts: [[57, 'JuraTax Online']] }
        ] as { y: number; parts: [number, string][] }[];
        const pdf = await getDocument({ data: fakePdf(rows), useSystemFonts: true }).promise;
        const pages = await extractPages(pdf);
        // le PDF de test n'a qu'une page : on la présente comme la page 2 du formulaire
        const report = readPages(pages.map((p) => ({ ...p, page: 2 })));
        expect(report?.suggestions).toHaveLength(1);
        expect(report?.suggestions[0]).toMatchObject({ code: 'income.employed', person: '1', amount: 85000 });
    }, 30000);
});

/** PDF minimal : texte positionné en Helvetica (WinAnsi), pour vérifier la chaîne complète sans fichier personnel. */
function fakePdf(rows: { y: number; parts: [number, string][] }[]): Uint8Array {
    const escape = (text: string) => text.replace(/’/g, "'").replace(/[()\\]/g, '\\$&');
    const stream = rows.flatMap((row) => row.parts.map(([x, text]) => `BT /F1 10 Tf ${x} ${row.y} Td (${escape(text)}) Tj ET`)).join('\n');
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    ];
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
        offsets.push(out.length);
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(out);
}
