import { formatAccountBalance, formatSwissNumber, SWISS_MINUS } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import type {
    NetWorthBucket,
    NetWorthEvolutionPoint,
    NetWorthExcluded,
    NetWorthLastSnapshot,
    NetWorthOverview,
    NetWorthSnapshot,
    SnapshotsListResult
} from '@/features/net-worth/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function isValidYmd(value: string | null | undefined): boolean {
    if (value == null) return false;
    const trimmed = value.trim();
    if (!YMD_RE.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

/** « oct. 26 » — libellé d’axe pour une période `yyyy-MM-dd`. */
export function monthLabel(periode: string, locale?: string): string {
    const match = /^(\d{4})-(\d{2})/.exec(periode.trim());
    if (!match) return periode;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1, 12);
    return new Intl.DateTimeFormat(locale || undefined, { month: 'short', year: '2-digit' }).format(date);
}

// ── normalisation des réponses API ───────────────────────────────────────────

function toNumber(value: unknown, fallback = 0): number {
    const n = typeof value === 'string' ? Number(value) : value;
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: unknown): number | null {
    if (value == null) return null;
    const n = typeof value === 'string' ? Number(value) : value;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function toText(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function normalizeBuckets(raw: unknown): NetWorthBucket[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const bucket = (item ?? {}) as Partial<NetWorthBucket>;
            return { type: toText(bucket.type), count: toNumber(bucket.count), total: toNumber(bucket.total) };
        })
        .filter((bucket) => bucket.type);
}

function normalizeExcluded(raw: unknown): NetWorthExcluded[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const row = (item ?? {}) as Partial<NetWorthExcluded>;
            return {
                currency: toText(row.currency),
                accountsCount: toNumber(row.accountsCount),
                assetsCount: toNumber(row.assetsCount),
                liabilitiesCount: toNumber(row.liabilitiesCount)
            };
        })
        .filter((row) => row.currency && row.accountsCount + row.assetsCount + row.liabilitiesCount > 0);
}

function normalizeLastSnapshot(raw: unknown): NetWorthLastSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const last = raw as Partial<NetWorthLastSnapshot>;
    const periode = toText(last.periode);
    if (!periode) return null;
    return { periode, netWorth: toNumber(last.netWorth), delta: toNumber(last.delta) };
}

export function normalizeOverview(raw: Partial<NetWorthOverview> | null | undefined): NetWorthOverview {
    const source = raw ?? {};
    const friends = (source.friendsBalance ?? {}) as Partial<NetWorthOverview['friendsBalance']>;
    return {
        currency: toText(source.currency, 'CHF'),
        asOf: toText(source.asOf),
        totalAccounts: toNumber(source.totalAccounts),
        totalAssets: toNumber(source.totalAssets),
        totalLiabilities: toNumber(source.totalLiabilities),
        netWorth: toNumber(source.netWorth),
        investments: toNumber(source.investments),
        investmentsWithoutQuote: toNumber(source.investmentsWithoutQuote),
        accountsByType: normalizeBuckets(source.accountsByType),
        assetsByType: normalizeBuckets(source.assetsByType),
        liabilitiesByType: normalizeBuckets(source.liabilitiesByType),
        friendsBalance: { receivable: toNumber(friends.receivable), payable: toNumber(friends.payable) },
        excluded: normalizeExcluded(source.excluded),
        lastSnapshot: normalizeLastSnapshot(source.lastSnapshot)
    };
}

export function normalizeSnapshot(raw: Partial<NetWorthSnapshot> | null | undefined): NetWorthSnapshot {
    const source = raw ?? {};
    return {
        periode: toText(source.periode),
        totalAccounts: toNumber(source.totalAccounts),
        totalAssets: toNumber(source.totalAssets),
        totalLiabilities: toNumber(source.totalLiabilities),
        netWorth: toNumber(source.netWorth),
        monthlyIncome: toNumber(source.monthlyIncome),
        monthlyExpenses: toNumber(source.monthlyExpenses),
        savingsRate: toNullableNumber(source.savingsRate),
        currency: toText(source.currency, 'CHF'),
        computedAt: toText(source.computedAt)
    };
}

/** Tableau nu ou `{ items }` → snapshots normalisés, triés du plus ancien au plus récent. */
export function normalizeSnapshotsResult(raw: SnapshotsListResult | null | undefined): NetWorthSnapshot[] {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    return list
        .map((item) => normalizeSnapshot(item))
        .filter((item) => item.periode)
        .sort((a, b) => a.periode.localeCompare(b.periode));
}

// ── formats d’affichage ──────────────────────────────────────────────────────

