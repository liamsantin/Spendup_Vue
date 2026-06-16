import { defineStore } from 'pinia';

import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;

export const useUserStore = defineStore('user', {
    state: () => ({
        users: {} as Record<string, unknown>
    }),
    actions: {
        async getAll() {
            this.users = { loading: true };
            fetchWrapper
                .get(baseUrl)
                .then((users) => (this.users = users))
                .catch((error) => (this.users = { error }));
        }
    }
});
