/**
 * Import en démo : règles métier appliquées aux lignes lues (catégories, tiers, moyens de paiement,
 * doublons, validation). Portage de `ImportAnalyzer.BuildLinesAsync`, `ImportLineRules`,
 * `ImportLookups` et `ImportAliasMatcher` de l'API, sur la base en mémoire de la démo.
 *
 * Non repris (décision 2 de la roadmap) : le rapprochement des échéances récurrentes.
 */
import type { Alias } from '@/features/aliases/types';
import type { CategoryType } from '@/features/categories/types';
import type { ImportIssue, ImportLine, ImportLineType } from '@/features/imports/types';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { Tier } from '@/features/tiers/types';
import type { DemoDb } from '@/features/demo/db';
import type { ImportCell } from '@/features/demo/imports/csv';
import { LABEL_MAX_LENGTH, type ParsedImportLine } from '@/features/demo/imports/interpreter';
import { duplicateKey, labelKey, normalizeText } from '@/features/demo/imports/text';

/** Plage de `decimal(15,2)` côté API. */
export const MAX_AMOUNT = 9_999_999_999_999.99;
const MAX_NAME_LENGTH = 150;

/** Ligne d'import de la démo : la réponse de l'API, plus les cellules brutes (relecture d'une ligne). */
export interface DemoImportLine extends ImportLine {
    /** Cellules du fichier, vidées à la clôture de l'import. */
    cells: ImportCell[] | null;
}

type DemoCategory = { publicId: string; name: string; type: CategoryType; parentPublicId: string | null };

/** Type déduit du signe : négatif = dépense, positif = revenu. */
export function typeFor(amount: number | null): ImportLineType | null {
    if (amount == null || amount === 0) return null;
    return amount < 0 ? 'depense' : 'revenu';
}

/** Catégorie compatible avec le sens de la ligne (mixte = toujours). */
export function isCategoryCompatible(categoryType: CategoryType, lineType: ImportLineType | null): boolean {
    return (
        categoryType === 'mixte' ||
        (lineType === 'depense' && categoryType === 'depense') ||
        (lineType === 'revenu' && categoryType === 'revenu')
    );
}

/** Trois lettres ASCII, sans contrôle de référentiel. */
export function isCurrencyCode(value: string): boolean {
    return /^[A-Za-z]{3}$/.test(value);
}

/** Arrondi au centime, demi-centime loin de zéro (comme `MidpointRounding.AwayFromZero`). */
export function roundCents(value: number): number {
    const cents = Math.round(Math.abs(value) * 100 + 1e-9) / 100;
    return value < 0 ? -cents : cents;
}

function cents(value: number): number {
    return Math.round(value * 100);
}

function truncate(value: string, max = MAX_NAME_LENGTH): string {
    return value.length <= max ? value : value.slice(0, max);
}

function issue(code: string, field: string | null, message: string): ImportIssue {
    return { code, field, message };
}

