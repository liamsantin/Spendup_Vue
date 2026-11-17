import { AppError } from '@/utils/errors/app-error';
import { TAX_CANTONS, TAX_CIVIL_STATUSES } from '@/features/tax/types';
import type {
    TaxChecklistItem,
    TaxCivilStatus,
    TaxCompetence,
    TaxCorrection,
    TaxDocumentLink,
    TaxEntry,
    TaxEntryKind,
    TaxIdentity,
    TaxLineValue,
    TaxPerson,
    TaxProfileInfo,
    TaxReturn,
    TaxReturnListItem,
    TaxStatus,
    TaxSubtotal,
    TaxSuggestion,
    TaxSuggestionSource,
    TaxSuggestionSourceItem,
    TaxationMode,
    UpdateTaxReturnPayload,
    UpsertTaxAmountPayload,
    UpsertTaxEntryPayload
} from '@/features/tax/types';
import { createPublicId, demoDb } from '@/features/demo/db';

type TaxBucket = 'income' | 'deduction' | 'asset' | 'liability' | 'none';

type LineDefinition = {
    code: string;
    section: string;
    sectionLabel: string;
    label: string;
    bucket: TaxBucket;
    splits: boolean;
};

/** Une case saisie ou acceptée : `competence` vaut `both` pour les lignes qui ne se dédoublent pas. */
type StoredAmount = TaxLineValue & { code: string };

/** Dossier tel que la démo le garde en mémoire ; la forme API est reconstruite à chaque lecture. */
export type DemoTaxReturn = {
    publicId: string;
    year: number;
    canton: string;
    status: TaxStatus;
    couple: boolean;
    taxpayerNumber: string | null;
    notes: string | null;
    person1: TaxIdentity;
    person2: TaxIdentity | null;
    amounts: StoredAmount[];
    entries: TaxEntry[];
    documents: TaxDocumentLink[];
    checklist: DemoChecklistItem[];
    previousPublicId: string | null;
    /** Date de dépôt (`yyyy-mm-dd`). Posée, elle verrouille les montants. Absente des démos plus anciennes. */
    submissionDate?: string | null;
    /** Corrections journalisées, la plus récente en premier. */
    corrections?: TaxCorrection[];
    civilStatus?: TaxCivilStatus | null;
    taxationMode?: TaxationMode;
};

/** Pièce attendue telle que la démo la garde : `complete` est ce que la personne a coché. */
type DemoChecklistItem = Omit<TaxChecklistItem, 'received'> & { complete: boolean };

type TaxResult = { status: number; body: unknown } | null;

function line(code: string, section: string, sectionLabel: string, label: string, bucket: TaxBucket, splits = false): LineDefinition {
    return { code, section, sectionLabel, label, bucket, splits };
}

/** Même catalogue que l’API (tronc CSI / eCH-0278), dans l’ordre du formulaire. */
const CATALOGUE: LineDefinition[] = [
    line('income.employed', 'revenus', 'Revenus', "Salaire et revenus d'une activité dépendante", 'income'),
    line('income.selfEmployed', 'revenus', 'Revenus', "Revenus d'une activité indépendante", 'income'),
    line('income.liquidationProfit', 'revenus', 'Revenus', 'Bénéfice de liquidation', 'income'),
    line('income.retirementPension', 'revenus', 'Revenus', 'Rentes AVS', 'income'),
    line('income.disabilityPension', 'revenus', 'Revenus', 'Rentes AI', 'income'),
    line('income.unemployment', 'revenus', 'Revenus', 'Indemnités de chômage et pour perte de gain', 'income'),
    line('income.allowances', 'revenus', 'Revenus', 'Allocations pour enfants et familiales', 'income'),
    line('income.alimony', 'revenus', 'Revenus', 'Pensions alimentaires reçues', 'income'),
    line('income.securities', 'revenus', 'Revenus', 'Revenus des avoirs et des titres', 'income'),
    line('income.withholdingTax', 'revenus', 'Revenus', "Droit à l'impôt anticipé", 'none'),
    line('income.property', 'revenus', 'Revenus', 'Revenus immobiliers', 'income'),
    line('income.other', 'revenus', 'Revenus', 'Autres revenus', 'income'),

    line('deduction.jobExpenses', 'deductions', 'Déductions', 'Frais professionnels', 'deduction', true),
    line('deduction.debtInterest', 'deductions', 'Déductions', 'Intérêts des dettes', 'deduction', true),
    line('deduction.pillar2', 'deductions', 'Déductions', 'Cotisations au 2e pilier', 'deduction'),
    line('deduction.pillar2BuyIn', 'deductions', 'Déductions', 'Rachats dans le 2e pilier', 'deduction'),
    line('deduction.pillar3a', 'deductions', 'Déductions', 'Cotisations au 3e pilier a', 'deduction', true),
    line('deduction.insurance', 'deductions', 'Déductions', "Primes d'assurance et intérêts de capitaux d'épargne", 'deduction', true),
    line('deduction.healthGross', 'deductions', 'Déductions', "Frais de maladie et d'accident, brut", 'none'),
    line('deduction.healthReimbursed', 'deductions', 'Déductions', "Remboursements de frais de maladie et d'accident", 'none'),
    line('deduction.health', 'deductions', 'Déductions', "Frais de maladie et d'accident déductibles", 'deduction', true),
    line('deduction.handicap', 'deductions', 'Déductions', 'Frais liés à un handicap', 'deduction', true),
    line('deduction.education', 'deductions', 'Déductions', 'Frais de formation et de perfectionnement', 'deduction', true),
    line('deduction.donations', 'deductions', 'Déductions', 'Dons', 'deduction'),
    line('deduction.alimonyPaid', 'deductions', 'Déductions', 'Pensions alimentaires versées', 'deduction'),
    line('deduction.politicalContributions', 'deductions', 'Déductions', 'Cotisations et dons aux partis politiques', 'deduction'),
    line('deduction.childcare', 'deductions', 'Déductions', 'Frais de garde par des tiers', 'deduction', true),
    line('deduction.social', 'deductions', 'Déductions', 'Déductions sociales', 'deduction', true),
    line('deduction.other', 'deductions', 'Déductions', 'Autres déductions', 'deduction'),

    line('asset.cashAndSecurities', 'fortune', 'Fortune', 'Avoirs et titres', 'asset'),
    line('asset.property', 'fortune', 'Fortune', 'Valeur fiscale des immeubles', 'asset'),
    line('asset.qualifiedPrivate', 'fortune', 'Fortune', 'Participations qualifiées, fortune privée', 'asset'),
    line('asset.qualifiedBusiness', 'fortune', 'Fortune', 'Participations qualifiées, fortune commerciale', 'asset'),
    line('asset.crypto', 'fortune', 'Fortune', 'Cryptomonnaies', 'asset'),
    line('asset.other', 'fortune', 'Fortune', 'Autres éléments de fortune', 'asset'),
    line('asset.generalDeduction', 'fortune', 'Fortune', 'Déductions générales sur la fortune', 'none'),

    line('liability.debts', 'dettes', 'Dettes', 'Dettes', 'liability'),

    line('capital.pillar2', 'aPart', 'Imposés à part', 'Prestation en capital du 2e pilier', 'none'),
    line('capital.pillar3a', 'aPart', 'Imposés à part', 'Prestation en capital du 3e pilier a', 'none'),
    line('capital.vested', 'aPart', 'Imposés à part', 'Prestation en capital de libre passage', 'none'),
    line('capital.other', 'aPart', 'Imposés à part', 'Autres prestations en capital', 'none'),
    line('gift.amount', 'aPart', 'Imposés à part', "Donations, avances d'hoirie et successions", 'none')
];

