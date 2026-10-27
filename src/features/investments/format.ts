import { formatAccountBalance, formatSwissNumber, SWISS_MINUS } from '@/features/accounts/format';
import type { Account, Currency } from '@/features/accounts/types';
import {
    INSTRUMENT_CURRENCIES,
    INSTRUMENT_ISIN_LENGTH,
    INSTRUMENT_TYPES,
    OPERATION_QUANTITY_DECIMALS,
    OPERATION_TYPES,
    type Instrument,
    type InstrumentCurrency,
    type InstrumentType,
    type InvestmentOperation,
    type OperationType,
    type Position,
    type PositionsResult
} from '@/features/investments/types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
const QUANTITY_RE = /^[0-9]+([.,][0-9]+)?$/;
/** Quantité max (12 chiffres entiers) : garde-fou client, le serveur fait foi. */
const MAX_QUANTITY = 1_000_000_000_000;

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

export function isInstrumentType(value: unknown): value is InstrumentType {
    return typeof value === 'string' && INSTRUMENT_TYPES.includes(value as InstrumentType);
}

export function isInstrumentCurrency(value: unknown): value is InstrumentCurrency {
    return typeof value === 'string' && INSTRUMENT_CURRENCIES.includes(value as InstrumentCurrency);
}

export function isOperationType(value: unknown): value is OperationType {
    return typeof value === 'string' && OPERATION_TYPES.includes(value as OperationType);
}

/** Compte de placement = `investissement` ou `crypto`, actif (possédé ou partagé). */
export function isInvestmentAccount(account: Pick<Account, 'type' | 'isActive'>): boolean {
    return account.isActive && (account.type === 'investissement' || account.type === 'crypto');
}

/** Les opérations ne s’écrivent qu’en tant que propriétaire du compte (co-détenteur → 404 serveur). */
export function canWriteInvestments(account: Pick<Account, 'type' | 'isActive' | 'myRole'> | null | undefined): boolean {
    if (!account) return false;
    return isInvestmentAccount(account) && account.myRole === 'owner';
}

/** Quantité de titres : jusqu’à 8 décimales, chiffres tabulaires (format suisse, `locale` ignoré). */
export function formatQuantity(quantity: number, locale?: string): string {
    void locale;
    if (!Number.isFinite(quantity)) return '';
    return formatSwissNumber(quantity, { minimumFractionDigits: 0, maximumFractionDigits: OPERATION_QUANTITY_DECIMALS });
}

/** Cours / prix unitaire : 2 à 4 décimales + devise. */
export function formatPrice(price: number, currency: string, locale?: string): string {
    void locale;
    if (!Number.isFinite(price)) return '';
    return `${formatSwissNumber(price, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`;
}

/** Montant 2 décimales + devise (`formatAccountBalance`). */
export function formatMoney(amount: number, currency: string, locale?: string): string {
    return formatAccountBalance(amount, currency as Currency, locale);
}

/** Montant signé : `+` devant un positif, vrai signe moins devant un négatif. */
export function formatSignedMoney(amount: number, currency: string, locale?: string): string {
    const text = formatMoney(Math.abs(amount), currency, locale);
    if (amount > 0) return `+${text}`;
    if (amount < 0) return `${SWISS_MINUS}${text}`;
    return text;
}