/** Contrôles métier (`ImportLineRules.Validate`) : vide si la ligne peut devenir une transaction. */
export function validateLine(
    line: DemoImportLine,
    accountCurrency: string,
    today: string,
    categoryType: CategoryType | null
): ImportIssue[] {
    const issues: ImportIssue[] = [];

    if (!line.operationDate) {
        issues.push(issue('MISSING_DATE', 'operationDate', "Date d'opération manquante."));
    } else if (line.operationDate > today) {
        issues.push(issue('FUTURE_DATE', 'operationDate', "La date d'opération ne peut pas être dans le futur."));
    }

    if (line.operationDate && line.valueDate && line.valueDate < line.operationDate) {
        issues.push(issue('VALUE_DATE_BEFORE_OPERATION', 'valueDate', "La date de valeur ne peut pas précéder la date d'opération."));
    }

    if (!line.label || !line.label.trim()) {
        issues.push(issue('MISSING_LABEL', 'label', 'Libellé manquant.'));
    } else if (line.label.length > LABEL_MAX_LENGTH) {
        issues.push(issue('LABEL_TOO_LONG', 'label', `Le libellé dépasse ${LABEL_MAX_LENGTH} caractères.`));
    }

    if (line.amount == null) issues.push(issue('MISSING_AMOUNT', 'amount', 'Montant manquant.'));
    else if (line.amount === 0) issues.push(issue('ZERO_AMOUNT', 'amount', 'Un montant nul ne crée pas de transaction.'));
    else if (Math.abs(line.amount) > MAX_AMOUNT)
        issues.push(issue('AMOUNT_OUT_OF_RANGE', 'amount', 'Le montant dépasse la plage autorisée.'));

    // Devise illisible au parse : jamais oubliée à la revalidation.
    const rawCurrency = line.original?.currency?.trim();
    if (!line.currency?.trim() && rawCurrency && !isCurrencyCode(rawCurrency)) {
        issues.push(
            issue(
                'INVALID_CURRENCY',
                'currency',
                "Devise illisible (code ISO attendu, ex. CHF) : ignorez la ligne si elle n'est pas dans la devise du compte."
            )
        );
    }

    if (line.currency?.trim() && line.currency.trim().toUpperCase() !== accountCurrency.toUpperCase()) {
        issues.push(
            issue(
                'CURRENCY_MISMATCH',
                'currency',
                `Devise ${line.currency.trim().toUpperCase()} différente de celle du compte (${accountCurrency}).`
            )
        );
    }

    if (categoryType && line.type && !isCategoryCompatible(categoryType, line.type)) {
        issues.push(issue('CATEGORY_TYPE_MISMATCH', 'category', "La catégorie n'est pas compatible avec le sens du montant."));
    }

    return issues;
}

/** Erreur si un contrôle échoue, à valider si un doute subsiste (doublon, catégorie inconnue), sinon validée. */
export function autoStatus(line: DemoImportLine, issues: readonly ImportIssue[]): ImportLine['status'] {
    if (issues.length > 0) return 'erreur';
    if (line.duplicateOfTransactionPublicId != null || line.duplicateOfLineNumber != null) return 'aValider';
    if (line.unmatchedCategoryName != null && line.categoryPublicId == null) return 'aValider';
    return 'validee';
}

/** Une décision déjà prise (validée, ignorée) tient tant que la ligne reste valide. */
export function statusAfterEdit(line: DemoImportLine, issues: readonly ImportIssue[]): ImportLine['status'] {
    if (line.status === 'ignoree') return 'ignoree';
    if (line.status === 'validee' && issues.length === 0) return 'validee';
    return autoStatus(line, issues);
}

/** Problèmes de lecture d'abord ; un contrôle métier sur un champ déjà signalé est redondant. */
export function mergeIssues(parse: readonly ImportIssue[], business: readonly ImportIssue[]): ImportIssue[] {
    const fields = new Set(parse.map((item) => item.field));
    return [...parse, ...business.filter((item) => !fields.has(item.field))];
}

/** Reconnaissance par alias (`ImportAliasMatcher`). */
class AliasMatcher {
    private readonly rules: { targetId: string; alias: Alias; normalized: string; pattern: RegExp | null }[];

    constructor(entries: { targetId: string; alias: Alias; order: number }[]) {
        const rank = (alias: Alias) =>
            alias.matchType === 'exact'
                ? 0
                : alias.matchType === 'startsWith' || alias.matchType === 'endsWith'
                  ? 1
                  : alias.matchType === 'contains'
                    ? 2
                    : 3;
        const rules: { targetId: string; alias: Alias; normalized: string; pattern: RegExp | null; order: number }[] = [];
        for (const entry of entries) {
            if (!entry.alias.isActive) continue;
            if (entry.alias.matchType === 'regex') {
                try {
                    rules.push({ ...entry, normalized: '', pattern: new RegExp(entry.alias.value, 'iu') });
                } catch {
                    // Motif invalide : l'alias est inopérant.
                }
                continue;
            }
            const normalized = normalizeText(entry.alias.value);
            if (normalized) rules.push({ ...entry, normalized, pattern: null });
        }
        rules.sort(
            (a, b) =>
                b.alias.priority - a.alias.priority ||
                rank(a.alias) - rank(b.alias) ||
                b.normalized.length - a.normalized.length ||
                a.order - b.order
        );
        this.rules = rules;
    }

