import { beforeEach, describe, expect, it, vi } from 'vitest';

const list = vi.fn();
vi.mock('@/features/banks/api', () => ({ banksApi: { list: (...args: unknown[]) => list(...args) } }));

import { BANK_REGISTRY_CACHE_TTL_MS, clearRegistryBanksCache, listRegistryBanks } from '@/features/banks/registry-cache';

const UBS = { publicId: 'bank-00230', name: 'UBS' };

describe('listRegistryBanks', () => {
    beforeEach(() => {
        clearRegistryBanksCache();
        list.mockReset();
    });

    it('ne rappelle pas l’API pour une requête déjà faite (réouverture du sélecteur)', async () => {
        list.mockResolvedValue({ items: [UBS], page: 1, pageSize: 30, totalCount: 1 });
        const query = { country: 'CH', pageSize: 30 };

        expect(await listRegistryBanks(query)).toEqual([UBS]);
        expect(await listRegistryBanks({ ...query })).toEqual([UBS]);
        expect(list).toHaveBeenCalledTimes(1);

        await listRegistryBanks({ ...query, q: 'ubs' });
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('partage une requête en vol', async () => {
        list.mockResolvedValue({ items: [UBS] });
        await Promise.all([listRegistryBanks({ q: 'u' }), listRegistryBanks({ q: 'u' })]);
        expect(list).toHaveBeenCalledTimes(1);
    });

    it('ne garde pas un échec et expire après le TTL', async () => {
        list.mockRejectedValueOnce(new Error('réseau')).mockResolvedValue({ items: [UBS] });
        await expect(listRegistryBanks({ q: 'x' }, 0)).rejects.toThrow('réseau');
        expect(await listRegistryBanks({ q: 'x' }, 1)).toEqual([UBS]);
        expect(list).toHaveBeenCalledTimes(2);

        await listRegistryBanks({ q: 'x' }, BANK_REGISTRY_CACHE_TTL_MS + 2);
        expect(list).toHaveBeenCalledTimes(3);
    });
});
