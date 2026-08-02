import { defineStore } from 'pinia';
import { countriesApi } from '../api';
import type { Country } from '../types';

export const useCountriesStore = defineStore('countries', {
    state: () => ({
        items: [] as Country[],
        loading: false,
        loaded: false,
        error: null as string | null
    }),

    getters: {
        byId: (state) => (id: number | null | undefined) => {
            if (id == null) return undefined;
            return state.items.find((c) => c.id === id);
        }
    },

    actions: {
        /** Charge la liste une fois (cache mémoire). `force` pour recharger. */
        async ensureLoaded(force = false) {
            if (this.loading) return;
            if (this.loaded && !force) return;

            this.loading = true;
            this.error = null;
            try {
                const result = await countriesApi.getAll();
                this.items = Array.isArray(result?.items) ? result.items : [];
                this.loaded = true;
            } catch (e: unknown) {
                this.error = e instanceof Error ? e.message : String(e);
                throw e;
            } finally {
                this.loading = false;
            }
        },

        async refresh() {
            await this.ensureLoaded(true);
        }
    }
});
