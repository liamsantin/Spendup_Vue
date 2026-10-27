import { parseAccountAmount } from '@/features/accounts/format';
import {
    emptyToNull,
    isInstrumentCurrency,
    isInstrumentType,
    isOperationType,
    isValidIsin,
    isValidYmd,
    normalizeIsin,
    normalizeSymbol,
    operationAllowsTransaction,
    operationNeedsQuantity,
    operationNeedsTotal,
    parsePrice,
    parseQuantity
} from '@/features/investments/format';
import {
    INSTRUMENT_NAME_MAX,
    INSTRUMENT_SYMBOL_MAX,
    OPERATION_NOTES_MAX,
    type CreateInstrumentPayload,
    type Instrument,
    type InstrumentCurrency,
    type InstrumentType,
    type InvestmentOperation,
    type OperationType,
    type SaveOperationPayload,
    type SetInstrumentPricePayload,
    type UpdateInstrumentPayload
} from '@/features/investments/types';

export type InvestmentPayloadErrorCode =
    | 'symbolRequired'
    | 'symbolTooLong'
    | 'nameRequired'
    | 'nameTooLong'
    | 'typeInvalid'
    | 'currencyInvalid'
    | 'isinInvalid'
    | 'priceInvalid'
    | 'priceNegative'
    | 'priceDateInvalid'
    | 'priceDateFuture'
    | 'priceRequired'
    | 'instrumentRequired'
    | 'operationTypeInvalid'
    | 'operationDateInvalid'
    | 'operationDateFuture'
    | 'quantityInvalid'
    | 'quantityNotPositive'
    | 'unitPriceInvalid'
    | 'unitPriceNegative'
    | 'totalAmountInvalid'
    | 'totalAmountNotPositive'
    | 'transactionNotAllowed'
    | 'notesTooLong';

export type BuildInvestmentPayloadOk<T> = { ok: true; payload: T };
export type BuildInvestmentPayloadFail = { ok: false; code: InvestmentPayloadErrorCode; field?: string };
export type BuildInvestmentPayloadResult<T> = BuildInvestmentPayloadOk<T> | BuildInvestmentPayloadFail;

function fail(code: InvestmentPayloadErrorCode, field?: string): BuildInvestmentPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

/** Contexte commun : « aujourd’hui » dans le fuseau des settings (dates futures refusées). */
export type InvestmentPayloadContext = {
    today?: string | null;
};

function isFuture(ymd: string, today: string | null | undefined): boolean {
    return !!today && isValidYmd(today) && ymd > today;
}

/* ───────────────────────── Instrument ───────────────────────── */

export type InstrumentFormFields = {
    symbol: string;
    name: string;
    type: InstrumentType | '';
    currency: InstrumentCurrency | '';
    isin: string;
    /** Cours initial (création seulement). */
    lastPrice: string;
    lastPriceDate: string | null;
};

export function emptyInstrumentFormFields(
    defaults: { currency?: InstrumentCurrency | ''; type?: InstrumentType | '' } = {}
): InstrumentFormFields {
    return {
        symbol: '',
        name: '',
        type: defaults.type ?? '',
        currency: defaults.currency ?? '',
        isin: '',
        lastPrice: '',
        lastPriceDate: null
    };
}

export function instrumentToFormFields(instrument: Instrument): InstrumentFormFields {
    return {
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        currency: instrument.currency,
        isin: instrument.isin ?? '',
        lastPrice: instrument.lastPrice != null ? String(instrument.lastPrice) : '',
        lastPriceDate: instrument.lastPriceDate
    };
}

type InstrumentCommon =
    | BuildInvestmentPayloadFail
    | { ok: true; symbol: string; name: string; type: InstrumentType; currency: InstrumentCurrency; isin: string | null };

function instrumentCommon(fields: InstrumentFormFields): InstrumentCommon {
    const symbol = normalizeSymbol(fields.symbol);
    if (!symbol) return fail('symbolRequired', 'symbol');
    if (symbol.length > INSTRUMENT_SYMBOL_MAX) return fail('symbolTooLong', 'symbol');

    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > INSTRUMENT_NAME_MAX) return fail('nameTooLong', 'name');

    if (!isInstrumentType(fields.type)) return fail('typeInvalid', 'type');
    if (!isInstrumentCurrency(fields.currency)) return fail('currencyInvalid', 'currency');

    const isinRaw = normalizeIsin(fields.isin);
    const isin = isinRaw ? isinRaw : null;
    if (isin && !isValidIsin(isin)) return fail('isinInvalid', 'isin');

    return { ok: true, symbol, name, type: fields.type, currency: fields.currency, isin };
}

