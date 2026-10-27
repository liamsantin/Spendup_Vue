import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    INSTRUMENT_PAGE_SIZE_MAX,
    INSTRUMENT_TYPES,
    OPERATION_PAGE_SIZE_MAX,
    OPERATION_TYPES,
    type CreateInstrumentPayload,
    type Instrument,
    type InstrumentsListResult,
    type InvestmentOperation,
    type ListInstrumentsQuery,
    type ListOperationsQuery,
    type OperationsListResult,
    type PositionsResult,
    type SaveOperationPayload,
    type SetInstrumentPricePayload,
    type UpdateInstrumentPayload
} from '@/features/investments/types';

function pageParam(params: URLSearchParams, name: string, value: number | undefined, max: number) {
    if (value == null || !Number.isFinite(value)) return;
    const n = Math.floor(value);
    if (n < 1) return;
    params.set(name, String(Math.min(n, max)));
}

function instrumentsQueryString(query: ListInstrumentsQuery = {}): string {
    const params = new URLSearchParams();
    const search = query.search?.trim();
    if (search) params.set('search', search);
    if (query.type && INSTRUMENT_TYPES.includes(query.type)) params.set('type', query.type);
    pageParam(params, 'page', query.page, Number.MAX_SAFE_INTEGER);
    pageParam(params, 'pageSize', query.pageSize, INSTRUMENT_PAGE_SIZE_MAX);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function operationsQueryString(query: ListOperationsQuery = {}): string {
    const params = new URLSearchParams();
    const instrument = query.instrumentPublicId?.trim();
    if (instrument) params.set('instrumentPublicId', instrument);
    if (query.type && OPERATION_TYPES.includes(query.type)) params.set('type', query.type);
    const from = query.from?.trim();
    if (from) params.set('from', from);
    const to = query.to?.trim();
    if (to) params.set('to', to);
    pageParam(params, 'page', query.page, Number.MAX_SAFE_INTEGER);
    pageParam(params, 'pageSize', query.pageSize, OPERATION_PAGE_SIZE_MAX);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function accountBase(accountPublicId: string): string {
    return `/api/accounts/${encodeURIComponent(accountPublicId)}`;
}

/** Catalogue d’instruments personnel — `/api/instruments`. */
export const instrumentsApi = {
    list(query: ListInstrumentsQuery = {}) {
        return fetchWrapper.get(`/api/instruments${instrumentsQueryString(query)}`) as Promise<InstrumentsListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/instruments/${encodeURIComponent(publicId)}`) as Promise<Instrument>;
    },

    create(body: CreateInstrumentPayload) {
        return fetchWrapper.post('/api/instruments', body) as Promise<Instrument>;
    },

    update(publicId: string, body: UpdateInstrumentPayload) {
        return fetchWrapper.put(`/api/instruments/${encodeURIComponent(publicId)}`, body) as Promise<Instrument>;
    },

    setPrice(publicId: string, body: SetInstrumentPricePayload) {
        return fetchWrapper.post(`/api/instruments/${encodeURIComponent(publicId)}/price`, body) as Promise<Instrument>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/instruments/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};

/** Positions et opérations d’un compte `investissement` / `crypto`. */
export const investmentsApi = {
    positions(accountPublicId: string, options: { includeClosed?: boolean } = {}) {
        const qs = options.includeClosed ? '?includeClosed=true' : '';
        return fetchWrapper.get(`${accountBase(accountPublicId)}/positions${qs}`) as Promise<PositionsResult>;
    },

    listOperations(accountPublicId: string, query: ListOperationsQuery = {}) {
        return fetchWrapper.get(
            `${accountBase(accountPublicId)}/operations${operationsQueryString(query)}`
        ) as Promise<OperationsListResult>;
    },

    getOperation(accountPublicId: string, operationPublicId: string) {
        return fetchWrapper.get(
            `${accountBase(accountPublicId)}/operations/${encodeURIComponent(operationPublicId)}`
        ) as Promise<InvestmentOperation>;
    },

    createOperation(accountPublicId: string, body: SaveOperationPayload) {
        return fetchWrapper.post(`${accountBase(accountPublicId)}/operations`, body) as Promise<InvestmentOperation>;
    },

    updateOperation(accountPublicId: string, operationPublicId: string, body: SaveOperationPayload) {
        return fetchWrapper.put(
            `${accountBase(accountPublicId)}/operations/${encodeURIComponent(operationPublicId)}`,
            body
        ) as Promise<InvestmentOperation>;
    },

    removeOperation(accountPublicId: string, operationPublicId: string) {
        return fetchWrapper.delete(`${accountBase(accountPublicId)}/operations/${encodeURIComponent(operationPublicId)}`) as Promise<void>;
    }
};
