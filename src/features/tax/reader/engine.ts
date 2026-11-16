import type { TaxSuggestion } from '@/features/tax/types';
import type { FormProfile, PageTokens, ReadLine, ReadReport, ReaderPerson, Token, TotalCheck } from './types';

const CODE = /^(\d{3})(C?)$/;
const AMOUNT = /^(?:\d{1,3}(?:[’']\d{3})+|\d+)(?:\.(?:\d{1,2}|-+))?$/;
const NUMERIC = /^[\d’'.,\-C]+$/;
/** Deux glyphes plus proches que cela (en points) appartiennent au même nombre. */
const GLUE_GAP = 2.5;
const ROW_TOLERANCE = 3;
const COLUMN_TOLERANCE = 14;
const COLUMN_MIN_CODES = 3;

export function parseAmount(raw: string): number | null {
    if (!AMOUNT.test(raw)) return null;
    const cleaned = raw.replace(/[’']/g, '').replace(/\.-+$/, '');
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
}

/** Regroupe les morceaux d'une page en lignes visuelles et recolle les chiffres éclatés en glyphes séparés. */
export function buildRows(tokens: Token[]): Token[][] {
    const rows: { y: number; items: Token[] }[] = [];
    const sorted = tokens.filter((t) => t.text.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
    for (const token of sorted) {
        const item = { ...token, text: token.text.trim() };
        const row = rows.find((candidate) => Math.abs(candidate.y - token.y) <= ROW_TOLERANCE);
        if (row) row.items.push(item);
        else rows.push({ y: token.y, items: [item] });
    }
    return rows.map((row) => {
        const glued: Token[] = [];
        for (const token of row.items.sort((a, b) => a.x - b.x)) {
            const last = glued[glued.length - 1];
            if (last && NUMERIC.test(token.text) && NUMERIC.test(last.text) && token.x - (last.x + last.w) < GLUE_GAP) {
                last.text += token.text;
                last.w = token.x + token.w - last.x;
            } else glued.push(token);
        }
        return glued;
    });
}

interface Value {
    amount: number;
    page: number;
}

interface Found {
    code: string;
    person: ReaderPerson;
    amount: number;
}

/** Lit les codes de ligne et les montants d'une page : un montant est le nombre le plus à droite après son code. */
function readPage(page: PageTokens, known: Set<string>): Found[] {
    const rows = buildRows(page.tokens);
    const candidates = rows.flat().filter((token) => {
        const match = CODE.exec(token.text);
        return match !== null && known.has(match[1]);
    });
    // un vrai code appartient à une colonne : plusieurs codes connus alignés au même x
    const isCode = (token: Token) =>
        candidates.filter((other) => Math.abs(other.x - token.x) <= COLUMN_TOLERANCE).length >= COLUMN_MIN_CODES;

    const out: Found[] = [];
    for (const row of rows) {
        const codes = row.filter((token) => candidates.includes(token) && isCode(token)).sort((a, b) => a.x - b.x);
        codes.forEach((codeToken, index) => {
            const match = CODE.exec(codeToken.text);
            if (!match) return;
            const from = codeToken.x + codeToken.w;
            const to = codes[index + 1]?.x ?? Infinity;
            const between = row.filter((token) => token.x >= from - 0.5 && token.x < to && !codes.includes(token));
            const amounts = between.filter((token) => parseAmount(token.text) !== null);
            const last = amounts[amounts.length - 1];
            if (!last) return;
            const negative = between.some((token) => token.x < last.x && /^[-–−]$/.test(token.text));
            const amount = parseAmount(last.text);
            if (amount === null || amount === 0) return;
            out.push({ code: match[1], person: match[2] === 'C' ? '2' : '1', amount: negative ? -amount : amount });
        });
    }
    return out;
}

/** Lit un formulaire avec son profil : montants par code, propositions, lignes sans équivalent, contrôle des totaux. */
export function readForm(pages: PageTokens[], profile: FormProfile, labelFor: (target: string) => string = (t) => t): ReadReport {
    const byCode = new Map(profile.lines.map((line) => [line.code, line]));
    const known = new Set([...byCode.keys(), ...profile.totals.map((total) => total.code)]);
    const values = new Map<string, Value>();
    for (const page of pages) {
        if (profile.pages && !profile.pages.includes(page.page)) continue;
        for (const found of readPage(page, known)) {
            const key = `${found.code}|${found.person}`;
            if (!values.has(key)) values.set(key, { amount: found.amount, page: page.page });
        }
    }

    const lines: ReadLine[] = [];
    for (const [key, value] of values) {
        const [code, person] = key.split('|') as [string, ReaderPerson];
        const line = byCode.get(code);
        if (!line) continue;
        const amount = line.sign === -1 && value.amount > 0 ? -value.amount : value.amount;
        lines.push({ code, person, label: line.label, section: line.section, amount, page: value.page, target: line.target });
    }
    lines.sort((a, b) => Number(a.code) - Number(b.code) || a.person.localeCompare(b.person));

    const lookup = (code: string, person: ReaderPerson | '*') => {
        const get = (p: ReaderPerson) => {
            const value = values.get(`${code}|${p}`);
            if (!value) return 0;
            return byCode.get(code)?.sign === -1 && value.amount > 0 ? -value.amount : value.amount;
        };
        return person === '*' ? get('1') + get('2') : get(person);
    };

    const totals: TotalCheck[] = profile.totals.map((total) => {
        const read = values.get(`${total.code}|${total.person === '2' ? '2' : '1'}`)?.amount ?? null;
        const computed = total.compute(lookup);
        // un total imprimé à zéro n'a pas de montant : il est cohérent si les lignes lues somment aussi à zéro
        const status =
            read === null
                ? Math.abs(computed) <= 1 && total.person !== '2'
                    ? 'ok'
                    : 'missing'
                : Math.abs(read - computed) <= 1
                  ? 'ok'
                  : 'mismatch';
        return { code: total.code, label: total.label, read, computed, status };
    });

    const mapped = new Map<string, { target: string; person: ReaderPerson; amount: number; codes: string[]; page: number }>();
    for (const line of lines) {
        if (!line.target) continue;
        const key = `${line.target}|${line.person}`;
        const entry = mapped.get(key) ?? { target: line.target, person: line.person, amount: 0, codes: [], page: line.page };
        entry.amount += line.amount;
        entry.codes.push(line.code);
        mapped.set(key, entry);
    }
    const suggestions: TaxSuggestion[] = [...mapped.values()]
        .filter((entry) => entry.amount > 0)
        .map((entry) => ({
            code: entry.target,
            label: labelFor(entry.target),
            person: entry.person,
            competence: 'both',
            amount: Math.round(entry.amount * 100) / 100,
            currency: 'CHF',
            originLabel: `${profile.label} · code${entry.codes.length > 1 ? 's' : ''} ${entry.codes.join(', ')} (p. ${entry.page})`
        }));

    return {
        profileId: profile.id,
        profileLabel: profile.label,
        lines,
        suggestions,
        unmapped: lines.filter((line) => !line.target),
        totals
    };
}