export function formatNetWorthAmount(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

export type HeroAmountParts = {
    /** Vrai signe moins « − » (U+2212) ou chaîne vide. */
    sign: string;
    /** Partie entière formatée (« 284’800 »). */
    main: string;
    /** Décimales avec le séparateur (« .00 ») ou `null`. */
    decimals: string | null;
    currency: string;
};

/** Chiffre héros `su-hero-num` : entier en grand, décimales et devise en petit gris. */
export function splitHeroAmount(amount: number, currency: string, locale?: string): HeroAmountParts {
    void locale;
    const digits = formatSwissNumber(Math.abs(amount));
    const dot = digits.lastIndexOf('.');
    const main = dot >= 0 ? digits.slice(0, dot) : digits;
    const decimals = dot >= 0 ? digits.slice(dot) : null;
    return { sign: amount < 0 ? SWISS_MINUS : '', main, decimals, currency };
}

/** « +1’200.00 CHF » / « −350.00 CHF » ; zéro sans signe. */
export function formatSignedDelta(amount: number, currency: string, locale?: string): string {
    const text = formatNetWorthAmount(Math.abs(amount), currency, locale);
    if (amount > 0) return `+${text}`;
    if (amount < 0) return `${SWISS_MINUS}${text}`;
    return text;
}

/** « 12.5 % » — un chiffre après la virgule au plus. */
export function formatPercent(value: number, locale?: string): string {
    return `${new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(value)} %`;
}

// ── courbe d’évolution ───────────────────────────────────────────────────────

function monthKey(ymd: string): string {
    return ymd.slice(0, 7);
}

/**
 * Snapshots mensuels (ordre chronologique) + point courant tiré de l’aperçu (`asOf`).
 * Le snapshot du mois courant est remplacé par le point courant : le serveur le recalcule
 * chaque jour, le calcul du jour en est la version vivante.
 */
export function evolutionSeries(snapshots: NetWorthSnapshot[], overview: NetWorthOverview | null): NetWorthEvolutionPoint[] {
    const sorted = [...snapshots].filter((item) => item.periode).sort((a, b) => a.periode.localeCompare(b.periode));
    const points: NetWorthEvolutionPoint[] = sorted.map((item) => ({ periode: item.periode, netWorth: item.netWorth, isCurrent: false }));
    if (!overview?.asOf) return points;
    const currentKey = monthKey(overview.asOf);
    const withoutCurrentMonth = points.filter((point) => monthKey(point.periode) !== currentKey);
    return [...withoutCurrentMonth, { periode: overview.asOf, netWorth: overview.netWorth, isCurrent: true }];
}

export type ChartPadding = { top: number; right: number; bottom: number; left: number };

export const EVOLUTION_CHART_PADDING: ChartPadding = { top: 28, right: 8, bottom: 28, left: 8 };

export type ProjectedPoint = NetWorthEvolutionPoint & { x: number; y: number };

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Projette les points dans un repère `width × height` (y vers le bas), marges comprises. */
export function projectPoints(
    points: NetWorthEvolutionPoint[],
    width: number,
    height: number,
    padding: ChartPadding = EVOLUTION_CHART_PADDING
): ProjectedPoint[] {
    if (!points.length) return [];
    const innerWidth = Math.max(1, width - padding.left - padding.right);
    const innerHeight = Math.max(1, height - padding.top - padding.bottom);
    const values = points.map((point) => point.netWorth);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    return points.map((point, index) => {
        const x = points.length === 1 ? padding.left + innerWidth / 2 : padding.left + (innerWidth * index) / (points.length - 1);
        // Série plate : la courbe passe au milieu de la zone utile.
        const ratio = span === 0 ? 0.5 : (point.netWorth - min) / span;
        const y = padding.top + innerHeight * (1 - ratio);
        return { ...point, x: round2(x), y: round2(y) };
    });
}

/** Chemin SVG `M x,y L x,y …` de la courbe (chaîne vide sans point). */
export function buildLinePath(points: NetWorthEvolutionPoint[], width: number, height: number, padding?: ChartPadding): string {
    const projected = projectPoints(points, width, height, padding);
    return projected.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
}

// ── barre de répartition ─────────────────────────────────────────────────────

export type ShareInput = { key: string; value: number };
export type ShareOutput = ShareInput & { share: number };

/** Parts en % (0–100) de la somme des valeurs positives ; valeurs ≤ 0 → 0 ; total nul → tout à 0. */
export function stackedShares<T extends ShareInput>(buckets: T[]): (T & { share: number })[] {
    const total = buckets.reduce((sum, bucket) => sum + Math.max(0, bucket.value), 0);
    return buckets.map((bucket) => ({
        ...bucket,
        share: total > 0 ? round2((Math.max(0, bucket.value) / total) * 100) : 0
    }));
}

// ── libellés de répartition ──────────────────────────────────────────────────

export type BreakdownKind = 'assets' | 'liabilities' | 'accounts';

/** Types propres au calcul du patrimoine net (absents des listes d’actifs / passifs). */
const NET_WORTH_ONLY_TYPES = new Set(['pretAccorde', 'dettePartagee', 'compteCredit', 'emprunt']);

const BREAKDOWN_SECTIONS: Record<BreakdownKind, string> = {
    assets: 'assetsPage.types',
    liabilities: 'liabilitiesPage.types',
    accounts: 'comptesPage.types'
};

export type BreakdownTranslator = {
    t: (key: string) => string;
    te: (key: string) => boolean;
};

/** Clé i18n du type d’un agrégat ; repli sur le type brut si la clé n’existe pas. */
export function breakdownLabel(kind: BreakdownKind, type: string, i18n: BreakdownTranslator): string {
    const raw = type.trim();
    if (!raw) return '';
    const key = NET_WORTH_ONLY_TYPES.has(raw) ? `netWorthPage.breakdown.${raw}` : `${BREAKDOWN_SECTIONS[kind]}.${raw}`;
    return i18n.te(key) ? i18n.t(key) : raw;
}
