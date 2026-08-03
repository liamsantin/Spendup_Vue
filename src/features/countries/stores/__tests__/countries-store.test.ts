import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const getAll = vi.fn();

vi.mock('@/features/countries/api', () => ({
    countriesApi: {
        getAll: (...args: unknown[]) => getAll(...args)
    }
}));

import { useCountriesStore } from '@/features/countries/stores/countries-store';

describe('useCountriesStore', () => {
    beforeEach(() => {
        createTestPinia();
        getAll.mockReset();
    });

    it('ne lance qu’un seul GET pour des ensureLoaded concurrents', async () => {
        let resolveRequest!: (value: { items: { id: number; name: string; code: string }[] }) => void;
        getAll.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRequest = resolve;
                })
        );

        const store = useCountriesStore();
        const p1 = store.ensureLoaded();
        const p2 = store.ensureLoaded();

        expect(getAll).toHaveBeenCalledTimes(1);

        resolveRequest({
            items: [
                { id: 1, name: 'France', code: 'FR' },
                { id: 2, name: 'Belgique', code: 'BE' }
            ]
        });

        await Promise.all([p1, p2]);

        expect(store.loaded).toBe(true);
        expect(store.items).toHaveLength(2);
        expect(store.byId(1)?.name).toBe('France');
    });

    it('ne recharge pas si déjà loaded', async () => {
        getAll.mockResolvedValue({ items: [{ id: 1, name: 'France', code: 'FR' }] });
        const store = useCountriesStore();

        await store.ensureLoaded();
        await store.ensureLoaded();

        expect(getAll).toHaveBeenCalledTimes(1);
    });

    it('force=true relance l’API', async () => {
        getAll.mockResolvedValue({ items: [{ id: 1, name: 'France', code: 'FR' }] });
        const store = useCountriesStore();

        await store.ensureLoaded();
        await store.ensureLoaded(true);

        expect(getAll).toHaveBeenCalledTimes(2);
    });
});
