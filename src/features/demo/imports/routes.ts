/**
 * Import en démo : les routes `/api/imports` et `/api/import-templates`, sans aucun envoi.
 *
 * Le fichier choisi est lu dans l'onglet (`read.ts`) ; ses octets restent en mémoire le temps de la
 * revue (relecture avec un autre mapping), puis sont oubliés à la validation, à l'annulation ou à la
 * suppression. Les lignes vivent dans la base en mémoire de la démo et disparaissent au rechargement.
 */
import { AppError } from '@/utils/errors/app-error';
import type { Account } from '@/features/accounts/types';
import type {
    BulkUpdateImportLinesPayload,
    CreateImportTemplatePayload,
    Import,
    ImportIssue,
    ImportLine,
    ImportLineSortKey,
    ImportLineStatus,
    ImportMapping,
    ImportPreview,
    ImportSourceType,
    ImportStatus,
    ImportTemplate,
    ImportTemplateSuggestion,
    ImportWarning,
    SaveImportAsTemplatePayload,
    UpdateImportLinePayload,
    UpdateImportTemplatePayload
} from '@/features/imports/types';
import type { PaymentMethod } from '@/features/payment-methods/types';
import type { Tier } from '@/features/tiers/types';
import type { Transaction } from '@/features/transactions/types';
import { DEMO_USER_PUBLIC_ID } from '@/features/demo/user';
import {
    DEMO_BANKS,
    applyMovement,
    buildMovements,
    createPublicId,
    demoDb,
    localYmd,
    refreshBudgets,
    refreshGoals,
    type DemoDb
} from '@/features/demo/db';
import { cellDisplay, rowIsBlank, type ImportTable } from '@/features/demo/imports/csv';
import { HEADER_SEARCH_ROWS, LABEL_MAX_LENGTH, parseRow, type ImportLayout } from '@/features/demo/imports/interpreter';
import { toMappingSpec } from '@/features/demo/imports/mapping';
import { ensureCsvSource, readStatement } from '@/features/demo/imports/read';
import { normalizeText, labelKey } from '@/features/demo/imports/text';
import {
    DemoImportLookups,
    ExistingTransactionIndex,
    MAX_AMOUNT,
    buildLines,
    isCategoryCompatible,
    roundCents,
    statusAfterEdit,
    typeFor,
    validateLine,
    type DemoImportLine
} from '@/features/demo/imports/analysis';

/** Import de la démo : la réponse de l'API, ses lignes et de quoi relire une ligne. */
export interface DemoImportJob {
    import: Import;
    lines: DemoImportLine[];
    /** Disposition des colonnes, pour remettre une ligne à zéro. */
    layout: ImportLayout | null;
    fileHash: string;
}

type DemoResult = { status: number; body: unknown } | null;

/** Délai d'expiration d'un import ouvert (`ImportOptions.ExpireAfterDays`). */
const EXPIRE_AFTER_DAYS = 30;
const LINES_PAGE_SIZE_DEFAULT = 50;
const LINES_PAGE_SIZE_MAX = 200;
const IMPORTS_PAGE_SIZE_DEFAULT = 20;
const IMPORTS_PAGE_SIZE_MAX = 100;
const MAX_BULK_IDS = 2000;
const TEMPLATE_NAME_MAX = 150;

const OPEN_STATUSES: readonly ImportStatus[] = ['erreur', 'aValider'];
const LINE_STATUSES: readonly ImportLineStatus[] = ['validee', 'aValider', 'erreur', 'ignoree'];
/** Ordre de l'énumération de l'API, utilisé par le tri « statut ». */
const LINE_STATUS_ORDER: Record<ImportLineStatus, number> = { aValider: 2, validee: 3, ignoree: 4, erreur: 5 };

/** Modèles fournis par Spend.Up (`SystemImportTemplates`). */
const SYSTEM_TEMPLATES: readonly (Omit<ImportTemplate, 'bankPublicId'> & { bankIid: string | null })[] = [
    {
        publicId: 'system-postfinance-csv',
        name: 'PostFinance (CSV)',
        description: "Export CSV e-finance (FR / DE). Lignes d'informations avant l'en-tête et colonnes crédit / débit détectées.",
        sourceType: 'csv',
        mapping: { separator: ';' },
        bankIid: '09000'
    },
    {
        publicId: 'system-ubs-csv',
        name: 'UBS (CSV)',
        description: 'Export CSV UBS e-banking (FR / DE / EN). Colonnes débit / crédit et solde détectées.',
        sourceType: 'csv',
        mapping: { separator: ';' },
        bankIid: '00230'
    },
    {
        publicId: 'system-raiffeisen-csv',
        name: 'Raiffeisen (CSV)',
        description: 'Export CSV Raiffeisen e-banking. Montant signé et solde détectés.',
        sourceType: 'csv',
        mapping: { separator: ';' },
        bankIid: '80000'
    },
    {
        publicId: 'system-credit-card-csv',
        name: 'Carte de crédit — achats en positif (CSV)',
        description: 'Relevés de carte où les achats sont positifs et les remboursements négatifs : le signe est inversé.',
        sourceType: 'csv',
        mapping: { invertSign: true },
        bankIid: null
    },
    {
        publicId: 'system-credit-card-excel',
        name: 'Carte de crédit — achats en positif (Excel)',
        description: 'Relevés de carte où les achats sont positifs et les remboursements négatifs : le signe est inversé.',
        sourceType: 'excel',
        mapping: { invertSign: true },
        bankIid: null
    }
].map((item) => ({
    ...item,
    sourceType: item.sourceType as ImportSourceType,
    isSystem: true,
    isActive: true,
    bankTierPublicId: null,
    createdAt: null,
    updatedAt: null
}));

function invalid(message: string): never {
    throw new AppError(message, 400);
}

function notFound(message: string): never {
    throw new AppError(message, 404);
}

function ok(body: unknown): DemoResult {
    return { status: 200, body };
}

function noContent(): DemoResult {
    return { status: 204, body: undefined };
}

function match(path: string, pattern: string): Record<string, string> | null {
    const actual = path.split('/').filter(Boolean);
    const expected = pattern.split('/').filter(Boolean);
    if (actual.length !== expected.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < expected.length; i += 1) {
        if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
        else if (expected[i] !== actual[i]) return null;
    }
    return params;
}

function has(body: unknown, key: string): boolean {
    return !!body && typeof body === 'object' && key in body && (body as Record<string, unknown>)[key] !== undefined;
}

function stamp(): string {
    return new Date().toISOString();
}

function today(): string {
    return localYmd(new Date());
}

function dmy(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}.${month}.${year}`;
}

function clampPage(raw: string | null, fallback: number, max: number): number {
    const value = Number(raw ?? fallback);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(1, Math.trunc(value)));
}

// --- Accès aux données -------------------------------------------------------------------------

function jobs(): DemoImportJob[] {
    return demoDb().imports;
}

function findJob(publicId: string): DemoImportJob {
    const job = jobs().find((item) => item.import.publicId === publicId.trim());
    if (!job) notFound('Import introuvable.');
    return job;
}

function findAccount(publicId: string | null | undefined): Account {
    const account = demoDb().accounts.find((item) => item.publicId === publicId?.trim());
    if (!account) notFound('Compte introuvable.');
    return account;
}

/** Compte cible encore présent (`ImportRules.RequireTargetAccessAsync`). */
function targetAccount(job: DemoImportJob): Account {
    const account = demoDb().accounts.find((item) => item.publicId === job.import.accountPublicId);
    if (!account) invalid("Le compte cible de cet import n'existe plus.");
    return account;
}

function ensureActive(account: Account, action: string) {
    if (!account.isActive) invalid(`Impossible ${action} un compte archivé. Restaurez-le d'abord.`);
}

