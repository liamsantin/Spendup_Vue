import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    CATEGORY_TYPES,
    type Category,
    type CategoryList,
    type CreateCategoryPayload,
    type ListCategoriesQuery,
    type UpdateCategoryPayload
} from '@/features/categories/types';

export const taxNaturesApi = {
    /** Nature suggérée pour un nom de catégorie à créer (mots-clés côté API) ; jamais posée sans geste. */
    suggest(categoryName: string, type: string) {
        const params = new URLSearchParams({ categoryName, type });
        return fetchWrapper.get(`/api/tax-natures/suggest?${params}`) as Promise<{ taxNature: string | null }>;
    },
    /** Nature suggérée d'après le tiers d'une transaction : « don » pour un organisme éligible, sinon la nature la plus confirmée sur ce tiers. */
    suggestForTier(tierPublicId: string, type: string) {
        const params = new URLSearchParams({ tierPublicId, type });
        return fetchWrapper.get(`/api/tax-natures/suggest-for-tier?${params}`) as Promise<{
            taxNature: string | null;
            source: 'eligible' | 'history' | null;
        }>;
    }
};

export const categoriesApi = {
    list(query: ListCategoriesQuery = {}) {
        const type = query.type;
        if (type && CATEGORY_TYPES.includes(type)) {
            const params = new URLSearchParams({ type });
            return fetchWrapper.get(`/api/categories?${params}`) as Promise<CategoryList>;
        }
        return fetchWrapper.get('/api/categories') as Promise<CategoryList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/categories/${encodeURIComponent(publicId)}`) as Promise<Category>;
    },

    create(body: CreateCategoryPayload) {
        return fetchWrapper.post('/api/categories', body) as Promise<Category>;
    },

    update(publicId: string, body: UpdateCategoryPayload) {
        return fetchWrapper.put(`/api/categories/${encodeURIComponent(publicId)}`, body) as Promise<Category>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/categories/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
