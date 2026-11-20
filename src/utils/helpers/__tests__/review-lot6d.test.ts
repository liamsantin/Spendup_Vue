import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextPageFromLoaded } from '@/utils/helpers/paging';
import { nextPageFromLoaded as nextFilesPage } from '@/features/files/stores/internal/files-state';
import { parsePrice, parseQuantity, stripThousandSeparators } from '@/features/investments/format';
import { formatTimestampDay } from '@/features/shared-debts/format';
import { handleDemoRequest } from '@/features/demo/handle';
import { localYmd, periodBounds, resetDemoDb } from '@/features/demo/db';
import { useStepUpStore } from '@/features/auth/stores/step-up-store';
import { DOWNLOAD_URL_REVOKE_DELAY_MS, downloadFileBlob } from '@/features/files/composables/useFileContentUrl';

vi.mock('@/features/files/content', () => ({
    loadReadablePdf: vi.fn(async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
}));

describe('lot 6d · page suivante après une suppression locale (V2.7, V3.8, R13)', () => {
    it('recharge la page qui contient le premier élément manquant', () => {
        // 50 chargés : page 2. Un supprimé (49) : on redemande la page 1, l’ancien 51e y est remonté.
        expect(nextPageFromLoaded(50, 50)).toBe(2);
        expect(nextPageFromLoaded(49, 50)).toBe(1);
        expect(nextPageFromLoaded(100, 50)).toBe(3);
        expect(nextPageFromLoaded(0, 50)).toBe(1);
    });

    it('taille de page absente : taille de repli, jamais de division par zéro', () => {
        expect(nextPageFromLoaded(25, 0, 25)).toBe(2);
        expect(nextPageFromLoaded(-3, 0, 0)).toBe(1);
        expect(nextFilesPage(49, 50)).toBe(1);
    });
});

describe('lot 6d · apostrophe suisse dans les placements (V5.9)', () => {
    it('lit les montants avec séparateurs de milliers', () => {
        expect(parsePrice("1'250.50")).toBe(1250.5);
        expect(parsePrice('1’250,50')).toBe(1250.5);
        expect(parsePrice('1 250.50')).toBe(1250.5);
        expect(parseQuantity("12'000")).toBe(12000);
        expect(stripThousandSeparators(" 1'000 000 ")).toBe('1000000');
    });

    it('refuse toujours ce qui n’est pas un nombre', () => {
        expect(parsePrice('abc')).toBeNull();
        expect(parsePrice('1.2.3')).toBeNull();
        expect(parsePrice('-5')).toBeNull();
        expect(parsePrice("'")).toBeNull();
    });
});

describe('lot 6d · date de création d’une dette (V4.6)', () => {
    it('un horodatage est lu dans le fuseau de l’appareil, comme la fiche détail', () => {
        const iso = '2026-03-11T23:30:00Z';
        const expected = new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(iso));
        expect(formatTimestampDay(iso, 'fr-CH')).toBe(expected);
    });

    it('une date seule reste ce jour-là, une valeur vide donne une chaîne vide', () => {
        const expected = new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(2026, 2, 12, 12));
        expect(formatTimestampDay('2026-03-12', 'fr-CH')).toBe(expected);
        expect(formatTimestampDay(null)).toBe('');
    });
});

describe('lot 6d · mode démo (V6.5, V6.6)', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('la période d’un budget garde ses dates civiles, quel que soit le fuseau', () => {
        expect(periodBounds('mensuel', '2026-11-01')).toEqual({ periodStart: '2026-11-01', periodEnd: '2026-11-30' });
        expect(periodBounds('hebdomadaire', '2026-11-02')).toEqual({ periodStart: '2026-11-02', periodEnd: '2026-11-08' });
        expect(periodBounds('annuel', '2026-01-01')).toEqual({ periodStart: '2026-01-01', periodEnd: '2026-12-31' });
        expect(localYmd(new Date(2026, 10, 1))).toBe('2026-11-01');
    });

    it('« tout marquer comme lu » répond et vide le compteur', () => {
        const before = handleDemoRequest('GET', '/api/notifications/unread-count') as { unreadCount: number };
        expect(before.unreadCount).toBe(2);
        const result = handleDemoRequest('POST', '/api/notifications/read-all') as { markedCount: number; unreadCount: number };
        expect(result).toEqual({ markedCount: 2, unreadCount: 0 });
        const after = handleDemoRequest('GET', '/api/notifications/unread-count') as { unreadCount: number };
        expect(after.unreadCount).toBe(0);
    });

    it('ouvrir une notification la marque lue', () => {
        const read = handleDemoRequest('POST', '/api/notifications/1/read') as { id: number; isRead: boolean; readAt: string | null };
        expect(read).toMatchObject({ id: 1, isRead: true });
        expect(read.readAt).toBeTruthy();
        const after = handleDemoRequest('GET', '/api/notifications/unread-count') as { unreadCount: number };
        expect(after.unreadCount).toBe(1);
        expect(() => handleDemoRequest('POST', '/api/notifications/999/read')).toThrow();
    });

    it('vider la boîte supprime les notifications', () => {
        expect(handleDemoRequest('DELETE', '/api/notifications')).toEqual({ deletedCount: 2 });
        const list = handleDemoRequest('GET', '/api/notifications?page=1&pageSize=20') as { items: unknown[] };
        expect(list.items).toEqual([]);
    });
});

describe('lot 6d · demande de preuve fermée à la déconnexion (R10)', () => {
    it('reset rend la main à l’appelant avec null', async () => {
        setActivePinia(createPinia());
        const store = useStepUpStore();
        const pending = store.prompt({} as never);
        expect(store.open).toBe(true);
        store.reset();
        await expect(pending).resolves.toBeNull();
        expect(store.open).toBe(false);
        expect(store.details).toBeNull();
    });
});

describe('lot 6d · téléchargement d’un PDF (V3.9)', () => {
    it('l’URL blob n’est révoquée qu’après un délai, pas juste après le clic', async () => {
        vi.useFakeTimers();
        const create = vi.fn(() => 'blob:test');
        const revoke = vi.fn();
        vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        try {
            await downloadFileBlob('FILE001', 'releve.pdf');
            expect(click).toHaveBeenCalledTimes(1);
            expect(revoke).not.toHaveBeenCalled();
            vi.advanceTimersByTime(DOWNLOAD_URL_REVOKE_DELAY_MS);
            expect(revoke).toHaveBeenCalledWith('blob:test');
        } finally {
            click.mockRestore();
            vi.useRealTimers();
        }
    });
});