/** Plus-value latente en % : signée, 2 décimales. */
export function formatGainPct(value: number | null | undefined, locale?: string): string {
    void locale;
    if (value == null || !Number.isFinite(value)) return '';
    const text = formatSwissNumber(Math.abs(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (value > 0) return `+${text} %`;
    if (value < 0) return `${SWISS_MINUS}${text} %`;
    return `${text} %`;
}

/** `achat`, `vente`, `depot`, `retrait` : quantité > 0 et prix ≥ 0 obligatoires. */
export function operationNeedsQuantity(type: OperationType): boolean {
    return type === 'achat' || type === 'vente' || type === 'depot' || type === 'retrait';
}

/** `dividende`, `frais` : sans quantité ni prix, `totalAmount` > 0 obligatoire. */
export function operationNeedsTotal(type: OperationType): boolean {
    return type === 'dividende' || type === 'frais';
}

/** Sens du flux cash : `-1` sortie (achat, frais, retrait), `+1` entrée (vente, dividende, depot). */
export function operationSign(type: OperationType): 1 | -1 {
    return type === 'achat' || type === 'frais' || type === 'retrait' ? -1 : 1;
}

/** Jambe cash autorisée : débit pour achat / frais, crédit pour vente / dividende ; interdite pour depot / retrait. */
export function operationAllowsTransaction(type: OperationType): boolean {
    return type !== 'depot' && type !== 'retrait';
}

/** Montant effectif d’une opération : `totalAmount` sinon quantité × prix. */
export function operationAmount(operation: Pick<InvestmentOperation, 'quantity' | 'unitPrice' | 'totalAmount'>): number {
    if (operation.totalAmount != null && Number.isFinite(operation.totalAmount)) return operation.totalAmount;
    const quantity = operation.quantity ?? 0;
    const unitPrice = operation.unitPrice ?? 0;
    return Number((quantity * unitPrice).toFixed(2));
}

/** Montant signé selon le type (sortie négative, entrée positive). */
export function operationSignedAmount(operation: Pick<InvestmentOperation, 'type' | 'quantity' | 'unitPrice' | 'totalAmount'>): number {
    return operationSign(operation.type) * Math.abs(operationAmount(operation));
}

function isinChecksumValid(isin: string): boolean {
    // Luhn sur la conversion lettres → nombres (A=10 … Z=35), chiffre de contrôle inclus.
    const digits = isin
        .split('')
        .map((char) => (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char))
        .join('');
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let n = Number(digits[i]);
        if (double) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        double = !double;
    }
    return sum % 10 === 0;
}

/**
 * ISIN : 12 caractères alphanumériques, 2 lettres de pays, chiffre de contrôle final.
 * `checkDigit` (défaut `true`) vérifie aussi la somme de Luhn.
 */
export function isValidIsin(value: string | null | undefined, options: { checkDigit?: boolean } = {}): boolean {
    const isin = normalizeIsin(value);
    if (isin.length !== INSTRUMENT_ISIN_LENGTH || !ISIN_RE.test(isin)) return false;
    if (options.checkDigit === false) return true;
    return isinChecksumValid(isin);
}

export function normalizeIsin(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

export function normalizeSymbol(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase();
}

/**
 * Parse une quantité de titres (8 décimales max). Accepte « 1,5 » / « 1.5 ».
 * @returns Le nombre, ou `null` si invalide.
 */
export function parseQuantity(value: unknown): number | null {
    if (value == null || value === '') return null;
    let n: number;
    if (typeof value === 'number') {
        n = value;
    } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || !QUANTITY_RE.test(trimmed)) return null;
        n = Number(trimmed.replace(',', '.'));
    } else {
        return null;
    }
    if (!Number.isFinite(n) || n < 0 || n > MAX_QUANTITY) return null;
    return Number(n.toFixed(OPERATION_QUANTITY_DECIMALS));
}

/** Prix unitaire / cours : 4 décimales max, ≥ 0. */
export function parsePrice(value: unknown): number | null {
    const parsed = parseQuantity(value);
    if (parsed == null) return null;
    return Number(parsed.toFixed(4));
}

export function instrumentLabel(instrument: Pick<Instrument, 'symbol' | 'name'>): string {
    const symbol = instrument.symbol.trim();
    const name = instrument.name.trim();
    if (symbol && name) return `${symbol} · ${name}`;
    return symbol || name;
}

function toNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function normalizeInstrument(instrument: Instrument): Instrument {
    return {
        ...instrument,
        symbol: normalizeSymbol(instrument.symbol),
        name: instrument.name ?? '',
        isin: emptyToNull(instrument.isin),
        lastPrice: toNullableNumber(instrument.lastPrice),
        lastPriceDate: emptyToNull(instrument.lastPriceDate),
        updatedAt: instrument.updatedAt ?? null
    };
}

export function normalizePosition(position: Position): Position {
    return {
        ...position,
        instrument: normalizeInstrument(position.instrument),
        quantity: toNumber(position.quantity),
        averagePrice: toNumber(position.averagePrice),
        costBasis: toNumber(position.costBasis),
        marketValue: toNumber(position.marketValue),
        unrealizedGain: toNumber(position.unrealizedGain),
        unrealizedGainPct: toNumber(position.unrealizedGainPct),
        hasQuote: !!position.hasQuote,
        updatedAt: position.updatedAt ?? null
    };
}

export function normalizePositionsResult(result: PositionsResult): PositionsResult {
    const items = (Array.isArray(result?.items) ? result.items : []).map(normalizePosition);
    return {
        items,
        totalCount: toNumber(result?.totalCount, items.length),
        totalCostBasis: toNullableNumber(result?.totalCostBasis),
        totalMarketValue: toNullableNumber(result?.totalMarketValue),
        totalUnrealizedGain: toNullableNumber(result?.totalUnrealizedGain),
        mixedCurrencies: !!result?.mixedCurrencies
    };
}

export function normalizeOperation(operation: InvestmentOperation): InvestmentOperation {
    return {
        ...operation,
        instrument: normalizeInstrument(operation.instrument),
        quantity: toNullableNumber(operation.quantity),
        unitPrice: toNullableNumber(operation.unitPrice),
        totalAmount: toNullableNumber(operation.totalAmount),
        transactionPublicId: emptyToNull(operation.transactionPublicId),
        notes: emptyToNull(operation.notes),
        updatedAt: operation.updatedAt ?? null
    };
}

/** Plus-value latente des totaux en % (`null` si coût nul ou devises mixtes). */
export function totalGainPct(result: Pick<PositionsResult, 'totalCostBasis' | 'totalUnrealizedGain' | 'mixedCurrencies'>): number | null {
    if (result.mixedCurrencies) return null;
    if (result.totalCostBasis == null || result.totalUnrealizedGain == null || result.totalCostBasis <= 0) return null;
    return Number(((result.totalUnrealizedGain / result.totalCostBasis) * 100).toFixed(2));
}