function ensureStatus(job: DemoImportJob, action: string, allowed: readonly ImportStatus[]) {
    const status = job.import.status;
    if (allowed.includes(status)) return;
    if (status === 'valide') invalid(`Impossible ${action} : l'import est déjà validé.`);
    if (status === 'annule') invalid(`Impossible ${action} : l'import est annulé.`);
    if (status === 'erreur') invalid(`Impossible ${action} : associez d'abord les colonnes du fichier.`);
    invalid(`Impossible ${action} dans l'état actuel de l'import.`);
}

/** Moyen actif du compte, ou `null` si aucun n'est demandé (`TransactionRules.ResolvePaymentMethodAsync`). */
function resolvePaymentMethod(publicId: string | null | undefined, account: Account): PaymentMethod | null {
    if (!publicId || !publicId.trim()) return null;
    const method = demoDb().paymentMethods.find((item) => item.publicId === publicId.trim());
    if (!method) invalid('Moyen de paiement introuvable.');
    if (method.accountPublicId !== account.publicId) {
        invalid("Ce moyen de paiement n'appartient pas au compte concerné par le mouvement.");
    }
    if (!method.isActive) invalid('Ce moyen de paiement est inactif.');
    return method;
}

function parseLineStatus(raw: string | null | undefined): ImportLineStatus | null {
    if (!raw || !raw.trim()) return null;
    const found = LINE_STATUSES.find((item) => item.toLowerCase() === raw.trim().toLowerCase());
    if (!found) invalid('Statut de ligne invalide (validee, aValider, erreur, ignoree).');
    return found;
}

function parseImportStatus(raw: string | null): ImportStatus | null {
    if (!raw || !raw.trim()) return null;
    const statuses: ImportStatus[] = ['erreur', 'aValider', 'valide', 'annule'];
    const found = statuses.find((item) => item.toLowerCase() === raw.trim().toLowerCase());
    if (!found) invalid("Statut d'import invalide (erreur, aValider, valide, annule).");
    return found;
}

function parseSourceType(raw: string | null | undefined): ImportSourceType {
    const value = raw?.trim().toLowerCase();
    if (value === 'csv') return 'csv';
    if (value === 'excel' || value === 'xlsx') return 'excel';
    invalid('Type de source invalide (csv, excel).');
}

// --- Projections -------------------------------------------------------------------------------

function toLineResponse(line: DemoImportLine): ImportLine {
    const response: ImportLine & { cells?: unknown } = {
        ...line,
        issues: line.issues.map((item) => ({ ...item })),
        original: line.original ? { ...line.original } : null
    };
    delete response.cells;
    return response;
}

/** Compteurs recalculés depuis les lignes (`ImportRules.RecountAsync`). */
function recount(job: DemoImportJob) {
    const count = (status: ImportLineStatus) => job.lines.filter((line) => line.status === status).length;
    const total = job.lines.length;
    const validated = count('validee');
    const errors = count('erreur');
    const ignored = count('ignoree');
    job.import.counts = { total, validated, errors, ignored, toReview: Math.max(0, total - validated - errors - ignored) };
}

function touch(job: DemoImportJob) {
    job.import.updatedAt = stamp();
}

function toResponse(job: DemoImportJob): Import {
    const item = job.import;
    const account = demoDb().accounts.find((row) => row.publicId === item.accountPublicId) ?? null;
    let expiresAt: string | null = null;
    if (OPEN_STATUSES.includes(item.status)) {
        const last = new Date(item.updatedAt ?? item.createdAt);
        last.setUTCDate(last.getUTCDate() + EXPIRE_AFTER_DAYS);
        expiresAt = last.toISOString();
    }
    return {
        ...item,
        accountPublicId: account?.publicId ?? null,
        accountName: account?.name ?? null,
        accountCurrency: account?.currency ?? null,
        counts: { ...item.counts },
        expiresAt,
        analysis: {
            ...item.analysis,
            sheetNames: [...item.analysis.sheetNames],
            columns: item.analysis.columns.map((column) => ({ ...column })),
            sample: item.analysis.sample.map((row) => [...row]),
            mapping: item.analysis.mapping ? structuredClone(item.analysis.mapping) : null,
            errors: item.analysis.errors.map((error) => ({ ...error })),
            warnings: item.analysis.warnings.map((warning) => ({ ...warning })),
            suggestedTemplates: item.analysis.suggestedTemplates.map((suggestion) => ({ ...suggestion }))
        }
    };
}

/** Vide cellules brutes, valeurs d'origine et échantillon d'un import clos (`ImportRawDataPurge`). */
function purgeRawData(job: DemoImportJob) {
    for (const line of job.lines) {
        line.cells = null;
        line.original = null;
    }
    job.import.analysis.sample = [];
    job.layout = null;
    forgetFile(job.import.publicId);
}

function forgetFile(importPublicId: string) {
    delete demoDb().importFiles[importPublicId];
}

// --- Modèles -----------------------------------------------------------------------------------

function systemTemplate(publicId: string | null | undefined) {
    const id = publicId?.trim().toLowerCase();
    return id ? SYSTEM_TEMPLATES.find((item) => item.publicId === id) : undefined;
}

function bankPublicIdFor(iid: string | null): string | null {
    if (!iid) return null;
    return DEMO_BANKS.find((bank) => bank.iid === iid)?.publicId ?? `bank-${iid}`;
}

function toSystemResponse(template: (typeof SYSTEM_TEMPLATES)[number]): ImportTemplate {
    const { bankIid, ...rest } = template;
    return { ...rest, mapping: structuredClone(rest.mapping), bankPublicId: bankPublicIdFor(bankIid) };
}

function toTemplateResponse(template: ImportTemplate): ImportTemplate {
    return { ...template, mapping: structuredClone(template.mapping) };
}

function ownTemplate(publicId: string | null | undefined): ImportTemplate {
    if (systemTemplate(publicId)) invalid('Les modèles fournis par Spend.Up ne sont pas modifiables.');
    const template = demoDb().importTemplates.find((item) => item.publicId === publicId?.trim());
    if (!template) notFound('Modèle introuvable.');
    return template;
}

function normalizeTemplateName(raw: string | null | undefined): string {
    if (!raw || !raw.trim()) invalid('Le nom du modèle est obligatoire.');
    const name = raw.trim();
    if (name.length > TEMPLATE_NAME_MAX) invalid(`Le nom du modèle dépasse ${TEMPLATE_NAME_MAX} caractères.`);
    return name;
}

function ensureTemplateNameAvailable(name: string, excludePublicId: string | null) {
    const key = normalizeText(name);
    if (demoDb().importTemplates.some((item) => item.publicId !== excludePublicId && normalizeText(item.name) === key)) {
        invalid('Un modèle porte déjà ce nom.');
    }
}

/** Valide le mapping d'un modèle. La démo ne lit pas les classeurs : un mapping Excel est contrôlé sans sa feuille. */
function validateTemplateMapping(mapping: ImportMapping | null | undefined, sourceType: ImportSourceType): ImportMapping {
    if (!mapping) invalid('Le mapping du modèle est obligatoire.');
    toMappingSpec(sourceType === 'excel' ? { ...mapping, sheetName: null, encoding: null, separator: null } : mapping);
    return mapping;
}

/** Tier banque de la démo, ou `null` si aucun n'est demandé. */
function resolveBankTier(publicId: string | null | undefined): string | null {
    if (!publicId || !publicId.trim()) return null;
    const tier = demoDb().tiers.find((item) => item.publicId === publicId.trim());
    if (!tier) invalid('Tier introuvable.');
    if (!tier.bank) invalid("La banque d'un modèle doit être un tier banque (volet banque).");
    return tier.publicId;
}