    match(...values: (string | null | undefined)[]): string | null {
        for (const raw of values) {
            const normalized = normalizeText(raw);
            if (!normalized) continue;
            for (const rule of this.rules) {
                if (isAliasMatch(rule.alias.matchType, rule.normalized, rule.pattern, raw as string, normalized)) return rule.targetId;
            }
        }
        return null;
    }
}

function isAliasMatch(type: Alias['matchType'], value: string, pattern: RegExp | null, raw: string, normalized: string): boolean {
    switch (type) {
        case 'exact':
            return normalized === value;
        case 'startsWith':
            return normalized.startsWith(value);
        case 'endsWith':
            return normalized.endsWith(value);
        case 'contains':
            return normalized.includes(value);
        default:
            return pattern?.test(raw) ?? false;
    }
}

/** Référentiels de la démo pour une analyse (`ImportLookups`). */
export class DemoImportLookups {
    private readonly categoriesById = new Map<string, DemoCategory>();
    private readonly categoriesByName = new Map<string, DemoCategory[]>();
    private readonly tiersById = new Map<string, Tier>();
    private readonly tiersByName = new Map<string, Tier>();
    private readonly methodsById = new Map<string, PaymentMethod>();
    private readonly methodsByName = new Map<string, PaymentMethod>();
    private readonly methodsByDigits = new Map<string, PaymentMethod>();
    private readonly categoryByLabel = new Map<string, string>();
    private readonly tierByLabel = new Map<string, string>();
    private readonly methodByLabel = new Map<string, string>();
    private readonly tierAliases: AliasMatcher;
    private readonly methodAliases: AliasMatcher;

    constructor(db: DemoDb, accountPublicId: string, withHistory: boolean) {
        const categories: DemoCategory[] = [];
        for (const root of db.categories) {
            categories.push(root);
            for (const child of root.children ?? []) categories.push(child);
        }
        for (const category of categories) this.categoriesById.set(category.publicId, category);
        for (const category of categories) {
            this.addCategory(normalizeText(category.name), category);
            const parent = category.parentPublicId ? this.categoriesById.get(category.parentPublicId) : undefined;
            if (parent) this.addCategory(normalizeText(`${parent.name} ${category.name}`), category);
        }

        for (const tier of db.tiers) {
            this.tiersById.set(tier.publicId, tier);
            const key = normalizeText(tier.name);
            if (key && !this.tiersByName.has(key)) this.tiersByName.set(key, tier);
        }

        const methods = db.paymentMethods.filter((item) => item.accountPublicId === accountPublicId && item.isActive);
        const digitCounts = new Map<string, number>();
        for (const method of methods) {
            this.methodsById.set(method.publicId, method);
            const key = normalizeText(method.label);
            if (key && !this.methodsByName.has(key)) this.methodsByName.set(key, method);
            if (method.lastFourDigits?.length === 4)
                digitCounts.set(method.lastFourDigits, (digitCounts.get(method.lastFourDigits) ?? 0) + 1);
        }
        // 4 derniers chiffres : seulement s'ils désignent un seul moyen du compte.
        for (const method of methods) {
            if (method.lastFourDigits?.length === 4 && digitCounts.get(method.lastFourDigits) === 1) {
                this.methodsByDigits.set(method.lastFourDigits, method);
            }
        }

        let order = 0;
        const tierEntries = db.tiers.flatMap((tier) =>
            (db.aliases[tier.publicId] ?? []).map((alias) => ({ targetId: tier.publicId, alias, order: order++ }))
        );
        const methodEntries = methods.flatMap((method) =>
            (db.aliases[method.publicId] ?? []).map((alias) => ({ targetId: method.publicId, alias, order: order++ }))
        );
        this.tierAliases = new AliasMatcher(tierEntries);
        this.methodAliases = new AliasMatcher(methodEntries);

        if (withHistory) {
            // Le plus récent d'abord : il l'emporte sur un libellé équivalent.
            const history = db.transactions
                .slice()
                .sort((a, b) => b.operationDate.localeCompare(a.operationDate) || b.createdAt.localeCompare(a.createdAt));
            for (const tx of history) {
                const key = labelKey(tx.label);
                if (!key) continue;
                if (tx.categoryPublicId && this.categoriesById.has(tx.categoryPublicId)) {
                    const categoryKey = `${tx.type}|${key}`;
                    if (!this.categoryByLabel.has(categoryKey)) this.categoryByLabel.set(categoryKey, tx.categoryPublicId);
                }
                if (tx.tierPublicId && this.tiersById.has(tx.tierPublicId) && !this.tierByLabel.has(key)) {
                    this.tierByLabel.set(key, tx.tierPublicId);
                }
                if (tx.paymentMethodPublicId && this.methodsById.has(tx.paymentMethodPublicId) && !this.methodByLabel.has(key)) {
                    this.methodByLabel.set(key, tx.paymentMethodPublicId);
                }
            }
        }
    }

