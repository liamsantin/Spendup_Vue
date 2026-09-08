import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    TIER_NATURES,
    TIER_PAGE_SIZE_DEFAULT,
    TIER_PAGE_SIZE_MAX,
    TIER_ROLES,
    TIER_SEARCH_MAX,
    type CreateTierPayload,
    type ListTiersQuery,
    type Tier,
    type TierList,
    type UpdateTierPayload
} from '@/features/tiers/types';

function clampPageSize(pageSize: number | undefined): number {
    const raw = pageSize ?? TIER_PAGE_SIZE_DEFAULT;
    if (!Number.isFinite(raw)) return TIER_PAGE_SIZE_DEFAULT;
    return Math.min(TIER_PAGE_SIZE_MAX, Math.max(1, Math.trunc(raw)));
}

export const tiersApi = {
    list(query: ListTiersQuery = {}) {
        const page = Math.max(1, Math.trunc(query.page ?? 1));
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(clampPageSize(query.pageSize))
        });
        if (query.nature && TIER_NATURES.includes(query.nature)) params.set('nature', query.nature);
        if (query.role && TIER_ROLES.includes(query.role)) params.set('role', query.role);
        const search = query.search?.trim().slice(0, TIER_SEARCH_MAX);
        if (search) params.set('search', search);
        return fetchWrapper.get(`/api/tiers?${params}`) as Promise<TierList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/tiers/${encodeURIComponent(publicId)}`) as Promise<Tier>;
    },

    create(body: CreateTierPayload) {
        return fetchWrapper.post('/api/tiers', body) as Promise<Tier>;
    },

    update(publicId: string, body: UpdateTierPayload) {
        return fetchWrapper.put(`/api/tiers/${encodeURIComponent(publicId)}`, body) as Promise<Tier>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/tiers/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