/** Mapping d'un modèle choisi à l'upload ou au reparse : système, ou personnel actif du même type. */
function resolveTemplateMapping(publicId: string): { mapping: ImportMapping; templatePublicId: string } {
    const sourceType: ImportSourceType = 'csv';
    const system = systemTemplate(publicId);
    const template = system ?? demoDb().importTemplates.find((item) => item.publicId === publicId.trim());
    if (!template) notFound('Modèle introuvable.');
    if (!template.isActive) invalid("Ce modèle est désactivé : réactivez-le pour l'utiliser.");
    if (template.sourceType !== sourceType) invalid(`Ce modèle lit des fichiers ${template.sourceType}, pas ${sourceType}.`);
    return { mapping: structuredClone(template.mapping), templatePublicId: template.publicId };
}

function referencedHeaders(mapping: ImportMapping): string[] {
    return Object.values(mapping.columns ?? {})
        .filter((value): value is string => typeof value === 'string' && !!value.trim() && !value.trim().startsWith('#'))
        .map((value) => value.trim());
}

/** Modèles suggérés : en-têtes nommés présents, ou modèle de la banque du compte (en premier). */
function suggestTemplates(table: ImportTable, account: Account): ImportTemplateSuggestion[] {
    const db = demoDb();
    const bankTier = account.institutionTierPublicId ? db.tiers.find((item) => item.publicId === account.institutionTierPublicId) : null;
    const accountIid = bankTier?.bank?.iid ?? null;
    const candidates = [
        ...db.importTemplates
            .filter((item) => item.isActive)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => ({
                template: item,
                matchesBank: !!account.institutionTierPublicId && item.bankTierPublicId === account.institutionTierPublicId
            })),
        ...SYSTEM_TEMPLATES.map((item) => ({ template: toSystemResponse(item), matchesBank: !!accountIid && item.bankIid === accountIid }))
    ].filter((item) => item.template.sourceType === 'csv');

    const headerRows = table.rows
        .filter((row) => !rowIsBlank(row))
        .slice(0, HEADER_SEARCH_ROWS)
        .map((row) => new Set(row.cells.map((cell) => normalizeText(cellDisplay(cell)))));

    const retained = candidates.filter(({ template, matchesBank }) => {
        if (matchesBank) return true;
        const referenced = referencedHeaders(template.mapping).map((header) => normalizeText(header));
        return referenced.length > 0 && headerRows.some((row) => referenced.every((header) => row.has(header)));
    });
    // Tri stable : la banque du compte d'abord.
    return [...retained.filter((item) => item.matchesBank), ...retained.filter((item) => !item.matchesBank)].map(({ template }) => ({
        publicId: template.publicId,
        name: template.name
    }));
}

// --- Analyse -----------------------------------------------------------------------------------

function isTruncatedExportNotice(normalized: string): boolean {
    if (!normalized) return false;
    const first = ['premieres', 'first', 'ersten'].some((word) => normalized.includes(word));
    return first && ['exporte', 'exported', 'exportiert'].some((word) => normalized.includes(word));
}

function buildWarnings(
    job: { accountPublicId: string; fileHash: string; excludePublicId: string | null },
    periodFrom: string | null,
    table: ImportTable,
    headerRow: number | null
): ImportWarning[] {
    const warnings: ImportWarning[] = [];
    const others = jobs().filter(
        (item) => item.import.accountPublicId === job.accountPublicId && item.import.publicId !== job.excludePublicId
    );

    const sameFile = others
        .filter((item) => item.fileHash === job.fileHash && item.import.status !== 'annule')
        .sort((a, b) => b.import.createdAt.localeCompare(a.import.createdAt))[0];
    if (sameFile) {
        warnings.push({
            code: 'FILE_ALREADY_IMPORTED',
            message: `Ce fichier a déjà été importé sur ce compte le ${dmy(localYmd(new Date(sameFile.import.createdAt)))}.`,
            importPublicId: sameFile.import.publicId,
            date: localYmd(new Date(sameFile.import.createdAt))
        });
    }

    if (periodFrom) {
        const lastEnd = others
            .filter((item) => item.import.status === 'valide' && item.import.periodTo)
            .map((item) => item.import.periodTo as string)
            .sort()
            .at(-1);
        if (lastEnd && lastEnd >= periodFrom) {
            warnings.push({
                code: 'PERIOD_OVERLAP',
                message:
                    `Le dernier import validé de ce compte s'arrête au ${dmy(lastEnd)} ; ce fichier commence le ${dmy(periodFrom)}. ` +
                    'Les opérations communes sont signalées comme doublons probables.',
                importPublicId: null,
                date: lastEnd
            });
        }
    }

    if (headerRow && headerRow > 0) {
        const truncated = table.rows.some(
            (row) =>
                row.rowNumber < headerRow &&
                !rowIsBlank(row) &&
                row.cells.some((cell) => isTruncatedExportNotice(normalizeText(cellDisplay(cell))))
        );
        if (truncated) {
            warnings.push({
                code: 'EXPORT_TRUNCATED',
                message:
                    "L'export est incomplet : le fichier indique que seules les premières transactions de la période ont été exportées."
            });
        }
    }

    return warnings;
}

/** Lit le fichier et construit statut, analyse et lignes (`ImportAnalyzer.AnalyzeAsync`). Ne persiste rien. */
function analyze(
    db: DemoDb,
    account: Account,
    bytes: Uint8Array,
    mapping: ImportMapping | null,
    defaultPaymentMethodPublicId: string | null,
    fileHash: string,
    excludePublicId: string | null
) {
    const { table, interpretation, retained } = readStatement(bytes, mapping);
    const fatal = interpretation.fatalErrors.length > 0;

    let lines: DemoImportLine[] = [];
    if (!fatal) {
        const dates = interpretation.lines
            .map((line) => line.operationDate)
            .filter((date): date is string => !!date)
            .sort();
        lines = buildLines(interpretation.lines, {
            accountCurrency: account.currency,
            lookups: new DemoImportLookups(db, account.publicId, true),
            existing: new ExistingTransactionIndex(db, account.publicId, dates[0] ?? null, dates.at(-1) ?? null),
            defaultPaymentMethodPublicId,
            today: today(),
            newId: createPublicId
        });
    }

    const dated = lines
        .filter((line) => line.status !== 'ignoree' && line.operationDate)
        .map((line) => line.operationDate as string)
        .sort();
    const periodFrom = dated[0] ?? null;
    const periodTo = dated.at(-1) ?? null;

    return {
        status: (fatal ? 'erreur' : 'aValider') as ImportStatus,
        lines,
        layout: interpretation.layout,
        periodFrom,
        periodTo,
        analysis: {
            encoding: table.encoding,
            separator: table.separator,
            sheetNames: [] as string[],
            sheetName: null,
            headerRow: interpretation.headerRowNumber,
            columns: interpretation.columns.map((column) => ({ index: column.index, header: column.header, field: column.field })),
            sample: interpretation.sample,
            mapping: retained,
            errors: interpretation.fatalErrors.map((error) => ({ code: error.code, field: error.field, message: error.message })),
            warnings: buildWarnings(
                { accountPublicId: account.publicId, fileHash, excludePublicId },
                periodFrom,
                table,
                interpretation.headerRowNumber
            ),
            suggestedTemplates: mapping == null ? suggestTemplates(table, account) : []
        }
    };
}

function applyAnalysis(job: DemoImportJob, result: ReturnType<typeof analyze>, templatePublicId: string | null) {
    job.import.status = result.status;
    job.import.templatePublicId = templatePublicId;
    job.import.periodFrom = result.periodFrom;
    job.import.periodTo = result.periodTo;
    job.import.analysis = result.analysis;
    job.lines = result.lines;
    job.layout = result.layout;
    recount(job);
}

/** Empreinte du fichier (fichier déjà importé). Calculée dans l'onglet. */
async function fingerprint(bytes: Uint8Array): Promise<string> {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
        const digest = new Uint8Array(await subtle.digest('SHA-256', new Uint8Array(bytes)));
        return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    // Repli FNV-1a : suffit à reconnaître le même fichier dans la même session.
    let hash = 0x811c9dc5;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    return `fnv-${hash.toString(16)}-${bytes.length}`;
}