    private addCategory(key: string, category: DemoCategory) {
        if (!key) return;
        const list = this.categoriesByName.get(key) ?? [];
        list.push(category);
        this.categoriesByName.set(key, list);
    }

    categoryById(id: string | null | undefined): DemoCategory | null {
        return id ? (this.categoriesById.get(id) ?? null) : null;
    }

    tierById(id: string | null | undefined): Tier | null {
        return id ? (this.tiersById.get(id) ?? null) : null;
    }

    paymentMethodById(id: string | null | undefined): PaymentMethod | null {
        return id ? (this.methodsById.get(id) ?? null) : null;
    }

    /** Catégorie du fichier par nom, du bon type ; la plus spécifique au type gagne sur « mixte ». */
    matchCategory(name: string | null, type: ImportLineType | null): DemoCategory | null {
        const candidates = this.categoriesByName.get(normalizeText(name)) ?? [];
        const compatible = candidates.filter((item) => isCategoryCompatible(item.type, type));
        return compatible.find((item) => item.type !== 'mixte') ?? compatible[0] ?? null;
    }

    /** Tier de la colonne du fichier : alias, sinon nom. */
    matchTier(name: string | null): Tier | null {
        const byAlias = this.tierById(this.tierAliases.match(name));
        if (byAlias) return byAlias;
        const key = normalizeText(name);
        return key ? (this.tiersByName.get(key) ?? null) : null;
    }

    matchTierInLabel(originalLabel: string | null, label: string | null): Tier | null {
        return this.tierById(this.tierAliases.match(originalLabel, label));
    }

    suggestCategory(label: string | null, type: ImportLineType | null): DemoCategory | null {
        const key = labelKey(label);
        if (!key || !type) return null;
        const category = this.categoryById(this.categoryByLabel.get(`${type}|${key}`));
        return category && isCategoryCompatible(category.type, type) ? category : null;
    }

    suggestTier(label: string | null): Tier | null {
        const key = labelKey(label);
        return key ? this.tierById(this.tierByLabel.get(key)) : null;
    }

    /** Moyen du fichier : alias, libellé, sinon 4 derniers chiffres s'ils désignent un seul moyen. */
    matchPaymentMethod(name: string | null): PaymentMethod | null {
        const byAlias = this.paymentMethodById(this.methodAliases.match(name));
        if (byAlias) return byAlias;
        const key = normalizeText(name);
        if (!key) return null;
        const byName = this.methodsByName.get(key);
        if (byName) return byName;
        const digits = (name ?? '').replace(/[^0-9]/g, '');
        return digits.length >= 4 ? (this.methodsByDigits.get(digits.slice(-4)) ?? null) : null;
    }

    matchPaymentMethodInLabel(originalLabel: string | null, label: string | null): PaymentMethod | null {
        return this.paymentMethodById(this.methodAliases.match(originalLabel, label));
    }

    suggestPaymentMethod(label: string | null): PaymentMethod | null {
        const key = labelKey(label);
        return key ? this.paymentMethodById(this.methodByLabel.get(key)) : null;
    }
}

