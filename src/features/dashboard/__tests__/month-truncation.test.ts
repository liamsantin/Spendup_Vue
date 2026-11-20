import { describe, expect, it, vi } from 'vitest';
import { loadAllTransactions } from '@/features/dashboard/composables/useDashboardMonth';
import type { Transaction } from '@/features/transactions/types';

const range = { from: '2026-11-01', to: '2026-11-30' };

function page(count: number, totalCount: number) {
    return { items: Array.from({ length: count }, (_, i) => ({ publicId: `T${i}` }) as Transaction), totalCount };
}

describe('tableau de bord · chargement du mois (R8)', () => {
    it('tout est chargé : pas de troncature', async () => {
        const list = vi.fn().mockResolvedValueOnce(page(200, 250)).mockResolvedValueOnce(page(50, 250));
        const result = await loadAllTransactions(range, list as never, 10);
        expect(result.items).toHaveLength(250);
        expect(result.truncated).toBe(false);
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('le garde-fou coupe : la troncature est signalée au lieu d’être silencieuse', async () => {
        const list = vi.fn().mockResolvedValue(page(200, 900));
        const result = await loadAllTransactions(range, list as never, 2);
        expect(result.items).toHaveLength(400);
        expect(result.truncated).toBe(true);
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('une page vide arrête le chargement sans troncature', async () => {
        const list = vi.fn().mockResolvedValueOnce(page(0, 0));
        expect(await loadAllTransactions(range, list as never, 10)).toEqual({ items: [], truncated: false });
    });
});
