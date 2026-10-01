import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    BANK_PAGE_SIZE_DEFAULT,
    BANK_PAGE_SIZE_MAX,
    BANK_SEARCH_MAX,
    type Bank,
    type BankList,
    type BankResolveResult,
    type ListBanksQuery
} from '@/features/banks/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? BANK_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return BANK_PAGE_SIZE_DEFAULT;
    return Math.min(BANK_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

/** Référentiel bancaire SIX, lecture seule. */
export const banksApi = {
    list(query: ListBanksQuery = {}) {
        const params = new URLSearchParams({
            page: String(Math.max(1, Math.trunc(query.page ?? 1))),
            pageSize: String(clampPageSize(query.pageSize))
        });
        const q = query.q?.trim().slice(0, BANK_SEARCH_MAX);
        if (q) params.set('q', q);
        const country = query.country?.trim().toUpperCase();
        if (country && /^[A-Z]{2}$/.test(country)) params.set('country', country);
        return fetchWrapper.get(`/api/banks?${params}`) as Promise<BankList>;
    },

    /** `400` : IBAN invalide ou étranger. `404` : IBAN suisse, IID inconnu. */
    resolve(iban: string) {
        const params = new URLSearchParams({ iban });
        return fetchWrapper.get(`/api/banks/resolve?${params}`) as Promise<BankResolveResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/banks/${encodeURIComponent(publicId)}`) as Promise<Bank>;
    }
};
