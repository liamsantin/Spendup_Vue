import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessLogEntry, AccessLogPage } from '@/features/auth';

const authMock = vi.hoisted(() => ({
    getAccessLog: vi.fn()
}));

vi.mock('@/features/auth', () => ({
    useAuthStore: () => authMock
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
        te: (key: string) => !key.endsWith('.inconnu'),
        locale: { value: 'fr' }
    })
}));

import { useAccessLog } from '@/features/user-settings/composables/useAccessLog';

type AccessLogState = ReturnType<typeof useAccessLog>;

function entry(overrides: Partial<AccessLogEntry> = {}): AccessLogEntry {
    return {
        publicId: 'g1',
        openedAt: '2026-11-05T14:02:00Z',
        endedAt: '2026-11-05T14:14:00Z',
        durationMinutes: 12,
        category: 'incident',
        reason: 'Solde incohérent signalé par l’utilisateur',
        status: 'terminated',
        codeUsed: false,
        userEmailSentAt: '2026-11-05T14:02:05Z',
        views: [
            { resource: 'accounts', count: 2 },
            { resource: 'transactions', count: 1 }
        ],
        ...overrides
    };
}

function pageOf(items: AccessLogEntry[], page = 1, totalCount = items.length, pageSize = 20): AccessLogPage {
    return { items, page, pageSize, totalCount };
}

/** Monte le composable dans un composant minimal et renvoie son état réactif. */
function mountAccessLog(pageSize?: number) {
    let state!: AccessLogState;
    const wrapper = mount(
        defineComponent({
            setup() {
                state = useAccessLog(pageSize);
                return {};
            },
            template: '<div />'
        })
    );
    return { wrapper, state };
}

/** Laisse les promesses du composable se résoudre. */
async function flush() {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
}

describe('useAccessLog', () => {
    beforeEach(() => {
        authMock.getAccessLog.mockReset();
    });

    it('charge la première page au montage et expose l’état vide explicite', async () => {
        authMock.getAccessLog.mockResolvedValue(pageOf([]));
        const { state } = mountAccessLog();

        expect(state.loading).toBe(true);
        expect(state.isEmpty).toBe(false);
        await flush();

        expect(authMock.getAccessLog).toHaveBeenCalledWith(1, 20);
        expect(state.loading).toBe(false);
        expect(state.isEmpty).toBe(true);
        expect(state.rows).toEqual([]);
        expect(state.totalPages).toBe(1);
        expect(state.hasPrevious).toBe(false);
        expect(state.hasNext).toBe(false);
    });

    it('formate chaque accès : date, durée, catégorie, écrans « ×n », état, e-mail', async () => {
        authMock.getAccessLog.mockResolvedValue(pageOf([entry()]));
        const { state } = mountAccessLog();
        await flush();

        expect(state.rows).toHaveLength(1);
        const row = state.rows[0];
        expect(row.id).toBe('g1');
        expect(row.openedAtText).toMatch(/2026/);
        expect(row.openedAtText).not.toContain('T14:02');
        expect(row.durationText).toBe('security.common.duration.minutes:{"n":12}');
        expect(row.categoryText).toBe('security.categories.incident');
        expect(row.reason).toBe('Solde incohérent signalé par l’utilisateur');
        expect(row.viewsText).toBe(
            'security.accessLog.viewCount:{"resource":"security.accessLog.resources.accounts","count":2}, ' +
                'security.accessLog.viewCount:{"resource":"security.accessLog.resources.transactions","count":1}'
        );
        expect(row.status).toBe('terminated');
        expect(row.statusText).toBe('security.accessLog.status.terminated');
        expect(row.statusColor).toBe('var(--gray)');
        expect(row.codeUsed).toBe(false);
        expect(row.emailSent).toBe(true);
        expect(row.emailText).toMatch(/\d{2}:\d{2}/);
    });

    it('annulée (email_failed) : badge violet, e-mail « non envoyé », aucun écran', async () => {
        authMock.getAccessLog.mockResolvedValue(
            pageOf([entry({ status: 'email_failed', userEmailSentAt: null, views: [], endedAt: null, durationMinutes: 0 })])
        );
        const { state } = mountAccessLog();
        await flush();

        const row = state.rows[0];
        expect(row.statusText).toBe('security.accessLog.status.email_failed');
        expect(row.statusColor).toBe('var(--violet)');
        expect(row.emailSent).toBe(false);
        expect(row.emailText).toBe('security.accessLog.emailNotSent');
        expect(row.viewsText).toBe('security.accessLog.viewsNone');
    });

    it('en cours avec code d’assistance : badge bleu et codeUsed', async () => {
        authMock.getAccessLog.mockResolvedValue(pageOf([entry({ status: 'active', codeUsed: true, category: 'demande_utilisateur' })]));
        const { state } = mountAccessLog();
        await flush();

        expect(state.rows[0].statusColor).toBe('var(--blue)');
        expect(state.rows[0].codeUsed).toBe(true);
        expect(state.rows[0].categoryText).toBe('security.categories.demande_utilisateur');
    });

    it('garde lisible une catégorie ou une ressource inconnue de l’i18n', async () => {
        authMock.getAccessLog.mockResolvedValue(pageOf([entry({ category: 'inconnu', views: [{ resource: 'inconnu', count: 3 }] })]));
        const { state } = mountAccessLog();
        await flush();

        expect(state.rows[0].categoryText).toBe('inconnu');
        expect(state.rows[0].viewsText).toBe('security.accessLog.viewCount:{"resource":"inconnu","count":3}');
    });

    it('pagine : suivant / précédent appellent l’API avec la bonne page et bornent la navigation', async () => {
        authMock.getAccessLog
            .mockResolvedValueOnce(pageOf([entry({ publicId: 'a' })], 1, 45))
            .mockResolvedValueOnce(pageOf([entry({ publicId: 'b' })], 2, 45))
            .mockResolvedValueOnce(pageOf([entry({ publicId: 'c' })], 3, 45))
            .mockResolvedValueOnce(pageOf([entry({ publicId: 'b' })], 2, 45));
        const { state } = mountAccessLog();
        await flush();

        expect(state.totalPages).toBe(3);
        expect(state.hasNext).toBe(true);
        expect(state.hasPrevious).toBe(false);
        expect(state.paginationText).toBe('security.accessLog.pagination.summary:{"page":1,"pages":3,"count":45}');

        await state.next();
        expect(authMock.getAccessLog).toHaveBeenLastCalledWith(2, 20);
        expect(state.page).toBe(2);
        expect(state.rows[0].id).toBe('b');

        await state.next();
        expect(state.page).toBe(3);
        expect(state.hasNext).toBe(false);

        await state.next();
        expect(authMock.getAccessLog).toHaveBeenCalledTimes(3);

        await state.previous();
        expect(authMock.getAccessLog).toHaveBeenLastCalledWith(2, 20);
        expect(state.page).toBe(2);
    });

    it('respecte une taille de page personnalisée', async () => {
        authMock.getAccessLog.mockResolvedValue(pageOf([], 1, 0, 5));
        mountAccessLog(5);
        await flush();

        expect(authMock.getAccessLog).toHaveBeenCalledWith(1, 5);
    });

    it('remonte l’erreur sans basculer sur l’état vide', async () => {
        authMock.getAccessLog.mockRejectedValue(new Error('boom'));
        const { state } = mountAccessLog();
        await flush();

        expect(state.error).toBe('boom');
        expect(state.loading).toBe(false);
        expect(state.isEmpty).toBe(false);
        expect(state.rows).toEqual([]);
    });
});
