export type InstrumentType = 'action' | 'etf' | 'obligation' | 'fonds' | 'crypto' | 'other';

export type InstrumentCurrency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type OperationType = 'achat' | 'vente' | 'depot' | 'retrait' | 'dividende' | 'frais';

/** Instrument du catalogue personnel (deux utilisateurs peuvent avoir le même symbole). */
export type Instrument = {
    publicId: string;
    /** Toujours en majuscules côté serveur. */
    symbol: string;
    name: string;
    type: InstrumentType;
    currency: InstrumentCurrency;
    isin: string | null;
    /** Cours manuel ; `null` tant qu’aucun cours n’a été saisi. */
    lastPrice: number | null;
    /** Date civile `yyyy-MM-dd` du dernier cours. */
    lastPriceDate: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type InstrumentsListResult = {
    items: Instrument[];
    totalCount: number;
    page: number;
    pageSize: number;
};

export type ListInstrumentsQuery = {
    search?: string;
    type?: InstrumentType;
    page?: number;
    pageSize?: number;
};

export type CreateInstrumentPayload = {
    symbol: string;
    name: string;
    type: InstrumentType;
    currency: InstrumentCurrency;
    isin?: string | null;
    lastPrice?: number | null;
    lastPriceDate?: string | null;
};

/** PUT état complet — `symbol`, `type`, `currency` figés dès qu’une opération existe (400 serveur). */
export type UpdateInstrumentPayload = {
    symbol: string;
    name: string;
    type: InstrumentType;
    currency: InstrumentCurrency;
    isin: string | null;
};

export type SetInstrumentPricePayload = {
    price: number;
    /** Date civile ≤ aujourd’hui ; omise = aujourd’hui (fuseau settings). */
    date?: string | null;
};

/** Position sur un compte de placement, rejouée depuis les opérations. */
export type Position = {
    instrument: Instrument;
    quantity: number;
    /** Prix de revient unitaire (coût / quantité après achats et dépôts). */
    averagePrice: number;
    costBasis: number;
    /** quantité × (`lastPrice` ?? PRU). */
    marketValue: number;
    unrealizedGain: number;
    unrealizedGainPct: number;
    /** `false` = pas de cours saisi, valeur au coût. */
    hasQuote: boolean;
    updatedAt: string | null;
};

export type PositionsResult = {
    items: Position[];
    totalCount: number;
    /** `null` quand les positions ne partagent pas une seule devise. */
    totalCostBasis: number | null;
    totalMarketValue: number | null;
    totalUnrealizedGain: number | null;
    mixedCurrencies: boolean;
};

export type InvestmentOperation = {
    publicId: string;
    accountPublicId: string;
    instrument: Instrument;
    type: OperationType;
    /** Date civile `yyyy-MM-dd`. */
    operationDate: string;
    quantity: number | null;
    unitPrice: number | null;
    totalAmount: number | null;
    /** Devise de l’instrument. */
    currency: InstrumentCurrency;
    /** Jambe cash (transaction possédée sur ce compte) ; `null` si non liée. */
    transactionPublicId: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
};

export type OperationsListResult = {
    items: InvestmentOperation[];
    totalCount: number;
    page: number;
    pageSize: number;
};

export type ListOperationsQuery = {
    instrumentPublicId?: string;
    type?: OperationType;
    /** Date civile `yyyy-MM-dd` incluse. */
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

/** POST / PUT opération (état complet). */
export type SaveOperationPayload = {
    instrumentPublicId: string;
    type: OperationType;
    operationDate: string;
    quantity: number | null;
    unitPrice: number | null;
    totalAmount: number | null;
    transactionPublicId: string | null;
    notes: string | null;
};

export const INSTRUMENT_TYPES: InstrumentType[] = ['action', 'etf', 'obligation', 'fonds', 'crypto', 'other'];

export const INSTRUMENT_CURRENCIES: InstrumentCurrency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const OPERATION_TYPES: OperationType[] = ['achat', 'vente', 'depot', 'retrait', 'dividende', 'frais'];

export const INSTRUMENT_PAGE_SIZE_DEFAULT = 50;
export const INSTRUMENT_PAGE_SIZE_MAX = 200;
export const INSTRUMENT_PICKER_PAGE_SIZE = 50;
export const INSTRUMENT_SEARCH_MAX = 100;
export const INSTRUMENT_SYMBOL_MAX = 20;
export const INSTRUMENT_NAME_MAX = 150;
export const INSTRUMENT_ISIN_LENGTH = 12;

export const OPERATION_PAGE_SIZE_DEFAULT = 50;
export const OPERATION_PAGE_SIZE_MAX = 200;
export const OPERATION_NOTES_MAX = 500;
/** Quantités de titres : 8 décimales (API). */
export const OPERATION_QUANTITY_DECIMALS = 8;

export const INSTRUMENT_NOT_FOUND_MESSAGE = 'Instrument introuvable.';
export const OPERATION_NOT_FOUND_MESSAGE = 'Opération introuvable.';
export const INVESTMENT_ACCOUNT_NOT_FOUND_MESSAGE = 'Compte de placement introuvable.';