export function buildCreateInstrumentPayload(
    fields: InstrumentFormFields,
    context: InvestmentPayloadContext = {}
): BuildInvestmentPayloadResult<CreateInstrumentPayload> {
    const common = instrumentCommon(fields);
    if (!common.ok) return common;

    let lastPrice: number | null = null;
    let lastPriceDate: string | null = null;
    const priceRaw = fields.lastPrice.trim();
    if (priceRaw) {
        const parsed = parsePrice(priceRaw);
        if (parsed == null) return fail('priceInvalid', 'lastPrice');
        if (parsed < 0) return fail('priceNegative', 'lastPrice');
        lastPrice = parsed;
        lastPriceDate = emptyToNull(fields.lastPriceDate);
        if (lastPriceDate) {
            if (!isValidYmd(lastPriceDate)) return fail('priceDateInvalid', 'lastPriceDate');
            if (isFuture(lastPriceDate, context.today)) return fail('priceDateFuture', 'lastPriceDate');
        }
    }

    return {
        ok: true,
        payload: {
            symbol: common.symbol,
            name: common.name,
            type: common.type,
            currency: common.currency,
            isin: common.isin,
            lastPrice,
            lastPriceDate
        }
    };
}

/**
 * PUT état complet. `symbol` / `type` / `currency` sont figés par le serveur dès qu’une opération existe :
 * le client ne connaît pas `hasOperations`, le 400 de l’API est affiché tel quel.
 */
export function buildUpdateInstrumentPayload(fields: InstrumentFormFields): BuildInvestmentPayloadResult<UpdateInstrumentPayload> {
    const common = instrumentCommon(fields);
    if (!common.ok) return common;
    return {
        ok: true,
        payload: {
            symbol: common.symbol,
            name: common.name,
            type: common.type,
            currency: common.currency,
            isin: common.isin
        }
    };
}

export function isInstrumentFormDirty(instrument: Instrument, fields: InstrumentFormFields): boolean {
    if (normalizeSymbol(fields.symbol) !== instrument.symbol) return true;
    if (fields.name.trim() !== instrument.name.trim()) return true;
    if (fields.type !== instrument.type) return true;
    if (fields.currency !== instrument.currency) return true;
    if ((normalizeIsin(fields.isin) || null) !== (instrument.isin ?? null)) return true;
    return false;
}

/* ───────────────────────── Cours ───────────────────────── */

export type PriceFormFields = {
    price: string;
    /** `null` = aujourd’hui (défaut serveur). */
    date: string | null;
};

export function emptyPriceFormFields(defaults: { price?: string; date?: string | null } = {}): PriceFormFields {
    return { price: defaults.price ?? '', date: defaults.date ?? null };
}

export function buildSetPricePayload(
    fields: PriceFormFields,
    context: InvestmentPayloadContext = {}
): BuildInvestmentPayloadResult<SetInstrumentPricePayload> {
    const raw = fields.price.trim();
    if (!raw) return fail('priceRequired', 'price');
    const price = parsePrice(raw);
    if (price == null) return fail('priceInvalid', 'price');
    if (price < 0) return fail('priceNegative', 'price');

    const date = emptyToNull(fields.date);
    if (date) {
        if (!isValidYmd(date)) return fail('priceDateInvalid', 'date');
        if (isFuture(date, context.today)) return fail('priceDateFuture', 'date');
    }
    return { ok: true, payload: { price, date } };
}

/* ───────────────────────── Opération ───────────────────────── */

export type OperationFormFields = {
    instrumentPublicId: string;
    type: OperationType | '';
    operationDate: string | null;
    quantity: string;
    unitPrice: string;
    /** Vide = quantité × prix (serveur). */
    totalAmount: string;
    /** Jambe cash — toujours `''` pour l’instant (pas de sélecteur de transaction). */
    transactionPublicId: string;
    notes: string;
};

export function emptyOperationFormFields(
    defaults: { instrumentPublicId?: string; type?: OperationType | ''; operationDate?: string | null } = {}
): OperationFormFields {
    return {
        instrumentPublicId: defaults.instrumentPublicId ?? '',
        type: defaults.type ?? 'achat',
        operationDate: defaults.operationDate ?? null,
        quantity: '',
        unitPrice: '',
        totalAmount: '',
        transactionPublicId: '',
        notes: ''
    };
}

