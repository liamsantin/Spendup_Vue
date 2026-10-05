import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { CreateTagPayload, Tag, TagList, UpdateTagPayload } from '@/features/tags/types';

export const tagsApi = {
    list() {
        return fetchWrapper.get('/api/tags') as Promise<TagList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/tags/${encodeURIComponent(publicId)}`) as Promise<Tag>;
    },

    create(body: CreateTagPayload) {
        return fetchWrapper.post('/api/tags', body) as Promise<Tag>;
    },

    update(publicId: string, body: UpdateTagPayload) {
        return fetchWrapper.put(`/api/tags/${encodeURIComponent(publicId)}`, body) as Promise<Tag>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/tags/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