/**
 * Transactions du compte sur la période du fichier, par (date, montant signé, libellé normalisé).
 * Chaque transaction ne sert qu'une fois : deux cafés identiques contre un seul en base, le second
 * est un doublon dans le fichier.
 */
export class ExistingTransactionIndex {
    private readonly byKey = new Map<string, string[]>();
    private readonly consumed = new Set<string>();

    constructor(db: DemoDb, accountPublicId: string, from: string | null, to: string | null) {
        if (!from || !to) return;
        const rows = db.transactions
            .filter((tx) => tx.operationDate >= from && tx.operationDate <= to)
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        for (const tx of rows) {
            for (const move of tx.movements) {
                if (move.accountPublicId !== accountPublicId || move.amount == null) continue;
                const signed = move.sens === 'credit' ? move.amount : -move.amount;
                const key = this.keyOf(tx.operationDate, signed, tx.label);
                const list = this.byKey.get(key) ?? [];
                list.push(tx.publicId);
                this.byKey.set(key, list);
            }
        }
    }

    private keyOf(date: string, amount: number, label: string): string {
        return `${date}|${cents(amount)}|${duplicateKey(label)}`;
    }

    consume(transactionPublicId: string) {
        this.consumed.add(transactionPublicId);
    }

    tryConsume(date: string, amount: number, ...labels: (string | null)[]): string | null {
        for (const label of labels) {
            if (!label || !label.trim()) continue;
            for (const id of this.byKey.get(this.keyOf(date, amount, label)) ?? []) {
                if (!this.consumed.has(id)) {
                    this.consumed.add(id);
                    return id;
                }
            }
        }
        return null;
    }
}

export interface LineBuildContext {
    accountCurrency: string;
    lookups: DemoImportLookups;
    existing: ExistingTransactionIndex;
    defaultPaymentMethodPublicId: string | null;
    today: string;
    newId: () => string;
}

/** Ligne non traitée : montant hors plage non gardé, date de valeur antérieure abandonnée, devise illisible ignorée. */
function newLine(parsed: ParsedImportLine, publicId: string): DemoImportLine {
    const rounded = parsed.amount == null ? null : roundCents(parsed.amount);
    const amount = rounded != null && Math.abs(rounded) <= MAX_AMOUNT ? rounded : null;
    const balance = parsed.balance != null && Math.abs(parsed.balance) <= MAX_AMOUNT ? parsed.balance : null;
    const valueDate = parsed.valueDate && parsed.operationDate && parsed.valueDate < parsed.operationDate ? null : parsed.valueDate;
    return {
        publicId,
        lineNumber: parsed.rowNumber,
        status: 'aValider',
        operationDate: parsed.operationDate,
        valueDate,
        label: parsed.label,
        amount,
        type: typeFor(amount),
        currency: parsed.currency && isCurrencyCode(parsed.currency) ? parsed.currency : null,
        balance,
        categoryPublicId: null,
        categorySuggested: false,
        unmatchedCategoryName: null,
        tierPublicId: null,
        unmatchedTierName: null,
        paymentMethodPublicId: null,
        unmatchedPaymentMethodName: null,
        recurringDue: null,
        duplicateOfTransactionPublicId: null,
        duplicateOfLineNumber: null,
        isEdited: false,
        transactionPublicId: null,
        issues: [],
        original: {
            operationDate: parsed.operationDate,
            valueDate: parsed.valueDate,
            label: parsed.originalLabel,
            amount: parsed.amount == null ? null : roundCents(parsed.amount),
            currency: parsed.currency,
            categoryName: parsed.categoryName,
            tierName: parsed.tierName,
            paymentMethodName: parsed.paymentMethodName
        },
        cells: parsed.cells
    };
}