const KINDS: TaxEntryKind[] = ['employment', 'child', 'property', 'debt', 'institution'];
const STATUSES: TaxStatus[] = ['enCours', 'preteARecopier', 'deposee', 'archivee'];
const PERSONS: TaxPerson[] = ['1', '2', '1+2'];

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function notFound(message: string): never {
    throw new AppError(message, 404);
}

function invalid(message: string): never {
    throw new AppError(message, 400);
}

function ok(body: unknown): TaxResult {
    return { status: 200, body };
}

function noContent(): TaxResult {
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

function findLine(code: string | null | undefined): LineDefinition | undefined {
    return CATALOGUE.find((item) => item.code === code);
}

const EMPTY_IDENTITY: TaxIdentity = { officialName: null, firstName: null, vn: null, municipality: null, job: null };

function amountOf(
    code: string,
    person: TaxPerson,
    competence: TaxCompetence,
    amount: number,
    origin: TaxLineValue['origin']
): StoredAmount {
    return { code, person, competence, amount, currency: 'CHF', origin };
}

/** Une déclaration 2025 déjà entamée, pour que l’écran ne s’ouvre pas à vide. */
export function seedTaxReturns(): DemoTaxReturn[] {
    return [
        {
            publicId: 'TAX2025',
            year: 2025,
            canton: 'VD',
            status: 'enCours',
            couple: false,
            taxpayerNumber: null,
            notes: null,
            person1: { officialName: 'Démo', firstName: 'Sacha', vn: null, municipality: 'Lausanne', job: 'Responsable atelier' },
            person2: null,
            amounts: [
                amountOf('income.employed', '1', 'both', 74400, 'saisie'),
                amountOf('deduction.jobExpenses', '1', 'cantonal', 1800, 'saisie'),
                amountOf('deduction.jobExpenses', '1', 'federal', 1800, 'saisie'),
                amountOf('deduction.pillar3a', '1', 'cantonal', 7258, 'saisie'),
                amountOf('deduction.pillar3a', '1', 'federal', 7258, 'saisie'),
                amountOf('asset.cashAndSecurities', '1', 'both', 18450, 'saisie')
            ],
            entries: [
                {
                    publicId: 'TXE0001',
                    kind: 'employment',
                    person: '1',
                    title: 'Atelier Horizon',
                    detail: 'Certificat de salaire 2025',
                    amount: 74400,
                    secondaryAmount: null
                }
            ],
            documents: [],
            checklist: [],
            previousPublicId: null
        }
    ];
}

function store(): DemoTaxReturn[] {
    return demoDb().taxReturns;
}

function findReturn(id: string): DemoTaxReturn {
    return store().find((item) => item.publicId === id) ?? notFound('Déclaration introuvable.');
}

function filledCodes(tax: DemoTaxReturn): Set<string> {
    return new Set(tax.amounts.map((item) => item.code));
}

function sumBucket(amounts: StoredAmount[], bucket: TaxBucket): number | null {
    let total = 0;
    let any = false;
    for (const item of amounts) {
        if (findLine(item.code)?.bucket !== bucket) continue;
        total += item.amount;
        any = true;
    }
    return any ? round(total) : null;
}

function subtotals(tax: DemoTaxReturn): TaxSubtotal[] {
    const people = PERSONS.filter((person) => tax.amounts.some((item) => item.person === person));
    const result: TaxSubtotal[] = [];
    for (const person of people) {
        for (const view of ['cantonal', 'federal'] as const) {
            const relevant = tax.amounts.filter(
                (item) => item.person === person && (item.competence === 'both' || item.competence === view)
            );
            const income = sumBucket(relevant, 'income');
            const deductions = sumBucket(relevant, 'deduction');
            const assets = sumBucket(relevant, 'asset');
            const liabilities = sumBucket(relevant, 'liability');
            if (income === null && deductions === null && assets === null && liabilities === null) continue;
            result.push({
                person,
                competence: view,
                income,
                deductions,
                netIncome: income === null && deductions === null ? null : round((income ?? 0) - (deductions ?? 0)),
                assets,
                liabilities,
                netAssets: assets === null && liabilities === null ? null : round((assets ?? 0) - (liabilities ?? 0))
            });
        }
    }
    return result;
}

function toResponse(tax: DemoTaxReturn): TaxReturn {
    const sections: TaxReturn['sections'] = [];
    for (const definition of CATALOGUE) {
        let section = sections.find((item) => item.code === definition.section);
        if (!section) {
            section = { code: definition.section, label: definition.sectionLabel, lines: [] };
            sections.push(section);
        }
        section.lines.push({
            code: definition.code,
            label: definition.label,
            splitsCompetence: definition.splits,
            values: tax.amounts
                .filter((item) => item.code === definition.code)
                .sort((a, b) => PERSONS.indexOf(a.person) - PERSONS.indexOf(b.person) || a.competence.localeCompare(b.competence))
                .map(({ person, competence, amount, currency, origin }) => ({ person, competence, amount, currency, origin }))
        });
    }
    const filled = filledCodes(tax);
    return {
        publicId: tax.publicId,
        name: null,
        year: tax.year,
        canton: tax.canton,
        status: tax.status,
        couple: tax.couple,
        taxpayerNumber: tax.taxpayerNumber,
        notes: tax.notes,
        person1: { ...tax.person1 },
        person2: tax.couple ? { ...(tax.person2 ?? EMPTY_IDENTITY) } : null,
        sections,
        subtotals: subtotals(tax),
        gaps: CATALOGUE.filter((item) => !filled.has(item.code)).map((item) => item.code),
        entries: tax.entries.map((item) => ({ ...item })),
        documents: tax.documents.map((item) => ({ ...item })),
        checklist: tax.checklist.map(toChecklistItem(tax)),
        previousPublicId:
            tax.previousPublicId && store().some((item) => item.publicId === tax.previousPublicId) ? tax.previousPublicId : null,
        submissionDate: tax.submissionDate ?? null,
        locked: isLocked(tax),
        corrections: (tax.corrections ?? []).map((item) => ({ ...item })),
        civilStatus: tax.civilStatus ?? null,
        taxationMode: tax.taxationMode ?? 'ordinaire',
        profile: demoProfile(tax.canton, tax.year, isLocked(tax)),
        federalProfile: demoProfile('CH', tax.year, isLocked(tax))
    };
}

/** Profils de la démo, comme l'API : JU et CH 2025 en brouillon, repris (signalés) pour les années suivantes, figés au dépôt. */
function demoProfile(canton: string, year: number, frozen: boolean): TaxProfileInfo | null {
    if ((canton !== 'JU' && canton !== 'CH') || year < 2025) return null;
    return {
        canton,
        year: 2025,
        version: 1,
        status: 'draft',
        otherYear: year !== 2025,
        officialSoftware: canton === 'JU' ? 'JuraTax' : null,
        // comme l'API : figé au dépôt, libéré par l'annulation du dépôt
        frozen
    };
}

/** Comme l'API : déposée, ou déposée puis archivée (la date de dépôt reste posée). */
function isLocked(tax: DemoTaxReturn): boolean {
    return tax.status === 'deposee' || Boolean(tax.submissionDate);
}

function ensureUnlocked(tax: DemoTaxReturn): void {
    if (isLocked(tax)) invalid('La déclaration est déposée : corrige le montant ligne par ligne, avec un motif.');
}

function todayYmd(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toChecklistItem(tax: DemoTaxReturn) {
    const filedLines = new Set(tax.documents.map((doc) => doc.lineCode).filter((code): code is string => Boolean(code)));
    return ({ complete, ...item }: DemoChecklistItem): TaxChecklistItem => ({ ...item, received: complete || filedLines.has(item.code) });
}

function toListItem(tax: DemoTaxReturn): TaxReturnListItem {
    return {
        publicId: tax.publicId,
        name: null,
        year: tax.year,
        canton: tax.canton,
        status: tax.status,
        couple: tax.couple,
        filledCount: filledCodes(tax).size,
        lineCount: CATALOGUE.length,
        checklistReceived: tax.checklist.map(toChecklistItem(tax)).filter((item) => item.received).length,
        checklistTotal: tax.checklist.length,
        locked: isLocked(tax)
    };
}

function annualFactor(frequency: string): number | null {
    switch (frequency) {
        case 'hebdomadaire':
            return 52;
        case 'mensuelle':
            return 12;
        case 'trimestrielle':
            return 4;
        case 'semestrielle':
            return 2;
        case 'annuelle':
            return 1;
        default:
            return null;
    }
}

function incomeCode(type: string): string | null {
    switch (type) {
        case 'salaire':
        case 'prime':
        case 'treiziemeSalaire':
            return 'income.employed';
        case 'freelance':
            return 'income.selfEmployed';
        case 'loyerEncaisse':
            return 'income.property';
        case 'dividende':
        case 'interet':
            return 'income.securities';
        case 'rente':
            return 'income.retirementPension';
        case 'pension':
            return 'income.alimony';
        case 'allocation':
            return 'income.allowances';
        default:
            return null;
    }
}

function suggestionSource(code: string): TaxSuggestionSource {
    if (code === 'liability.debts') return 'liability';
    if (code === 'asset.property' || code === 'asset.crypto') return 'asset';
    return 'recurringIncome';
}

/** Propositions pour les cases vides, tirées du foyer de démo (revenus récurrents, dettes, actifs). */
function buildSuggestions(tax: DemoTaxReturn): TaxSuggestion[] {
    const db = demoDb();
    const taken = new Set(tax.amounts.filter((item) => item.person === '1').map((item) => `${item.code}|${item.competence}`));
    const sums = new Map<string, number>();
    const contributors = new Map<string, TaxSuggestionSourceItem[]>();
    const add = (code: string, amount: number, from: TaxSuggestionSourceItem) => {
        sums.set(code, (sums.get(code) ?? 0) + amount);
        contributors.set(code, [...(contributors.get(code) ?? []), from]);
    };

    for (const income of db.recurringIncomes) {
        const factor = annualFactor(String(income.frequency));
        const code = incomeCode(String(income.incomeType));
        if (!income.isActive || income.currency !== 'CHF' || factor === null || code === null) continue;
        add(code, round(income.plannedAmount * factor), { publicId: income.publicId, name: income.name });
    }

    const liabilities = db.liabilities.filter((item) => item.currency === 'CHF' && item.status !== 'annule' && item.status !== 'rembourse');
    for (const item of liabilities.filter((row) => row.remainingAmount > 0)) {
        add('liability.debts', item.remainingAmount, { publicId: item.publicId, name: item.name });
    }
    const interestSources = liabilities
        .filter((item) => item.interestRate && item.interestRate > 0)
        .map((item) => ({ publicId: item.publicId, name: item.name }));
    const interest = liabilities.reduce(
        (sum, item) => sum + (item.interestRate && item.interestRate > 0 ? round((item.remainingAmount * item.interestRate) / 100) : 0),
        0
    );

    const assets = db.assets.filter((item) => item.isActive && item.currency === 'CHF');
    for (const item of assets.filter((row) => row.type === 'immobilier' && row.estimatedValue > 0)) {
        add('asset.property', item.estimatedValue, { publicId: item.publicId, name: item.name });
    }
    for (const item of assets.filter((row) => row.type === 'crypto' && row.estimatedValue > 0)) {
        add('asset.crypto', item.estimatedValue, { publicId: item.publicId, name: item.name });
    }

    const origins: Record<string, string> = {
        'asset.property': 'Valeur estimée des immeubles, pas la valeur fiscale. À vérifier.',
        'asset.crypto': 'Valeur estimée des cryptomonnaies. À vérifier.',
        'liability.debts': 'Capital restant des dettes. À vérifier au 31 décembre.'
    };
    const items: TaxSuggestion[] = [];
    const offer = (
        definition: LineDefinition,
        competence: TaxCompetence,
        amount: number,
        originLabel: string,
        source: TaxSuggestionSource,
        sources: TaxSuggestionSourceItem[]
    ) => {
        if (definition.splits !== (competence !== 'both') || taken.has(`${definition.code}|${competence}`)) return;
        items.push({
            code: definition.code,
            label: definition.label,
            person: '1',
            competence,
            amount: round(amount),
            currency: 'CHF',
            originLabel,
            source,
            sources
        });
    };
    for (const [code, amount] of [...sums.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const definition = findLine(code);
        if (definition && amount > 0) {
            offer(
                definition,
                'both',
                amount,
                origins[code] ?? 'Revenu récurrent annualisé. À vérifier.',
                suggestionSource(code),
                contributors.get(code) ?? []
            );
        }
    }
    const debtInterest = findLine('deduction.debtInterest');
    if (debtInterest && interest > 0) {
        const origin = 'Intérêts estimés : capital restant × taux. À vérifier.';
        offer(debtInterest, 'cantonal', interest, origin, 'liability', interestSources);
        offer(debtInterest, 'federal', interest, origin, 'liability', interestSources);
    }
    return items;
}

function parsePerson(raw: string | null | undefined): TaxPerson {
    if (raw == null || raw === '') return '1';
    if ((PERSONS as string[]).includes(raw)) return raw as TaxPerson;
    return invalid('Personne invalide (1, 2, 1+2).');
}

function ensurePersonAllowed(tax: DemoTaxReturn, person: TaxPerson): void {
    if (!tax.couple && person !== '1') invalid('Ouvre le couple avant d’inscrire un montant pour la personne 2.');
}

function writeAmount(
    tax: DemoTaxReturn,
    code: string,
    person: TaxPerson,
    competence: TaxCompetence,
    amount: number,
    origin: TaxLineValue['origin']
) {
    const existing = tax.amounts.find((item) => item.code === code && item.person === person && item.competence === competence);
    if (existing) {
        existing.amount = amount;
        existing.origin = origin;
        return;
    }
    tax.amounts.push(amountOf(code, person, competence, amount, origin));
}

function normalizeAmount(value: number | null | undefined): number | null {
    if (value == null) return null;
    if (!Number.isFinite(value)) invalid('Montant invalide.');
    if (value < 0) invalid('Le montant ne peut pas être négatif.');
    if (value >= 10_000_000_000_000) invalid('Le montant dépasse 13 chiffres.');
    return round(value);
}

function normalizeText(raw: string | null | undefined, max: number, field: string): string | null {
    const value = raw?.trim();
    if (!value) return null;
    if (value.length > max) invalid(`${field} dépasse ${max} caractères.`);
    return value;
}

function normalizeIdentity(identity: TaxIdentity | null | undefined): TaxIdentity {
    return {
        officialName: normalizeText(identity?.officialName, 100, 'Le nom'),
        firstName: normalizeText(identity?.firstName, 100, 'Le prénom'),
        vn: normalizeText(identity?.vn, 16, 'Le numéro AVS'),
        municipality: normalizeText(identity?.municipality, 100, 'La commune'),
        job: normalizeText(identity?.job, 100, 'La profession')
    };
}

function normalizeCanton(raw: string | null | undefined): string {
    const code = raw?.trim().toUpperCase() ?? '';
    if (!(TAX_CANTONS as readonly string[]).includes(code)) invalid("Canton inconnu. Utilise l'abréviation officielle (VD, GE, ZH…).");
    return code;
}

function createReturn(body: { year: number; canton: string }) {
    const year = Number(body.year);
    const max = new Date().getFullYear() + 1;
    if (!Number.isInteger(year) || year < 2000 || year > max) invalid(`L'année fiscale doit être comprise entre 2000 et ${max}.`);
    if (store().some((item) => item.year === year)) invalid('Une déclaration existe déjà pour cette année.');
    const tax: DemoTaxReturn = {
        publicId: createPublicId(),
        year,
        canton: normalizeCanton(body.canton),
        status: 'enCours',
        couple: false,
        taxpayerNumber: null,
        notes: null,
        person1: { officialName: 'Démo', firstName: 'Sacha', vn: null, municipality: 'Lausanne', job: null },
        person2: null,
        amounts: [],
        entries: [],
        documents: [],
        checklist: [],
        previousPublicId: null
    };
    store().push(tax);
    return { declaration: toResponse(tax), suggestions: buildSuggestions(tax) };
}

/** Pièces à attendre, comme l'API : une par fiche, et une par ligne remplie qui en demande une. */
const CHECKLIST_BY_LINE: Record<string, { category: string; label: string; required: boolean }> = {
    'deduction.pillar3a': { category: 'troisiemePilier', label: 'Attestation du 3e pilier a', required: true },
    'deduction.pillar2BuyIn': { category: 'other', label: 'Attestation de rachat dans le 2e pilier', required: true },
    'deduction.insurance': { category: 'assuranceMaladie', label: "Attestation des primes d'assurance", required: false },
    'deduction.healthGross': { category: 'fraisMedicaux', label: "Justificatifs des frais de maladie et d'accident", required: false },
    'deduction.childcare': { category: 'other', label: 'Justificatifs des frais de garde', required: false },
    'deduction.education': { category: 'other', label: 'Justificatifs des frais de formation', required: false },
    'deduction.donations': { category: 'other', label: 'Attestations de dons', required: false },
    'deduction.alimonyPaid': { category: 'other', label: 'Jugement ou convention et preuves des pensions versées', required: true },
    'deduction.politicalContributions': { category: 'other', label: 'Attestation des cotisations ou dons au parti', required: false },
    'income.retirementPension': { category: 'other', label: 'Attestation de rente AVS', required: false },
    'income.disabilityPension': { category: 'other', label: 'Attestation de rente AI', required: false },
    'income.unemployment': { category: 'other', label: 'Décompte des indemnités de chômage', required: false },
    'asset.crypto': { category: 'crypto', label: 'Relevé des cryptomonnaies au 31.12', required: false }
};

function checklistSeeds(tax: DemoTaxReturn, previous: DemoTaxReturn | null): DemoChecklistItem[] {
    const seeds: DemoChecklistItem[] = [];
    const add = (code: string, label: string, category: string, required: boolean) => {
        if (!seeds.some((item) => item.code === code)) seeds.push({ code, label, category, required, complete: false, comment: null });
    };
    for (const entry of tax.entries) {
        if (entry.kind === 'employment')
            add(`employment:${entry.publicId}`, `Certificat de salaire — ${entry.title}`, 'certificatSalaire', true);
        if (entry.kind === 'institution') add(`institution:${entry.publicId}`, `Relevé fiscal — ${entry.title}`, 'banque', true);
        if (entry.kind === 'property')
            add(`property:${entry.publicId}`, `Justificatifs de l'immeuble — ${entry.title}`, 'immobilier', false);
        if (entry.kind === 'debt') add(`debt:${entry.publicId}`, `Attestation de dette et d'intérêts — ${entry.title}`, 'dette', false);
    }
    if (previous) {
        const filled = filledCodes(previous);
        if (filled.has('deduction.health')) filled.add('deduction.healthGross');
        for (const definition of CATALOGUE) {
            const rule = CHECKLIST_BY_LINE[definition.code];
            if (rule && filled.has(definition.code)) add(definition.code, rule.label, rule.category, rule.required);
        }
        for (const doc of previous.documents) {
            const definition = doc.lineCode ? findLine(doc.lineCode) : undefined;
            if (definition) add(definition.code, `Justificatif — ${definition.label}`, 'other', false);
        }
    }
    return seeds;
}

function createNextYear(source: DemoTaxReturn) {
    const year = source.year + 1;
    const max = new Date().getFullYear() + 1;
    if (year > max) invalid("La déclaration de l'année suivante n'est pas encore ouverte.");
    if (store().some((item) => item.year === year)) invalid('Une déclaration existe déjà pour cette année.');
    const tax: DemoTaxReturn = {
        publicId: createPublicId(),
        year,
        canton: source.canton,
        status: 'enCours',
        couple: source.couple,
        taxpayerNumber: source.taxpayerNumber,
        notes: null,
        person1: { ...source.person1 },
        person2: source.person2 ? { ...source.person2 } : null,
        amounts: [],
        entries: source.entries.map((entry) => ({ ...entry, publicId: createPublicId(), amount: null, secondaryAmount: null })),
        documents: [],
        checklist: [],
        previousPublicId: source.publicId,
        civilStatus: source.civilStatus ?? null,
        taxationMode: source.taxationMode ?? 'ordinaire'
    };
    tax.checklist = checklistSeeds(tax, source);
    store().push(tax);
    return { declaration: toResponse(tax), suggestions: [] };
}

function generateChecklist(tax: DemoTaxReturn) {
    const previous = tax.previousPublicId ? (store().find((item) => item.publicId === tax.previousPublicId) ?? null) : null;
    for (const seed of checklistSeeds(tax, previous)) {
        if (!tax.checklist.some((item) => item.code === seed.code)) tax.checklist.push(seed);
    }
    return toResponse(tax);
}

function updateChecklistItem(tax: DemoTaxReturn, code: string, body: { complete?: boolean; comment?: string | null }) {
    const item = tax.checklist.find((candidate) => candidate.code === code) ?? notFound('Pièce attendue introuvable.');
    if (typeof body.complete === 'boolean') item.complete = body.complete;
    if (body.comment !== undefined && body.comment !== null) item.comment = body.comment.trim() || null;
    return toResponse(tax);
}

function updateReturn(tax: DemoTaxReturn, body: UpdateTaxReturnPayload) {
    if (!STATUSES.includes(body.status)) invalid('Statut invalide (enCours, preteARecopier, deposee, archivee).');
    if (isLocked(tax) && (body.status === 'enCours' || body.status === 'preteARecopier'))
        invalid('Une déclaration déposée ne se rouvre pas : corrige les montants ligne par ligne.');
    if (body.status === 'deposee') {
        const date = (body.submissionDate ?? tax.submissionDate ?? todayYmd()).slice(0, 10);
        if (date > todayYmd()) invalid('La date de dépôt ne peut pas être dans le futur.');
        tax.submissionDate = date;
    }
    if (body.civilStatus && !TAX_CIVIL_STATUSES.includes(body.civilStatus))
        invalid('État civil invalide (celibataire, marie, partenariatEnregistre, separe, divorce, veuf).');
    if (body.taxationMode && body.taxationMode !== 'ordinaire' && body.taxationMode !== 'source')
        invalid('Mode de taxation invalide (ordinaire, source).');
    tax.civilStatus = body.civilStatus || null;
    tax.taxationMode = body.taxationMode || 'ordinaire';
    tax.canton = normalizeCanton(body.canton);
    tax.status = body.status;
    tax.couple = Boolean(body.couple);
    tax.taxpayerNumber = normalizeText(body.taxpayerNumber, 30, 'Le numéro de contribuable');
    tax.notes = normalizeText(body.notes, 2000, 'Les notes');
    tax.person1 = normalizeIdentity(body.person1);
    tax.person2 = tax.couple ? normalizeIdentity(body.person2) : null;
    if (!tax.couple) tax.amounts = tax.amounts.filter((item) => item.person === '1');
    return toResponse(tax);
}

function upsertAmount(tax: DemoTaxReturn, code: string, body: UpsertTaxAmountPayload) {
    ensureUnlocked(tax);
    const definition = findLine(code) ?? notFound('Ligne inconnue.');
    const person = parsePerson(body.person);
    ensurePersonAllowed(tax, person);
    let competence: TaxCompetence = 'both';
    if (body.competence) {
        if (!['cantonal', 'federal', 'both'].includes(body.competence)) invalid('Ressort invalide (cantonal, federal, both).');
        competence = body.competence;
    } else if (definition.splits) {
        invalid('Indique le ressort : cantonal ou federal.');
    }
    if (!definition.splits && competence !== 'both') invalid('Cette ligne a un seul montant, commun au canton et à la Confédération.');
    const amount = normalizeAmount(body.amount);
    if (amount === null) {
        tax.amounts = tax.amounts.filter((item) => !(item.code === code && item.person === person && item.competence === competence));
    } else {
        writeAmount(tax, code, person, competence, amount, 'saisie');
    }
    return toResponse(tax);
}

function createEntry(tax: DemoTaxReturn, body: UpsertTaxEntryPayload) {
    if (!KINDS.includes(body.kind)) invalid('Type de fiche invalide (employment, child, property, debt, institution).');
    const title = normalizeText(body.title, 150, "L'intitulé") ?? invalid("L'intitulé est obligatoire.");
    const person = parsePerson(body.person);
    ensurePersonAllowed(tax, person);
    tax.entries.push({
        publicId: createPublicId(),
        kind: body.kind,
        person,
        title,
        detail: normalizeText(body.detail, 255, 'La précision'),
        amount: normalizeAmount(body.amount),
        secondaryAmount: normalizeAmount(body.secondaryAmount)
    });
    return toResponse(tax);
}

/** Lignes touchées par un report. Les intérêts passifs sont écrits deux fois, canton et Confédération. */
function reportTargets(kind: TaxEntryKind, amount: number | null, secondary: number | null) {
    const targets: Array<{ code: string; competence: TaxCompetence; amount: number }> = [];
    const add = (code: string, competence: TaxCompetence, value: number | null) => {
        if (value !== null) targets.push({ code, competence, amount: value });
    };
    if (kind === 'employment') add('income.employed', 'both', amount);
    if (kind === 'property') {
        add('asset.property', 'both', amount);
        add('income.property', 'both', secondary);
    }
    if (kind === 'debt') {
        add('liability.debts', 'both', amount);
        add('deduction.debtInterest', 'cantonal', secondary);
        add('deduction.debtInterest', 'federal', secondary);
    }
    if (kind === 'institution') {
        add('asset.cashAndSecurities', 'both', amount);
        add('income.securities', 'both', secondary);
    }
    return targets;
}

function sumOf(entries: TaxEntry[], pick: (entry: TaxEntry) => number | null): number | null {
    let total = 0;
    let any = false;
    for (const entry of entries) {
        const value = pick(entry);
        if (value === null) continue;
        total += value;
        any = true;
    }
    return any ? round(total) : null;
}

function reportEntries(tax: DemoTaxReturn, body: { kind: TaxEntryKind; person: TaxPerson }) {
    ensureUnlocked(tax);
    if (!KINDS.includes(body.kind)) invalid('Type de fiche invalide (employment, child, property, debt, institution).');
    const person = parsePerson(body.person);
    ensurePersonAllowed(tax, person);
    const entries = tax.entries.filter((item) => item.kind === body.kind && item.person === person);
    for (const target of reportTargets(
        body.kind,
        sumOf(entries, (e) => e.amount),
        sumOf(entries, (e) => e.secondaryAmount)
    )) {
        writeAmount(tax, target.code, person, target.competence, target.amount, 'saisie');
    }
    return toResponse(tax);
}

function acceptSuggestion(tax: DemoTaxReturn, body: { code: string; person: string; competence: string; amount: number; origin?: string }) {
    ensureUnlocked(tax);
    const definition = findLine(body.code) ?? notFound('Ligne inconnue.');
    const person = parsePerson(body.person);
    ensurePersonAllowed(tax, person);
    const competence = body.competence as TaxCompetence;
    if (!['cantonal', 'federal', 'both'].includes(competence)) invalid('Ressort invalide (cantonal, federal, both).');
    if (definition.splits === (competence === 'both')) invalid('Ressort incompatible avec cette ligne.');
    const amount = normalizeAmount(body.amount) ?? invalid('Montant invalide.');
    const origin = body.origin || 'propositionAcceptee';
    if (origin !== 'propositionAcceptee' && origin !== 'importee') invalid('Origine invalide (propositionAcceptee, importee).');
    writeAmount(tax, body.code, person, competence, amount, origin);
    return toResponse(tax);
}

/** Plusieurs propositions d'un coup, comme l'API : tout est inscrit, ou rien (case remplie, case répétée, liste vide). */
function acceptSuggestions(
    tax: DemoTaxReturn,
    body: { items: { code: string; person: string; competence: string; amount: number; origin?: string }[] }
) {
    const items = body.items ?? [];
    if (!items.length) invalid('Aucune proposition à accepter.');
    if (items.length > 200) invalid('Trop de propositions à la fois.');
    const before = tax.amounts.map((item) => ({ ...item }));
    const seen = new Set<string>();
    try {
        for (const item of items) {
            const key = `${item.code}|${item.person || '1'}|${item.competence}`;
            const taken = tax.amounts.some((a) => `${a.code}|${a.person}|${a.competence}` === key);
            if (seen.has(key) || taken) invalid('Cette case est déjà remplie.');
            seen.add(key);
            acceptSuggestion(tax, item);
        }
    } catch (e) {
        tax.amounts = before;
        throw e;
    }
    return toResponse(tax);
}

/** Saisie groupée, comme l'API : tout ou rien, origine « saisie », refusée si la déclaration est déposée. */
function upsertAmounts(tax: DemoTaxReturn, body: { items?: (UpsertTaxAmountPayload & { code: string })[] }) {
    ensureUnlocked(tax);
    const items = body.items ?? [];
    if (!items.length) invalid('Aucun montant à inscrire.');
    if (items.length > 200) invalid('Trop de montants à la fois.');
    const seen = new Set<string>();
    for (const item of items) {
        const key = `${item.code}|${item.person || '1'}|${item.competence || 'both'}`;
        if (seen.has(key)) invalid('Une même case apparaît deux fois.');
        seen.add(key);
    }
    const before = tax.amounts.map((item) => ({ ...item }));
    try {
        for (const item of items) upsertAmount(tax, item.code, item);
    } catch (e) {
        tax.amounts = before;
        throw e;
    }
    return toResponse(tax);
}

/** Annulation d'un dépôt, comme l'API : retour à « prête à recopier », corrections conservées. */
function cancelFiling(tax: DemoTaxReturn) {
    if (!isLocked(tax)) invalid("La déclaration n'est pas déposée.");
    tax.status = 'preteARecopier';
    tax.submissionDate = null;
    return toResponse(tax);
}

/** Correction d'une déclaration déposée, comme l'API : motif obligatoire, montant changé, trace gardée. */
function correctAmount(
    tax: DemoTaxReturn,
    body: { code: string; person: string; competence: string | null; amount: number | null; reason: string }
) {
    if (!isLocked(tax)) invalid("La déclaration n'est pas déposée : modifie le montant directement.");
    const reason = normalizeText(body.reason, 500, 'Le motif') ?? invalid('Indique le motif de la correction.');
    const definition = findLine(body.code) ?? notFound('Ligne inconnue.');
    const person = parsePerson(body.person);
    ensurePersonAllowed(tax, person);
    const competence = (body.competence || 'both') as TaxCompetence;
    if (!['cantonal', 'federal', 'both'].includes(competence)) invalid('Ressort invalide (cantonal, federal, both).');
    if (definition.splits === (competence === 'both')) invalid('Ressort incompatible avec cette ligne.');
    const amount = normalizeAmount(body.amount);
    const existing = tax.amounts.find((item) => item.code === body.code && item.person === person && item.competence === competence);
    const previous = existing ? existing.amount : null;
    if (previous === amount) invalid("Le montant n'a pas changé.");
    if (amount === null) {
        tax.amounts = tax.amounts.filter((item) => item !== existing);
    } else {
        writeAmount(tax, body.code, person, competence, amount, 'saisie');
    }
    tax.corrections = [
        { code: body.code, person, competence, previous, amount, reason, at: new Date().toISOString() },
        ...(tax.corrections ?? [])
    ];
    return toResponse(tax);
}

function attachDocument(tax: DemoTaxReturn, body: { filePublicId: string; lineCode: string | null }) {
    const file = demoDb().files.find((item) => item.publicId === body.filePublicId) ?? notFound('Fichier introuvable.');
    const lineCode = body.lineCode?.trim() || null;
    if (lineCode && !findLine(lineCode)) invalid('Ligne inconnue.');
    if (tax.documents.some((item) => item.filePublicId === file.publicId)) invalid('Cette pièce est déjà rangée ici.');
    tax.documents.unshift({
        publicId: createPublicId(),
        filePublicId: file.publicId,
        fileName: file.nameOriginal,
        lineCode,
        label: file.nameOriginal
    });
    return toResponse(tax);
}

function money(value: number): string {
    return Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/** Caractères hors Latin-1 remplacés : le PDF de démo n’embarque aucune police. */
function latin1(text: string): string {
    return text
        .replace(/[’‘]/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/[×]/g, 'x')
        .replace(/[·•]/g, '-')
        .replace(/[^\x20-\xff]/g, '?')
        .replace(/[\\()]/g, (char) => `\\${char}`);
}

function pdfLines(tax: DemoTaxReturn): string[] {
    const lines = [
        `Brouillon de declaration d'impots ${tax.year} - canton ${tax.canton}`,
        'Brouillon Spend.Up a recopier dans la declaration officielle.',
        ''
    ];
    const identity = [tax.person1.firstName, tax.person1.officialName].filter(Boolean).join(' ');
    if (identity) lines.push(`Contribuable : ${identity}${tax.person1.municipality ? `, ${tax.person1.municipality}` : ''}`);
    lines.push('');
    for (const definition of CATALOGUE) {
        const values = tax.amounts.filter((item) => item.code === definition.code);
        for (const value of values) {
            const scope = value.competence === 'both' ? '' : value.competence === 'cantonal' ? ' (canton)' : ' (Confederation)';
            lines.push(`${definition.sectionLabel} - ${definition.label}${scope} : CHF ${money(value.amount)}`);
        }
    }
    if (lines.length <= 5) lines.push('Aucun montant saisi.');
    return lines;
}

/** PDF minimal (Helvetica, texte seul) pour que le bouton de téléchargement fonctionne en démo. */
function buildPdf(lines: string[]): Blob {
    const perPage = 46;
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    const objects: string[] = [];
    const pageIds: number[] = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    for (const page of pages) {
        const stream = `BT /F1 10 Tf 14 TL 50 800 Td ${page.map((text) => `(${latin1(text)}) Tj T*`).join(' ')} ET`;
        objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        pageIds.push(objects.length + 1);
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`
        );
    }
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, index) => {
        offsets.push(out.length);
        out += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
}

/** Routes `/api/tax-returns`. `null` si le chemin n’est pas concerné. */
export function routeTax(method: string, path: string, body: unknown, query?: URLSearchParams): TaxResult {
    if (!path.startsWith('/api/tax-returns')) return null;

    if (path === '/api/tax-returns' && method === 'GET') {
        const items = [...store()].sort((a, b) => b.year - a.year).map(toListItem);
        return ok({ items, totalCount: items.length });
    }
    if (path === '/api/tax-returns' && method === 'POST') return ok(createReturn(body as { year: number; canton: string }));

    const detail = match(path, '/api/tax-returns/:id');
    if (detail && method === 'GET') return ok(toResponse(findReturn(detail.id)));
    if (detail && method === 'PUT') return ok(updateReturn(findReturn(detail.id), body as UpdateTaxReturnPayload));
    if (detail && method === 'DELETE') {
        const tax = findReturn(detail.id);
        demoDb().taxReturns = store().filter((item) => item !== tax);
        return noContent();
    }

    const unfile = match(path, '/api/tax-returns/:id/cancel-filing');
    if (unfile && method === 'POST') return ok(cancelFiling(findReturn(unfile.id)));
    const correction = match(path, '/api/tax-returns/:id/corrections');
    if (correction && method === 'POST')
        return ok(
            correctAmount(
                findReturn(correction.id),
                body as { code: string; person: string; competence: string | null; amount: number | null; reason: string }
            )
        );
    const amounts = match(path, '/api/tax-returns/:id/amounts');
    if (amounts && method === 'PUT')
        return ok(upsertAmounts(findReturn(amounts.id), body as { items?: (UpsertTaxAmountPayload & { code: string })[] }));
    const amount = match(path, '/api/tax-returns/:id/amounts/:code');
    if (amount && method === 'PUT') return ok(upsertAmount(findReturn(amount.id), amount.code, body as UpsertTaxAmountPayload));

    if (path.endsWith('/entries/report')) {
        const report = match(path, '/api/tax-returns/:id/entries/report');
        if (report && method === 'POST') return ok(reportEntries(findReturn(report.id), body as { kind: TaxEntryKind; person: TaxPerson }));
    }
    const entries = match(path, '/api/tax-returns/:id/entries');
    if (entries && method === 'POST') return ok(createEntry(findReturn(entries.id), body as UpsertTaxEntryPayload));
    const entry = match(path, '/api/tax-returns/:id/entries/:entryId');
    if (entry && method === 'DELETE') {
        const tax = findReturn(entry.id);
        if (!tax.entries.some((item) => item.publicId === entry.entryId)) notFound('Fiche introuvable.');
        tax.entries = tax.entries.filter((item) => item.publicId !== entry.entryId);
        return ok(toResponse(tax));
    }

    const suggestions = match(path, '/api/tax-returns/:id/suggestions');
    if (suggestions && method === 'GET') return ok({ items: buildSuggestions(findReturn(suggestions.id)) });
    const acceptMany = match(path, '/api/tax-returns/:id/suggestions/accept-many');
    if (acceptMany && method === 'POST')
        return ok(
            acceptSuggestions(
                findReturn(acceptMany.id),
                body as { items: { code: string; person: string; competence: string; amount: number; origin?: string }[] }
            )
        );
    const nextYear = match(path, '/api/tax-returns/:id/next-year');
    if (nextYear && method === 'POST') return ok(createNextYear(findReturn(nextYear.id)));
    const generate = match(path, '/api/tax-returns/:id/checklist/generate');
    if (generate && method === 'POST') return ok(generateChecklist(findReturn(generate.id)));
    const checklistItem = match(path, '/api/tax-returns/:id/checklist/:code');
    if (checklistItem && method === 'PUT')
        return ok(
            updateChecklistItem(
                findReturn(checklistItem.id),
                decodeURIComponent(checklistItem.code),
                body as { complete?: boolean; comment?: string | null }
            )
        );
    const accept = match(path, '/api/tax-returns/:id/suggestions/accept');
    if (accept && method === 'POST')
        return ok(acceptSuggestion(findReturn(accept.id), body as { code: string; person: string; competence: string; amount: number }));

    const documents = match(path, '/api/tax-returns/:id/documents');
    if (documents && method === 'POST')
        return ok(attachDocument(findReturn(documents.id), body as { filePublicId: string; lineCode: string | null }));
    const document = match(path, '/api/tax-returns/:id/documents/:documentId');
    if (document && method === 'DELETE') {
        const tax = findReturn(document.id);
        if (!tax.documents.some((item) => item.publicId === document.documentId)) notFound('Pièce introuvable.');
        tax.documents = tax.documents.filter((item) => item.publicId !== document.documentId);
        return ok(toResponse(tax));
    }

    const exported = match(path, '/api/tax-returns/:id/export');
    if (exported && method === 'GET') {
        const tax = toResponse(findReturn(exported.id));
        if (query?.get('format') === 'json') return ok(new Blob([JSON.stringify(tax, null, 2)], { type: 'application/json' }));
        const rows = ['section;code;ligne;personne;ressort;montant;devise;origine'];
        for (const section of tax.sections)
            for (const line of section.lines)
                for (const value of line.values)
                    rows.push(
                        [
                            section.label,
                            line.code,
                            line.label,
                            value.person,
                            value.competence,
                            value.amount.toFixed(2),
                            value.currency,
                            value.origin
                        ]
                            .map((cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
                            .join(';')
                    );
        return ok(new Blob(['\ufeff' + rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
    }
    const pdf = match(path, '/api/tax-returns/:id/pdf');
    if (pdf && method === 'GET') return ok(buildPdf(pdfLines(findReturn(pdf.id))));

    const statement = match(path, '/api/tax-returns/:id/statements');
    if (statement && method === 'POST') throw new AppError('Disponible avec un compte.', 403);

    return null;
}
