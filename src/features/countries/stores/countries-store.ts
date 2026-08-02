import { defineStore } from 'pinia';
import { ref } from 'vue';
import { countriesApi } from '../api';
import type { Country } from '../types';

export const useCountriesStore = defineStore('countries', () => {
    const items = ref<Country[]>([]);
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);

    function byId(id: number | null | undefined): Country | undefined {
        if (id == null) return undefined;
        return items.value.find((c) => c.id === id);
    }

    /** Charge la liste une fois (cache mémoire). `force` pour recharger. */
    async function ensureLoaded(force = false) {
        if (loading.value) return;
        if (loaded.value && !force) return;

        loading.value = true;
        error.value = null;
        try {
            const result = await countriesApi.getAll();
            items.value = Array.isArray(result?.items) ? result.items : [];
            loaded.value = true;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function refresh() {
        await ensureLoaded(true);
    }

    return {
        items,
        loading,
        loaded,
        error,
        byId,
        ensureLoaded,
        refresh
    };
});
