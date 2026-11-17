import type { TaxSuggestion } from '@/features/tax/types';
import type { FormProfile, PageTokens, ReadLine, ReadReport, ReaderColumn, ReaderPerson, Token, TotalCheck, TotalRule } from './types';

const AMOUNT = /^(?:\d{1,3}(?:[’']\d{3})+|\d+)(?:\.(?:\d{1,2}|-+))?$/;
const NUMERIC = /^[\d’'.,\-C]+$/;
/** Deux glyphes plus proches que cela (en points) appartiennent au même nombre. */
const GLUE_GAP = 2.5;
const ROW_TOLERANCE = 4.5;
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
    column: ReaderColumn;
    amount: number;
}

/** Le formulaire est-il celui de ce profil ? Toutes les expressions de détection doivent figurer dans le texte. */
export function matchesProfile(text: string, profile: FormProfile): boolean {
    return profile.detect.every((pattern) => new RegExp(pattern, 'i').test(text));
}

/** Lit les codes de ligne et les montants d'une page selon la disposition du profil. */
function readPage(page: PageTokens, profile: FormProfile, known: Set<string>): Found[] {
    const { layout } = profile;
    const codeRe = new RegExp(layout.codePattern);
    const rows = buildRows(page.tokens);
    const candidates = rows.flat().filter((token) => {
        const match = codeRe.exec(token.text);
        if (!match || !known.has(match[1])) return false;
        return !layout.codeColumn || (token.x >= layout.codeColumn.min && token.x <= layout.codeColumn.max);
    });
    // un vrai code appartient à une colonne : plusieurs codes connus alignés au même x
    const isCode = (token: Token) =>
        candidates.filter((other) => Math.abs(other.x - token.x) <= COLUMN_TOLERANCE).length >= COLUMN_MIN_CODES;

    const out: Found[] = [];
    for (const row of rows) {
        const codes = row.filter((token) => candidates.includes(token) && isCode(token)).sort((a, b) => a.x - b.x);
        codes.forEach((codeToken, index) => {
            const match = codeRe.exec(codeToken.text);
            if (!match) return;
            const from = codeToken.x + codeToken.w;
            const to = codes[index + 1]?.x ?? Infinity;
            const between = row.filter((token) => token.x >= from - 0.5 && token.x < to && !codes.includes(token));
            const amounts = between.filter((token) => parseAmount(token.text) !== null);

            if (layout.persons.kind === 'suffix') {
                const last = amounts[amounts.length - 1];
                if (!last) return;
                const value = parseAmount(last.text);
                if (value === null || value === 0) return;
                const negative = layout.minusIsNegative && between.some((token) => token.x < last.x && /^[-–−]$/.test(token.text));
                out.push({
                    code: match[1],
                    person: match[2] === layout.persons.suffix ? '2' : '1',
                    column: 'amount',
                    amount: negative ? -value : value
                });
                return;
            }

            // une colonne par personne et une colonne fortune, repérées par le bord droit du montant
            const person2Re = layout.persons.person2InWealthBandFor ? new RegExp(layout.persons.person2InWealthBandFor) : null;
            for (const column of layout.persons.columns) {
                const inColumn = amounts.filter((token) => token.x + token.w >= column.minRight && token.x + token.w < column.maxRight);
                const last = inColumn[inColumn.length - 1];
                if (!last) continue;
                const value = parseAmount(last.text);
                if (value === null || value === 0) continue;
                if (column.kind === 'wealth' && person2Re?.test(match[1])) {
                    out.push({ code: match[1], person: '2', column: 'amount', amount: value });
                    continue;
                }
                out.push({ code: match[1], person: column.person ?? '1', column: column.kind, amount: value });
            }
        });
    }
    return out;
}

const valueKey = (code: string, person: ReaderPerson, column: ReaderColumn) => `${code}|${person}|${column}`;

/** Lit un formulaire avec son profil : montants par code, propositions, lignes sans équivalent, contrôle des totaux. */
export function readForm(pages: PageTokens[], profile: FormProfile, labelFor: (target: string) => string = (t) => t): ReadReport {
    const byCode = new Map(profile.lines.map((line) => [line.code, line]));
    const known = new Set([...byCode.keys(), ...profile.totals.map((total) => total.code)]);
    const values = new Map<string, Value>();
    for (const page of pages) {
        if (profile.pages && !profile.pages.includes(page.page)) continue;
        for (const found of readPage(page, profile, known)) {
            const key = valueKey(found.code, found.person, found.column);
            if (!values.has(key)) values.set(key, { amount: found.amount, page: page.page });
        }
    }

    const lines: ReadLine[] = [];
    for (const [key, value] of values) {
        const [code, person, column] = key.split('|') as [string, ReaderPerson, ReaderColumn];
        const line = byCode.get(code);
        if (!line) continue;
        const amount = line.sign === -1 && value.amount > 0 ? -value.amount : value.amount;
        const target = column === 'wealth' ? (line.wealthTarget ?? null) : line.target;
        lines.push({ code, person, column, label: line.label, section: line.section, amount, page: value.page, target });
    }
    lines.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.person.localeCompare(b.person));

    const lookup = (code: string, person: ReaderPerson | '*', column: ReaderColumn) => {
        const get = (p: ReaderPerson) => {
            const value = values.get(valueKey(code, p, column));
            if (!value) return 0;
            return byCode.get(code)?.sign === -1 && value.amount > 0 ? -value.amount : value.amount;
        };
        return person === '*' ? get('1') + get('2') : get(person);
    };

    const evaluate = (rule: TotalRule) => {
        const term = (raw: string) => {
            const [code, suffix] = raw.split(':');
            const column: ReaderColumn = suffix === 'w' ? 'wealth' : suffix === 'a' ? 'amount' : (rule.column ?? 'amount');
            return lookup(code, rule.person, column);
        };
        const total = rule.plus.reduce((sum, code) => sum + term(code), 0) - (rule.minus ?? []).reduce((sum, code) => sum + term(code), 0);
        return rule.floorZero ? Math.max(0, total) : total;
    };

    const totals: TotalCheck[] = profile.totals.map((rule) => {
        const column = rule.column ?? 'amount';
        const read = values.get(valueKey(rule.code, rule.person === '2' ? '2' : '1', column))?.amount ?? null;
        const computed = evaluate(rule);
        // un total imprimé à zéro n'a pas de montant : il est cohérent si les lignes lues somment aussi à zéro
        const status =
            read === null
                ? Math.abs(computed) <= 1 && rule.person !== '2'
                    ? 'ok'
                    : 'missing'
                : Math.abs(read - computed) <= 1
                  ? 'ok'
                  : 'mismatch';
        return { code: rule.code, label: rule.label, read, computed, status };
    });

    // Une ligne est « vérifiée » quand elle entre dans un total imprimé et recoupé, et dans aucun total en écart.
    // Aucune probabilité : un total recoupe ou non (la lecture d'un PDF natif est exacte ou la ligne est mal repérée).
    const confirmed = new Set<string>();
    const contradicted = new Set<string>();
    profile.totals.forEach((rule, index) => {
        const { status, read } = totals[index];
        const persons: ReaderPerson[] = rule.person === '*' ? ['1', '2'] : [rule.person];
        for (const raw of [...rule.plus, ...(rule.minus ?? [])]) {
            const [code, suffix] = raw.split(':');
            const column: ReaderColumn = suffix === 'w' ? 'wealth' : suffix === 'a' ? 'amount' : (rule.column ?? 'amount');
            for (const person of persons) {
                const key = valueKey(code, person, column);
                if (status === 'mismatch') contradicted.add(key);
                else if (status === 'ok' && read !== null) confirmed.add(key);
            }
        }
    });
    const isVerified = (line: ReadLine) => {
        const key = valueKey(line.code, line.person, line.column ?? 'amount');
        return confirmed.has(key) && !contradicted.has(key);
    };
    for (const line of lines) line.check = isVerified(line) ? 'verified' : 'toCheck';

    const mapped = new Map<
        string,
        { target: string; person: ReaderPerson; amount: number; codes: string[]; page: number; verified: boolean }
    >();
    for (const line of lines) {
        if (!line.target) continue;
        const key = `${line.target}|${line.person}`;
        const entry = mapped.get(key) ?? {
            target: line.target,
            person: line.person,
            amount: 0,
            codes: [],
            page: line.page,
            verified: true
        };
        entry.amount += line.amount;
        entry.codes.push(line.code);
        // la proposition regroupe plusieurs lignes : elle n'est vérifiée que si chacune l'est
        entry.verified = entry.verified && line.check === 'verified';
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
            originLabel: `${profile.label} · code${entry.codes.length > 1 ? 's' : ''} ${entry.codes.join(', ')} (p. ${entry.page})`,
            check: entry.verified ? 'verified' : 'toCheck'
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