export function operationToFormFields(operation: InvestmentOperation): OperationFormFields {
    return {
        instrumentPublicId: operation.instrument.publicId,
        type: operation.type,
        operationDate: operation.operationDate,
        quantity: operation.quantity != null ? String(operation.quantity) : '',
        unitPrice: operation.unitPrice != null ? String(operation.unitPrice) : '',
        totalAmount: operation.totalAmount != null ? String(operation.totalAmount) : '',
        transactionPublicId: operation.transactionPublicId ?? '',
        notes: operation.notes ?? ''
    };
}

/**
 * Règles par type : achat / vente / depot / retrait → quantité > 0 et prix ≥ 0 (total facultatif) ;
 * dividende / frais → total > 0 seul. Date valide, non future. `totalAmount` `null` si vide.
 */
export function buildSaveOperationPayload(
    fields: OperationFormFields,
    context: InvestmentPayloadContext = {}
): BuildInvestmentPayloadResult<SaveOperationPayload> {
    const instrumentPublicId = emptyToNull(fields.instrumentPublicId);
    if (!instrumentPublicId) return fail('instrumentRequired', 'instrumentPublicId');

    if (!isOperationType(fields.type)) return fail('operationTypeInvalid', 'type');
    const type = fields.type;

    const operationDate = emptyToNull(fields.operationDate);
    if (!operationDate || !isValidYmd(operationDate)) return fail('operationDateInvalid', 'operationDate');
    if (isFuture(operationDate, context.today)) return fail('operationDateFuture', 'operationDate');

    let quantity: number | null = null;
    let unitPrice: number | null = null;
    let totalAmount: number | null = null;

    const totalRaw = fields.totalAmount.trim();
    if (totalRaw) {
        const parsed = parseAccountAmount(totalRaw);
        if (parsed == null) return fail('totalAmountInvalid', 'totalAmount');
        totalAmount = parsed;
    }

    if (operationNeedsQuantity(type)) {
        const q = parseQuantity(fields.quantity.trim());
        if (q == null) return fail('quantityInvalid', 'quantity');
        if (q <= 0) return fail('quantityNotPositive', 'quantity');
        quantity = q;

        const p = parsePrice(fields.unitPrice.trim());
        if (p == null) return fail('unitPriceInvalid', 'unitPrice');
        if (p < 0) return fail('unitPriceNegative', 'unitPrice');
        unitPrice = p;

        if (totalAmount != null && totalAmount < 0) return fail('totalAmountNotPositive', 'totalAmount');
    } else if (operationNeedsTotal(type)) {
        if (totalAmount == null) return fail('totalAmountInvalid', 'totalAmount');
        if (totalAmount <= 0) return fail('totalAmountNotPositive', 'totalAmount');
    }

    const transactionPublicId = emptyToNull(fields.transactionPublicId);
    if (transactionPublicId && !operationAllowsTransaction(type)) return fail('transactionNotAllowed', 'transactionPublicId');

    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > OPERATION_NOTES_MAX) return fail('notesTooLong', 'notes');

    return {
        ok: true,
        payload: {
            instrumentPublicId,
            type,
            operationDate,
            quantity,
            unitPrice,
            totalAmount,
            transactionPublicId,
            notes
        }
    };
}

export function isOperationFormDirty(operation: InvestmentOperation, fields: OperationFormFields): boolean {
    const original = operationToFormFields(operation);
    if (fields.instrumentPublicId !== original.instrumentPublicId) return true;
    if (fields.type !== original.type) return true;
    if (emptyToNull(fields.operationDate) !== emptyToNull(original.operationDate)) return true;
    if (parseQuantity(fields.quantity.trim()) !== parseQuantity(original.quantity)) return true;
    if (parsePrice(fields.unitPrice.trim()) !== parsePrice(original.unitPrice)) return true;
    if (parseAccountAmount(fields.totalAmount.trim()) !== parseAccountAmount(original.totalAmount)) return true;
    if (emptyToNull(fields.transactionPublicId) !== emptyToNull(original.transactionPublicId)) return true;
    if (emptyToNull(fields.notes) !== emptyToNull(original.notes)) return true;
    return false;
}

/** Total suggéré = quantité × prix (2 décimales), `''` si l’un des deux manque. */
export function suggestedOperationTotal(fields: Pick<OperationFormFields, 'quantity' | 'unitPrice'>): string {
    const q = parseQuantity(fields.quantity.trim());
    const p = parsePrice(fields.unitPrice.trim());
    if (q == null || p == null) return '';
    return (q * p).toFixed(2);
}