/** Catégorie (colonne, sinon historique) puis tier (colonne, alias dans le libellé, historique). */
function applyCategoryAndTier(line: DemoImportLine, parsed: ParsedImportLine, lookups: DemoImportLookups) {
    const learningLabel = parsed.originalLabel ?? parsed.label;
    if (parsed.categoryName != null) {
        const category = lookups.matchCategory(parsed.categoryName, line.type);
        if (category) line.categoryPublicId = category.publicId;
        else line.unmatchedCategoryName = truncate(parsed.categoryName);
    } else {
        const suggested = lookups.suggestCategory(learningLabel, line.type);
        if (suggested) {
            line.categoryPublicId = suggested.publicId;
            line.categorySuggested = true;
        }
    }

    if (parsed.tierName != null) {
        const tier = lookups.matchTier(parsed.tierName);
        if (tier) line.tierPublicId = tier.publicId;
        else line.unmatchedTierName = truncate(parsed.tierName);
    } else {
        const tier = lookups.matchTierInLabel(parsed.originalLabel, parsed.label) ?? lookups.suggestTier(learningLabel);
        if (tier) line.tierPublicId = tier.publicId;
    }
}

/** Moyen : colonne (inconnu = créé à la validation), sinon alias dans le libellé, moyen par défaut, historique. */
function applyPaymentMethod(line: DemoImportLine, parsed: ParsedImportLine, context: LineBuildContext) {
    const { lookups } = context;
    if (parsed.paymentMethodName != null) {
        const matched = lookups.matchPaymentMethod(parsed.paymentMethodName);
        line.paymentMethodPublicId = matched?.publicId ?? null;
        line.unmatchedPaymentMethodName = matched ? null : truncate(parsed.paymentMethodName);
        return;
    }
    const method =
        lookups.matchPaymentMethodInLabel(parsed.originalLabel, parsed.label) ??
        lookups.paymentMethodById(context.defaultPaymentMethodPublicId) ??
        lookups.suggestPaymentMethod(parsed.originalLabel ?? parsed.label);
    line.paymentMethodPublicId = method?.publicId ?? null;
    line.unmatchedPaymentMethodName = null;
}

/**
 * Lignes lues → lignes d'import : validation, catégorie, tier, moyen, doublons contre le compte et
 * dans le fichier, puis statut automatique.
 */
export function buildLines(parsed: readonly ParsedImportLine[], context: LineBuildContext): DemoImportLine[] {
    const firstLineByKey = new Map<string, number>();
    const result: DemoImportLine[] = [];

    for (const p of parsed) {
        const line = newLine(p, context.newId());
        if (p.isParasite) {
            const note = p.issues.find((item) => item.code === 'AUTO_IGNORED') ?? {
                code: 'AUTO_IGNORED',
                field: null,
                message: 'Ligne sans date ou total reporté (titre, solde, pied de page) : ignorée automatiquement.'
            };
            line.status = 'ignoree';
            line.issues = [{ code: note.code, field: note.field, message: note.message }];
            result.push(line);
            continue;
        }

        const parseIssues: ImportIssue[] = p.issues.map((item) => ({ code: item.code, field: item.field, message: item.message }));
        if (p.amount != null && Math.abs(roundCents(p.amount)) > MAX_AMOUNT) {
            parseIssues.push(issue('AMOUNT_OUT_OF_RANGE', 'amount', 'Le montant dépasse la plage autorisée.'));
        }

        applyCategoryAndTier(line, p, context.lookups);
        applyPaymentMethod(line, p, context);

        if (line.operationDate && line.amount != null && line.amount !== 0 && line.label) {
            const key = `${line.operationDate}|${cents(line.amount)}|${duplicateKey(line.label)}`;
            const duplicate = context.existing.tryConsume(line.operationDate, line.amount, line.label, p.originalLabel);
            if (duplicate) line.duplicateOfTransactionPublicId = duplicate;
            else if (firstLineByKey.has(key)) line.duplicateOfLineNumber = firstLineByKey.get(key) ?? null;
            if (!firstLineByKey.has(key)) firstLineByKey.set(key, line.lineNumber);
        }

        const categoryType = context.lookups.categoryById(line.categoryPublicId)?.type ?? null;
        const issues = mergeIssues(parseIssues, validateLine(line, context.accountCurrency, context.today, categoryType));
        line.type = typeFor(line.amount);
        line.issues = issues;
        line.status = autoStatus(line, issues);
        result.push(line);
    }

    return result;
}
