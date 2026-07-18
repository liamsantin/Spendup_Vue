import { defineStore } from 'pinia';
import { router } from '@/router';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;

/** Utilisateur de test (en attendant JWT) */
export const TEST_USER = {
    id: 1,
    username: 'demo@spendup.local',
    firstName: 'Utilisateur',
    lastName: 'Test',
    token: 'fake-jwt-token'
};

export const APP_HOME_ROUTE = '/app';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user') ?? 'null') as typeof TEST_USER | null,
        returnUrl: null as string | null
    }),
    getters: {
        isAuthenticated: (state) => !!state.user
    },
    actions: {
        /** Connexion immédiate pour les tests (un clic, sans formulaire). */
        loginAsTestUser() {
            this.user = { ...TEST_USER };
            localStorage.setItem('user', JSON.stringify(this.user));
            const target = this.returnUrl || APP_HOME_ROUTE;
            this.returnUrl = null;
            router.push(target);
        },

        /** Connexion via fake-backend (JWT simulé) — pour plus tard. */
        async login(username: string, password: string) {
            const user = await fetchWrapper.post(`${baseUrl}/authenticate`, { username, password });

            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
            const target = this.returnUrl || APP_HOME_ROUTE;
            this.returnUrl = null;
            router.push(target);
        },

        logout() {
            this.user = null;
            this.returnUrl = null;
            localStorage.removeItem('user');
            router.push('/');
        }
    }
});
