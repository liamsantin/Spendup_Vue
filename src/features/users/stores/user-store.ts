import { defineStore } from 'pinia';

import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/users`;

export const useUserStore = defineStore('user', {
    state: () => ({
        users: {} as Record<string, unknown>
    }),
    actions: {
        async getAll() {
            this.users = { loading: true };
            fetchWrapper
                .get(baseUrl)
                .then((users) => (this.users = users as Record<string, unknown>))
                .catch((error) => (this.users = { error }));
        }
    }
});
