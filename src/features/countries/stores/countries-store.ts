import { defineStore } from 'pinia';
import { ref } from 'vue';
import { countriesApi } from '@/features/countries/api';
import type { Country } from '@/features/countries/types';

export const useCountriesStore = defineStore('countries', () => {
    const items = ref<Country[]>([]);
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);

    /** Promise partagée pour les appels concurrents à ensureLoaded. */
    let loadPromise: Promise<void> | null = null;

    function byId(id: number | null | undefined): Country | undefined {
        if (id == null) return undefined;
        return items.value.find((c) => c.id === id);
    }

    /** Charge la liste une fois (cache mémoire). `force` pour recharger. */
    async function ensureLoaded(force = false) {
        if (loaded.value && !force) return;
        if (loadPromise && !force) return loadPromise;

        loadPromise = (async () => {
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
                loadPromise = null;
            }
        })();

        return loadPromise;
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