function formText(form: FormData, key: string): string | null {
    const value = form.get(key);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseMappingField(raw: string | null): ImportMapping | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as ImportMapping) : null;
    } catch {
        invalid("Le champ mapping n'est pas un JSON valide.");
    }
}

/**
 * `POST /api/imports` : lit le fichier dans l'onglet, puis crée l'import et ses lignes à revoir.
 * N'écrit aucune transaction. Les octets restent en mémoire jusqu'à la clôture de l'import.
 */
export async function createDemoImport(body: unknown): Promise<Import> {
    if (typeof FormData === 'undefined' || !(body instanceof FormData)) invalid('Fichier manquant.');
    const file = body.get('file');
    if (!(file instanceof Blob)) invalid('Fichier manquant.');
    const fileName = file instanceof File ? file.name : 'import';

    const account = findAccount(formText(body, 'accountPublicId'));
    ensureActive(account, "d'importer des transactions sur");
    const defaultPaymentMethod = resolvePaymentMethod(formText(body, 'paymentMethodPublicId'), account);

    const bytes = new Uint8Array(await file.arrayBuffer());
    ensureCsvSource(bytes, fileName);

    let mapping = parseMappingField(formText(body, 'mapping'));
    let templatePublicId: string | null = null;
    const templateId = formText(body, 'importTemplatePublicId');
    if (templateId) {
        if (mapping) invalid('Choisissez soit un modèle, soit un mapping, pas les deux.');
        ({ mapping, templatePublicId } = resolveTemplateMapping(templateId));
    }

    const fileHash = await fingerprint(bytes);
    const db = demoDb();
    const result = analyze(db, account, bytes, mapping, defaultPaymentMethod?.publicId ?? null, fileHash, null);

    const now = stamp();
    const job: DemoImportJob = {
        import: {
            publicId: createPublicId(),
            accountPublicId: account.publicId,
            accountName: account.name,
            accountCurrency: account.currency,
            fileName: normalizeFileName(fileName),
            sourceType: 'csv',
            status: result.status,
            templatePublicId,
            defaultPaymentMethodPublicId: defaultPaymentMethod?.publicId ?? null,
            counts: { total: 0, validated: 0, toReview: 0, errors: 0, ignored: 0 },
            periodFrom: null,
            periodTo: null,
            createdAt: now,
            updatedAt: null,
            validatedAt: null,
            expiresAt: null,
            analysis: result.analysis
        },
        lines: [],
        layout: null,
        fileHash
    };
    applyAnalysis(job, result, templatePublicId);
    db.imports.unshift(job);
    db.importFiles[job.import.publicId] = bytes;
    return toResponse(job);
}

/** Nom affichable : sans chemin ni caractère de contrôle, borné à 255. */
function normalizeFileName(raw: string | null | undefined): string {
    const base = (raw ?? '').trim().replace(/\\/g, '/').split('/').pop() ?? '';
    const name = base.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() || 'import';
    return name.length <= 255 ? name : name.slice(0, 255);
}

function reparse(job: DemoImportJob, body: unknown): Import {
    ensureStatus(job, 'de relire le fichier', OPEN_STATUSES);
    const account = targetAccount(job);
    ensureActive(account, "d'importer des transactions sur");
    const bytes = demoDb().importFiles[job.import.publicId];
    if (!bytes) invalid("Le fichier d'origine n'est plus disponible : relancez un import.");

    const request = (body ?? {}) as {
        mapping?: ImportMapping | null;
        importTemplatePublicId?: string | null;
        paymentMethodPublicId?: string | null;
    };
    let mapping = request.mapping ?? null;
    let templatePublicId: string | null = null;
    if (request.importTemplatePublicId?.trim()) {
        if (mapping) invalid('Choisissez soit un modèle, soit un mapping, pas les deux.');
        ({ mapping, templatePublicId } = resolveTemplateMapping(request.importTemplatePublicId));
    }

    let defaultPaymentMethodPublicId = job.import.defaultPaymentMethodPublicId;
    if (has(body, 'paymentMethodPublicId')) {
        defaultPaymentMethodPublicId = resolvePaymentMethod(request.paymentMethodPublicId, account)?.publicId ?? null;
    }

    const result = analyze(demoDb(), account, bytes, mapping, defaultPaymentMethodPublicId, job.fileHash, job.import.publicId);
    applyAnalysis(job, result, templatePublicId);
    job.import.defaultPaymentMethodPublicId = defaultPaymentMethodPublicId;
    touch(job);
    return toResponse(job);
}

// --- Lignes ------------------------------------------------------------------------------------

function listImports(query: URLSearchParams) {
    const status = parseImportStatus(query.get('status'));
    const account = query.get('accountPublicId')?.trim();
    const page = clampPage(query.get('page'), 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampPage(query.get('pageSize'), IMPORTS_PAGE_SIZE_DEFAULT, IMPORTS_PAGE_SIZE_MAX);
    const items = jobs()
        .filter((job) => (!status || job.import.status === status) && (!account || job.import.accountPublicId === account))
        .sort((a, b) => b.import.createdAt.localeCompare(a.import.createdAt));
    return {
        items: items.slice((page - 1) * pageSize, page * pageSize).map(toResponse),
        page,
        pageSize,
        totalCount: items.length
    };
}

function compareLines(sort: string | null): (a: DemoImportLine, b: DemoImportLine) => number {
    const token = sort?.trim() || 'lineNumber';
    const descending = token.startsWith('-');
    const key = (descending ? token.slice(1) : token).toLowerCase();
    const direction = descending ? -1 : 1;
    const byNumber = (a: DemoImportLine, b: DemoImportLine) => a.lineNumber - b.lineNumber;
    const nullable = <T>(a: T | null, b: T | null, compare: (x: T, y: T) => number) => {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        return compare(a, b);
    };
    const keys: Record<string, ImportLineSortKey> = { linenumber: 'lineNumber', date: 'date', amount: 'amount', status: 'status' };
    switch (keys[key]) {
        case 'lineNumber':
            return (a, b) => direction * byNumber(a, b);
        case 'date':
            return (a, b) => direction * (nullable(a.operationDate, b.operationDate, (x, y) => x.localeCompare(y)) || byNumber(a, b));
        case 'amount':
            return (a, b) => direction * nullable(a.amount, b.amount, (x, y) => x - y) || byNumber(a, b);
        case 'status':
            return (a, b) => direction * (LINE_STATUS_ORDER[a.status] - LINE_STATUS_ORDER[b.status]) || byNumber(a, b);
        default:
            invalid('Tri invalide (lineNumber, date, amount, status, préfixe - pour décroissant).');
    }
}

function listLines(job: DemoImportJob, query: URLSearchParams) {
    const status = parseLineStatus(query.get('status'));
    const q = query.get('q')?.trim() ?? '';
    if (q.length > 100) invalid('Recherche trop longue (100 caractères maximum).');
    const page = clampPage(query.get('page'), 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampPage(query.get('pageSize'), LINES_PAGE_SIZE_DEFAULT, LINES_PAGE_SIZE_MAX);
    const term = q.toLocaleLowerCase('fr-CH');
    const items = job.lines
        .filter((line) => !status || line.status === status)
        .filter((line) => !term || (line.label ?? '').toLocaleLowerCase('fr-CH').includes(term))
        .sort(compareLines(query.get('sort')));
    return {
        items: items.slice((page - 1) * pageSize, page * pageSize).map(toLineResponse),
        page,
        pageSize,
        totalCount: items.length
    };
}

function findLine(job: DemoImportJob, linePublicId: string | null | undefined): DemoImportLine {
    const line = job.lines.find((item) => item.publicId === linePublicId?.trim());
    if (!line) notFound('Ligne introuvable.');
    return line;
}

function editContext(job: DemoImportJob) {
    ensureStatus(job, 'de modifier les lignes', ['aValider']);
    return { account: targetAccount(job), today: today() };
}

function resolveCategory(publicId: string | null | undefined) {
    if (!publicId || !publicId.trim()) return null;
    const category = new DemoImportLookups(demoDb(), '', false).categoryById(publicId.trim());
    if (!category) invalid('Catégorie introuvable.');
    return category;
}

function resolveTier(publicId: string | null | undefined): Tier | null {
    if (!publicId || !publicId.trim()) return null;
    const tier = demoDb().tiers.find((item) => item.publicId === publicId.trim());
    if (!tier) invalid('Tier introuvable.');
    return tier;
}

/** Contrôles métier d'une ligne corrigée (`ImportLineEditing.ValidateAsync`). */
function revalidate(line: DemoImportLine, context: { account: Account; today: string }): ImportIssue[] {
    line.type = typeFor(line.amount);
    const lookups = new DemoImportLookups(demoDb(), context.account.publicId, false);
    const category = lookups.categoryById(line.categoryPublicId);
    const issues = validateLine(line, context.account.currency, context.today, category?.type ?? null);
    if (line.categoryPublicId && !category) {
        issues.push({ code: 'CATEGORY_DELETED', field: 'category', message: 'La catégorie de cette ligne a été supprimée.' });
    }
    if (line.paymentMethodPublicId && !lookups.paymentMethodById(line.paymentMethodPublicId)) {
        issues.push({
            code: 'PAYMENT_METHOD_UNAVAILABLE',
            field: 'paymentMethod',
            message: 'Le moyen de paiement de cette ligne a été supprimé ou désactivé.'
        });
    }
    return issues;
}

function refresh(line: DemoImportLine, issues: ImportIssue[]) {
    line.type = typeFor(line.amount);
    line.issues = issues;
}

/** Remet une ligne à zéro depuis ses cellules (`ImportAnalyzer.RebuildLineAsync`). */
function rebuildLine(job: DemoImportJob, line: DemoImportLine, account: Account) {
    if (!line.cells) invalid("Les données d'origine de cette ligne ne sont plus disponibles.");
    if (!job.layout) invalid('Impossible de relire cette ligne : relancez la lecture du fichier.');
    const parsed = parseRow({ rowNumber: line.lineNumber, cells: line.cells }, job.layout);
    const db = demoDb();
    const existing = new ExistingTransactionIndex(db, account.publicId, parsed.operationDate, parsed.operationDate);
    // Une transaction déjà prise par une autre ligne n'est pas volée.
    for (const other of job.lines) {
        if (other !== line && other.duplicateOfTransactionPublicId) existing.consume(other.duplicateOfTransactionPublicId);
    }
    const [rebuilt] = buildLines([parsed], {
        accountCurrency: account.currency,
        lookups: new DemoImportLookups(db, account.publicId, true),
        existing,
        defaultPaymentMethodPublicId: job.import.defaultPaymentMethodPublicId,
        today: today(),
        newId: () => line.publicId
    });
    // Le doublon dans le fichier ne se recalcule qu'avec tout le fichier : on garde celui de la lecture.
    if (!rebuilt.duplicateOfTransactionPublicId && line.duplicateOfLineNumber != null && rebuilt.status !== 'ignoree') {
        rebuilt.duplicateOfLineNumber = line.duplicateOfLineNumber;
        if (rebuilt.status === 'validee') rebuilt.status = 'aValider';
    }
    Object.assign(line, rebuilt);
}

/** `PATCH /api/imports/:id/lines/:lineId` (`UpdateImportLineCommandHandler`). */
function updateLine(job: DemoImportJob, linePublicId: string, body: UpdateImportLinePayload): ImportLine {
    const request = body ?? {};
    const context = editContext(job);
    const decision = parseLineStatus(request.status);
    if (decision && decision !== 'validee' && decision !== 'ignoree') {
        invalid('Statut de ligne invalide : seules « validee » et « ignoree » sont acceptées.');
    }
    const edits = [
        'operationDate',
        'valueDate',
        'label',
        'amount',
        'categoryPublicId',
        'tierPublicId',
        'paymentMethodPublicId',
        'recurringDue'
    ];
    const hasEdits = edits.some((key) => has(request, key));
    if (request.reset && hasEdits) invalid('« reset » ne se combine pas avec des corrections.');

    const category = has(request, 'categoryPublicId') ? resolveCategory(request.categoryPublicId) : null;
    const tier = has(request, 'tierPublicId') ? resolveTier(request.tierPublicId) : null;
    const method = has(request, 'paymentMethodPublicId') ? resolvePaymentMethod(request.paymentMethodPublicId, context.account) : null;
    if (has(request, 'recurringDue') && request.recurringDue) {
        // La démo ne rapproche pas les échéances récurrentes (décision 2 de la roadmap).
        invalid('Échéance introuvable sur ce compte, ou déjà réglée.');
    }

    const line = findLine(job, linePublicId);
    let issues: ImportIssue[];
    if (request.reset) {
        rebuildLine(job, line, context.account);
        issues = line.issues;
    } else {
        applyEdits(line, request, category, tier, method);
        if (category && line.type && !isCategoryCompatible(category.type, line.type)) {
            invalid("Cette catégorie n'est pas compatible avec le sens du montant de la ligne.");
        }
        if (has(request, 'recurringDue')) line.isEdited = true;
        issues = revalidate(line, context);
        refresh(line, issues);
        if (hasEdits) line.status = statusAfterEdit(line, issues);
    }

    if (decision === 'ignoree') {
        line.status = 'ignoree';
    } else if (decision === 'validee') {
        if (!request.reset && !hasEdits) {
            issues = revalidate(line, context);
            refresh(line, issues);
        }
        if (issues.length > 0) {
            invalid(`Ligne invalide, corrigez-la avant de la valider : ${[...new Set(issues.map((item) => item.message))].join(' ')}`);
        }
        line.status = 'validee';
    }

    touch(job);
    recount(job);
    return toLineResponse(line);
}

function applyEdits(
    line: DemoImportLine,
    request: UpdateImportLinePayload,
    category: ReturnType<typeof resolveCategory>,
    tier: Tier | null,
    method: PaymentMethod | null
) {
    let edited = false;
    if (has(request, 'operationDate')) {
        line.operationDate = request.operationDate ?? null;
        edited = true;
    }
    if (has(request, 'valueDate')) {
        line.valueDate = request.valueDate ?? null;
        edited = true;
    }
    if (has(request, 'label')) {
        line.label = request.label?.trim() ? request.label.trim() : null;
        if (line.label && line.label.length > LABEL_MAX_LENGTH) invalid(`Le libellé dépasse ${LABEL_MAX_LENGTH} caractères.`);
        edited = true;
    }
    if (has(request, 'amount')) {
        line.amount = request.amount == null ? null : roundCents(request.amount);
        if (line.amount != null && Math.abs(line.amount) > MAX_AMOUNT) invalid('Le montant dépasse la plage autorisée.');
        line.type = typeFor(line.amount);
        edited = true;
    }
    if (has(request, 'categoryPublicId')) {
        line.categoryPublicId = category?.publicId ?? null;
        line.categorySuggested = false;
        line.unmatchedCategoryName = null;
        edited = true;
    }
    if (has(request, 'tierPublicId')) {
        line.tierPublicId = tier?.publicId ?? null;
        line.unmatchedTierName = null;
        edited = true;
    }
    if (has(request, 'paymentMethodPublicId')) {
        line.paymentMethodPublicId = method?.publicId ?? null;
        line.unmatchedPaymentMethodName = null;
        edited = true;
    }
    if (edited) line.isEdited = true;
}

/** `PATCH /api/imports/:id/lines` : action groupée, une ligne non modifiable est comptée en `skipped`. */
function bulkUpdate(job: DemoImportJob, body: BulkUpdateImportLinesPayload) {
    const request = body ?? ({} as BulkUpdateImportLinesPayload);
    const actions = {
        validate: 'validate',
        ignore: 'ignore',
        setcategory: 'setCategory',
        settier: 'setTier',
        setpaymentmethod: 'setPaymentMethod'
    } as const;
    const action = actions[(request.action ?? '').trim().toLowerCase() as keyof typeof actions];
    if (!action) invalid('Action invalide (validate, ignore, setCategory, setTier, setPaymentMethod).');
    const context = editContext(job);

    const ids = request.linePublicIds ?? [];
    const selectors = (ids.length > 0 ? 1 : 0) + (request.sameLabelAs?.trim() ? 1 : 0) + (request.status?.trim() ? 1 : 0);
    if (selectors !== 1) invalid('Sélectionnez les lignes par linePublicIds, sameLabelAs ou status (un seul).');
    if (ids.length > MAX_BULK_IDS) invalid(`Trop de lignes sélectionnées (${MAX_BULK_IDS} maximum).`);
    const statusFilter = parseLineStatus(request.status);

    const category = action === 'setCategory' ? resolveCategory(request.categoryPublicId) : null;
    const tier = action === 'setTier' ? resolveTier(request.tierPublicId) : null;
    const method = action === 'setPaymentMethod' ? resolvePaymentMethod(request.paymentMethodPublicId, context.account) : null;

    let lines: DemoImportLine[];
    if (ids.length > 0) {
        const wanted = [...new Set(ids.filter((id) => id?.trim()).map((id) => id.trim()))];
        lines = job.lines.filter((line) => wanted.includes(line.publicId));
        if (lines.length !== wanted.length) notFound('Une ou plusieurs lignes sont introuvables dans cet import.');
    } else if (statusFilter) {
        lines = job.lines.filter((line) => line.status === statusFilter);
    } else {
        const reference = job.lines.find((line) => line.publicId === request.sameLabelAs?.trim());
        if (!reference) notFound('Ligne de référence introuvable.');
        const key = labelKey(reference.label);
        if (!key) invalid("La ligne de référence n'a pas de libellé.");
        lines = job.lines.filter((line) => labelKey(line.label) === key);
    }

    let updated = 0;
    let skipped = 0;
    for (const line of lines) {
        if (applyBulk(line, action, context, category, tier, method)) updated += 1;
        else skipped += 1;
    }
    touch(job);
    recount(job);
    return { updated, skipped, import: toResponse(job) };
}

function applyBulk(
    line: DemoImportLine,
    action: 'validate' | 'ignore' | 'setCategory' | 'setTier' | 'setPaymentMethod',
    context: { account: Account; today: string },
    category: ReturnType<typeof resolveCategory>,
    tier: Tier | null,
    method: PaymentMethod | null
): boolean {
    let issues: ImportIssue[];
    switch (action) {
        case 'ignore':
            if (line.status === 'ignoree') return false;
            line.status = 'ignoree';
            return true;
        case 'validate':
            if (line.status === 'validee') return false;
            issues = revalidate(line, context);
            if (issues.length > 0) return false;
            refresh(line, issues);
            line.status = 'validee';
            return true;
        case 'setCategory':
            if (category && (!line.type || !isCategoryCompatible(category.type, line.type))) return false;
            line.categoryPublicId = category?.publicId ?? null;
            line.categorySuggested = false;
            line.unmatchedCategoryName = null;
            break;
        case 'setTier':
            line.tierPublicId = tier?.publicId ?? null;
            line.unmatchedTierName = null;
            break;
        case 'setPaymentMethod':
            line.paymentMethodPublicId = method?.publicId ?? null;
            line.unmatchedPaymentMethodName = null;
            break;
    }
    line.isEdited = true;
    issues = revalidate(line, context);
    refresh(line, issues);
    line.status = statusAfterEdit(line, issues);
    return true;
}

// --- Aperçu, validation, annulation ------------------------------------------------------------

function preview(job: DemoImportJob): ImportPreview {
    ensureStatus(job, "de calculer l'aperçu", ['aValider']);
    const account = targetAccount(job);
    const toCreate = job.lines.filter((line) => line.status === 'validee' && line.amount != null);
    const unresolved = job.lines.filter((line) => line.status === 'aValider' || line.status === 'erreur').length;
    const totalDebit = roundCents(toCreate.filter((line) => (line.amount ?? 0) < 0).reduce((sum, line) => sum - (line.amount ?? 0), 0));
    const totalCredit = roundCents(toCreate.filter((line) => (line.amount ?? 0) > 0).reduce((sum, line) => sum + (line.amount ?? 0), 0));
    const dates = toCreate
        .map((line) => line.operationDate)
        .filter((date): date is string => !!date)
        .sort();

    const before = account.currentBalance;
    const after = before == null ? null : roundCents(before + totalCredit - totalDebit);

    // Solde de clôture : dernière opération datée ; un export du plus récent au plus ancien met la plus récente en haut.
    const withBalance = job.lines.filter((line) => line.balance != null && line.operationDate).sort((a, b) => a.lineNumber - b.lineNumber);
    let bankClosing: number | null = null;
    if (withBalance.length > 0) {
        const newestFirst = (withBalance[0].operationDate as string) > (withBalance.at(-1)?.operationDate as string);
        const lastDate = withBalance
            .map((line) => line.operationDate as string)
            .sort()
            .at(-1);
        const sameDay = withBalance.filter((line) => line.operationDate === lastDate);
        bankClosing = (newestFirst ? sameDay[0] : sameDay.at(-1))?.balance ?? null;
    }

    let balanceDifference: number | null = null;
    let balanceCheck: ImportPreview['balanceCheck'] = 'unavailable';
    if (bankClosing != null && after != null) {
        balanceDifference = roundCents(bankClosing - after);
        balanceCheck = balanceDifference === 0 ? 'match' : 'mismatch';
    }

    return {
        toCreate: toCreate.length,
        unresolved,
        totalDebit,
        totalCredit,
        periodFrom: dates[0] ?? null,
        periodTo: dates.at(-1) ?? null,
        balanceBefore: before,
        balanceAfter: after,
        bankClosingBalance: bankClosing,
        balanceCheck,
        balanceDifference
    };
}

/** Tiers et moyens inconnus du fichier : créés avec un alias exact (`ImportAutoCreation`). */
function autoCreate(account: Account, lines: DemoImportLine[]) {
    const db = demoDb();
    const lookups = new DemoImportLookups(db, account.publicId, false);
    const now = stamp();
    const createdTiers: Tier[] = [];
    const createdMethods: PaymentMethod[] = [];
    const tierByKey = new Map<string, Tier>();
    const methodByKey = new Map<string, PaymentMethod>();
    const addAlias = (ownerId: string, value: string) => {
        db.aliases[ownerId] ??= [];
        db.aliases[ownerId].push({
            publicId: createPublicId(),
            value: value.slice(0, 255),
            matchType: 'exact',
            priority: 0,
            isActive: true,
            createdByImport: true,
            createdAt: now,
            updatedAt: null
        });
    };

    for (const line of lines) {
        const tierValue = line.unmatchedTierName ?? (line.tierPublicId ? line.original?.tierName : null);
        const tierKey = normalizeText(tierValue);
        if (tierValue && tierKey) {
            const known = lookups.matchTier(tierValue);
            const resolved = tierByKey.get(tierKey);
            if (known) {
                if (!line.tierPublicId) line.tierPublicId = known.publicId;
            } else if (resolved) {
                if (!line.tierPublicId) line.tierPublicId = resolved.publicId;
            } else if (line.tierPublicId && lookups.tierById(line.tierPublicId)) {
                const chosen = lookups.tierById(line.tierPublicId) as Tier;
                tierByKey.set(tierKey, chosen);
                addAlias(chosen.publicId, tierValue);
            } else if (!line.tierPublicId) {
                const tier: Tier = {
                    publicId: createPublicId(),
                    name: tierValue.trim().slice(0, 150),
                    nature: 'unknown',
                    email: null,
                    phone: null,
                    website: null,
                    notes: null,
                    roles: [],
                    person: null,
                    company: null,
                    organization: null,
                    bank: null,
                    createdAt: now,
                    updatedAt: null
                };
                db.tiers.unshift(tier);
                createdTiers.push(tier);
                tierByKey.set(tierKey, tier);
                addAlias(tier.publicId, tierValue);
                line.tierPublicId = tier.publicId;
            }
            line.unmatchedTierName = null;
        }

        const methodValue = line.unmatchedPaymentMethodName ?? (line.paymentMethodPublicId ? line.original?.paymentMethodName : null);
        const methodKey = normalizeText(methodValue);
        if (methodValue && methodKey) {
            const known = lookups.matchPaymentMethod(methodValue);
            const resolved = methodByKey.get(methodKey);
            if (known) {
                if (!line.paymentMethodPublicId) line.paymentMethodPublicId = known.publicId;
            } else if (resolved) {
                if (!line.paymentMethodPublicId) line.paymentMethodPublicId = resolved.publicId;
            } else if (line.paymentMethodPublicId && lookups.paymentMethodById(line.paymentMethodPublicId)) {
                const chosen = lookups.paymentMethodById(line.paymentMethodPublicId) as PaymentMethod;
                methodByKey.set(methodKey, chosen);
                addAlias(chosen.publicId, methodValue);
            } else if (!line.paymentMethodPublicId) {
                const label = methodValue.trim().slice(0, 100);
                const inactive = db.paymentMethods.some(
                    (item) => item.accountPublicId === account.publicId && item.label.toLowerCase() === label.toLowerCase()
                );
                if (inactive) {
                    invalid(
                        `Ligne ${line.lineNumber} : le moyen de paiement « ${label} » existe mais est désactivé. ` +
                            'Réactivez-le ou choisissez un autre moyen.'
                    );
                }
                const method: PaymentMethod = {
                    publicId: createPublicId(),
                    accountPublicId: account.publicId,
                    type: 'other',
                    label,
                    reference: null,
                    lastFourDigits: /(\d{4})\s*$/.exec(methodValue)?.[1] ?? null,
                    expirationDate: null,
                    isActive: true,
                    createdAt: now,
                    updatedAt: null
                };
                db.paymentMethods.push(method);
                createdMethods.push(method);
                methodByKey.set(methodKey, method);
                addAlias(method.publicId, methodValue);
                line.paymentMethodPublicId = method.publicId;
            }
            line.unmatchedPaymentMethodName = null;
        }
    }
    return { createdTiers: createdTiers.length, createdPaymentMethods: createdMethods.length };
}

/**
 * `POST /api/imports/:id/commit` : écrit les lignes validées en transactions de la démo, tout ou rien.
 * Les lignes encore ouvertes sont ignorées avec `ignoreUnresolved`.
 */
function commit(job: DemoImportJob, body: unknown) {
    const ignoreUnresolved = has(body, 'ignoreUnresolved') && (body as { ignoreUnresolved?: boolean }).ignoreUnresolved === true;
    ensureStatus(job, "de valider l'import", ['aValider']);
    const account = targetAccount(job);
    ensureActive(account, "d'importer des transactions sur");
    const db = demoDb();
    const todayYmd = today();

    const lines = job.lines.slice().sort((a, b) => a.lineNumber - b.lineNumber);
    const unresolved = lines.filter((line) => line.status === 'aValider' || line.status === 'erreur');
    if (unresolved.length > 0 && !ignoreUnresolved) {
        invalid(
            `${unresolved.length} ligne(s) restent à valider ou en erreur : validez-les, ignorez-les, ` +
                'ou confirmez avec ignoreUnresolved pour les ignorer.'
        );
    }
    const toWrite = lines.filter((line) => line.status === 'validee');
    if (toWrite.length === 0) invalid('Aucune ligne validée à importer.');

    // Doublons apparus depuis l'analyse (transaction saisie entre-temps) : repassés « à valider ».
    const candidates = toWrite.filter((line) => !line.duplicateOfTransactionPublicId && line.operationDate && line.amount && line.label);
    if (candidates.length > 0) {
        const dates = candidates.map((line) => line.operationDate as string).sort();
        const index = new ExistingTransactionIndex(db, account.publicId, dates[0], dates.at(-1) ?? dates[0]);
        for (const known of lines) if (known.duplicateOfTransactionPublicId) index.consume(known.duplicateOfTransactionPublicId);
        let late = 0;
        for (const line of candidates) {
            const id = index.tryConsume(line.operationDate as string, line.amount as number, line.label);
            if (!id) continue;
            line.duplicateOfTransactionPublicId = id;
            line.status = 'aValider';
            late += 1;
        }
        if (late > 0) {
            recount(job);
            touch(job);
            invalid(
                `${late} ligne(s) correspondent à des opérations ajoutées au compte depuis l'analyse. ` +
                    'Elles sont repassées « à valider » : vérifiez-les, puis validez de nouveau.'
            );
        }
    }

    // Tout est revalidé avant la première écriture : une ligne invalide ne laisse aucune transaction.
    const lookups = new DemoImportLookups(db, account.publicId, false);
    for (const line of toWrite) {
        if (line.categoryPublicId && !lookups.categoryById(line.categoryPublicId)) {
            invalid(`Ligne ${line.lineNumber} : sa catégorie a été supprimée entre-temps. Choisissez-en une autre.`);
        }
        if (line.tierPublicId && !lookups.tierById(line.tierPublicId)) {
            invalid(`Ligne ${line.lineNumber} : son tier a été supprimé entre-temps. Choisissez-en un autre.`);
        }
        if (line.paymentMethodPublicId && !lookups.paymentMethodById(line.paymentMethodPublicId)) {
            invalid(`Ligne ${line.lineNumber} : son moyen de paiement a été supprimé ou désactivé entre-temps. Choisissez-en un autre.`);
        }
        const issues = validateLine(line, account.currency, todayYmd, lookups.categoryById(line.categoryPublicId)?.type ?? null);
        if (issues.length > 0 || !line.type) {
            invalid(`Ligne ${line.lineNumber} : ${[...new Set(issues.map((item) => item.message))].join(' ')}`.trimEnd());
        }
    }

    const created = autoCreate(account, toWrite);
    for (const line of unresolved) line.status = 'ignoree';

    const now = stamp();
    for (const line of toWrite) {
        const type = line.type as 'depense' | 'revenu';
        const amount = Math.abs(line.amount as number);
        const tx: Transaction = {
            publicId: createPublicId(),
            type,
            status: 'validee',
            source: 'import',
            recurringExpensePublicId: null,
            recurringIncomePublicId: null,
            duePublicId: null,
            duePlannedAmount: null,
            label: line.label as string,
            amount,
            currency: account.currency,
            operationDate: line.operationDate as string,
            valueDate: line.valueDate ?? line.operationDate,
            paymentMethodPublicId: line.paymentMethodPublicId,
            categoryPublicId: line.categoryPublicId,
            tierPublicId: line.tierPublicId,
            createdByUserPublicId: DEMO_USER_PUBLIC_ID,
            createdByDisplayName: 'Sacha Démo',
            createdByPhotoUrl: null,
            createdAt: now,
            updatedAt: null,
            movements: buildMovements(type, account.publicId, amount),
            files: [],
            savingsGoalPublicId: null,
            tagPublicIds: [],
            assetPublicId: null
        };
        db.transactions.unshift(tx);
        applyMovement(tx, 1);
        line.transactionPublicId = tx.publicId;
    }
    refreshBudgets(db);
    refreshGoals(db);

    const dates = toWrite.map((line) => line.operationDate as string).sort();
    job.import.periodFrom = dates[0];
    job.import.periodTo = dates.at(-1) ?? dates[0];
    job.import.status = 'valide';
    job.import.validatedAt = now;
    touch(job);
    purgeRawData(job);
    recount(job);

    return {
        import: toResponse(job),
        createdTransactions: toWrite.length,
        createdTiers: created.createdTiers,
        createdPaymentMethods: created.createdPaymentMethods,
        detectedRecurrences: 0
    };
}

function cancel(job: DemoImportJob): Import {
    ensureStatus(job, "d'annuler l'import", OPEN_STATUSES);
    job.import.status = 'annule';
    touch(job);
    purgeRawData(job);
    return toResponse(job);
}

/** `POST /api/imports/:id/revert` : retire les transactions encore présentes d'un import validé. */
function revert(job: DemoImportJob) {
    ensureStatus(job, "d'annuler l'import validé", ['valide']);
    targetAccount(job);
    const db = demoDb();
    let reverted = 0;
    for (const line of job.lines) {
        const tx = line.transactionPublicId ? db.transactions.find((item) => item.publicId === line.transactionPublicId) : null;
        if (!tx) continue;
        applyMovement(tx, -1);
        db.transactions = db.transactions.filter((item) => item !== tx);
        reverted += 1;
    }
    refreshBudgets(db);
    refreshGoals(db);
    job.import.status = 'annule';
    touch(job);
    return { import: toResponse(job), revertedTransactions: reverted };
}

function remove(job: DemoImportJob) {
    if (job.import.status === 'valide') invalid("Un import validé ne se supprime pas : annulez-le d'abord (revert).");
    const db = demoDb();
    db.imports = db.imports.filter((item) => item !== job);
    forgetFile(job.import.publicId);
}

function saveAsTemplate(job: DemoImportJob, body: SaveImportAsTemplatePayload): ImportTemplate {
    if (job.import.status === 'erreur') invalid("Associez d'abord les colonnes : ce mapping ne lit pas encore le fichier.");
    const retained = job.import.analysis.mapping;
    if (!retained) invalid("Cet import n'a pas de mapping à enregistrer.");
    // Sans ligne d'en-tête figée : les préambules varient d'un export à l'autre.
    const mapping = validateTemplateMapping(
        retained.headerRow === 0 ? structuredClone(retained) : { ...structuredClone(retained), headerRow: null },
        'csv'
    );
    const name = normalizeTemplateName(body?.name);
    ensureTemplateNameAvailable(name, null);
    const now = stamp();
    const template: ImportTemplate = {
        publicId: createPublicId(),
        name,
        sourceType: job.import.sourceType,
        isSystem: false,
        isActive: true,
        bankTierPublicId: resolveBankTier(body?.bankTierPublicId),
        bankPublicId: null,
        description: null,
        mapping,
        createdAt: now,
        updatedAt: now
    };
    demoDb().importTemplates.push(template);
    return toTemplateResponse(template);
}

// --- Routage -----------------------------------------------------------------------------------

function routeTemplates(method: string, path: string, body: unknown, query: URLSearchParams): DemoResult {
    const db = demoDb();
    if (path === '/api/import-templates' && method === 'GET') {
        const raw = query.get('sourceType');
        const type = raw && raw.trim() ? parseSourceType(raw) : null;
        const own = db.importTemplates
            .filter((item) => !type || item.sourceType === type)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(toTemplateResponse);
        const system = SYSTEM_TEMPLATES.filter((item) => !type || item.sourceType === type).map(toSystemResponse);
        const items = [...own, ...system];
        return ok({ items, totalCount: items.length });
    }
    if (path === '/api/import-templates' && method === 'POST') {
        const request = (body ?? {}) as CreateImportTemplatePayload;
        const sourceType = parseSourceType(request.sourceType);
        const mapping = validateTemplateMapping(request.mapping, sourceType);
        const name = normalizeTemplateName(request.name);
        ensureTemplateNameAvailable(name, null);
        const now = stamp();
        const template: ImportTemplate = {
            publicId: createPublicId(),
            name,
            sourceType,
            isSystem: false,
            isActive: request.isActive ?? true,
            bankTierPublicId: resolveBankTier(request.bankTierPublicId),
            bankPublicId: null,
            description: null,
            mapping: structuredClone(mapping),
            createdAt: now,
            updatedAt: now
        };
        db.importTemplates.push(template);
        return ok(toTemplateResponse(template));
    }

    const id = match(path, '/api/import-templates/:id');
    if (!id) return null;
    if (method === 'GET') {
        const system = systemTemplate(id.id);
        if (system) return ok(toSystemResponse(system));
        const template = db.importTemplates.find((item) => item.publicId === id.id.trim());
        if (!template) notFound('Modèle introuvable.');
        return ok(toTemplateResponse(template));
    }
    if (method === 'PUT') {
        const template = ownTemplate(id.id);
        const request = (body ?? {}) as UpdateImportTemplatePayload;
        const mapping = validateTemplateMapping(request.mapping, template.sourceType);
        const name = normalizeTemplateName(request.name);
        ensureTemplateNameAvailable(name, template.publicId);
        template.bankTierPublicId = resolveBankTier(request.bankTierPublicId);
        template.name = name;
        template.isActive = !!request.isActive;
        template.mapping = structuredClone(mapping);
        template.updatedAt = stamp();
        return ok(toTemplateResponse(template));
    }
    if (method === 'DELETE') {
        const template = ownTemplate(id.id);
        db.importTemplates = db.importTemplates.filter((item) => item !== template);
        return noContent();
    }
    return null;
}

/** Routes `/api/imports` et `/api/import-templates`. `null` si le chemin n'est pas concerné. */
export function routeImports(method: string, path: string, body: unknown, query: URLSearchParams): DemoResult {
    if (path.startsWith('/api/import-templates')) return routeTemplates(method, path, body, query);
    if (path !== '/api/imports' && !path.startsWith('/api/imports/')) return null;

    if (path === '/api/imports' && method === 'GET') return ok(listImports(query));
    // Lecture du fichier asynchrone : le corps est une promesse, que `fetchWrapper` attend.
    if (path === '/api/imports' && method === 'POST') return ok(createDemoImport(body));

    const id = match(path, '/api/imports/:id');
    if (id && method === 'GET') return ok(toResponse(findJob(id.id)));
    if (id && method === 'DELETE') {
        remove(findJob(id.id));
        return noContent();
    }

    const lines = match(path, '/api/imports/:id/lines');
    if (lines && method === 'GET') return ok(listLines(findJob(lines.id), query));
    if (lines && method === 'PATCH') return ok(bulkUpdate(findJob(lines.id), body as BulkUpdateImportLinesPayload));

    const line = match(path, '/api/imports/:id/lines/:lineId');
    if (line && method === 'PATCH') return ok(updateLine(findJob(line.id), line.lineId, body as UpdateImportLinePayload));

    const dues = match(path, '/api/imports/:id/lines/:lineId/recurring-dues');
    if (dues && method === 'GET') {
        findLine(findJob(dues.id), dues.lineId);
        return ok([]);
    }

    const action = match(path, '/api/imports/:id/:action');
    if (action && method === 'GET' && action.action === 'preview') return ok(preview(findJob(action.id)));
    if (action && method === 'POST') {
        const job = findJob(action.id);
        if (action.action === 'reparse') return ok(reparse(job, body));
        if (action.action === 'commit') return ok(commit(job, body));
        if (action.action === 'cancel') return ok(cancel(job));
        if (action.action === 'revert') return ok(revert(job));
        if (action.action === 'save-as-template') return ok(saveAsTemplate(job, body as SaveImportAsTemplatePayload));
    }
    return null;
}
