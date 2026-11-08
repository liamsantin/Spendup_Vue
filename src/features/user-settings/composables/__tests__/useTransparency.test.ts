import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransparencyReport } from '@/features/auth';

const authMock = vi.hoisted(() => ({
    getTransparency: vi.fn()
}));

vi.mock('@/features/auth', () => ({
    useAuthStore: () => authMock
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>, plural?: number) =>
            params ? `${key}:${JSON.stringify(params)}${plural === undefined ? '' : `|${plural}`}` : key,
        te: (key: string) => !key.endsWith('.inconnu'),
        locale: { value: 'fr' }
    })
}));

import { useTransparency } from '@/features/user-settings/composables/useTransparency';

type TransparencyState = ReturnType<typeof useTransparency>;

function report(overrides: Partial<TransparencyReport> = {}): TransparencyReport {
    return {
        generatedAt: '2026-11-05T21:10:00Z',
        fromDay: '2026-09-01',
        toDay: '2026-11-05',
        monthsShown: 3,
        consultations: [{ day: '2026-11-05', category: 'incident', durationMinutes: 12, codeUsed: false }],
        consoleVisits: [
            { day: '2026-11-05', durationMinutes: 24, kind: 'consultation' },
            { day: '2026-11-03', durationMinutes: 2, kind: 'none' },
            { day: '2026-11-02', durationMinutes: 75, kind: 'statistics' }
        ],
        months: [
            { month: '2026-11', consoleVisits: 6, consultations: 1, usersConsulted: 1, loginsRefused: 3 },
            { month: '2026-10', consoleVisits: 0, consultations: 0, usersConsulted: 0, loginsRefused: 0 }
        ],
        byCategory: [
            { category: 'incident', count: 1 },
            { category: 'demande_utilisateur', count: 0 },
            { category: 'restauration', count: 0 },
            { category: 'rgpd', count: 0 },
            { category: 'securite', count: 0 }
        ],
        humanInterventions: { available: true, eventsTotal: 42, updatedAt: '2026-11-05T20:41:00Z' },
        ...overrides
    };
}

/** Monte le composable dans un composant minimal et renvoie son état réactif. */
function mountTransparency() {
    let state!: TransparencyState;
    const wrapper = mount(
        defineComponent({
            setup() {
                state = useTransparency();
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

describe('useTransparency', () => {
    beforeEach(() => {
        authMock.getTransparency.mockReset();
    });

    it('charge le registre au montage et formate la fenêtre et l’heure de génération', async () => {
        authMock.getTransparency.mockResolvedValue(report());
        const { state } = mountTransparency();

        expect(state.loading).toBe(true);
        expect(state.windowText).toBe('');
        await flush();

        expect(authMock.getTransparency).toHaveBeenCalledTimes(1);
        expect(state.loading).toBe(false);
        expect(state.windowText).toMatch(/^security\.transparency\.window:/);
        expect(state.windowText).toContain('"from":"1 sept. 2026"');
        expect(state.windowText).toContain('"to":"5 nov. 2026"');
        expect(state.windowText).toContain('security.transparency.monthsShown:{\\"n\\":3}|3');
        expect(state.generatedAtText).toMatch(/^security\.transparency\.generatedAt:\{"date":".*2026.*"\}$/);
        expect(state.generatedAtText).not.toContain('T21:10');
    });

    it('résume les mois (libellé de mois, compteurs formatés)', async () => {
        authMock.getTransparency.mockResolvedValue(report());
        const { state } = mountTransparency();
        await flush();

        expect(state.months).toEqual([
            {
                month: '2026-11',
                monthText: 'novembre 2026',
                consoleVisits: '6',
                consultations: '1',
                usersConsulted: '1',
                loginsRefused: '3'
            },
            { month: '2026-10', monthText: 'octobre 2026', consoleVisits: '0', consultations: '0', usersConsulted: '0', loginsRefused: '0' }
        ]);
    });

    it('formate consultations et visites (jour, catégorie, durée, code, nature)', async () => {
        authMock.getTransparency.mockResolvedValue(report());
        const { state } = mountTransparency();
        await flush();

        expect(state.consultations).toEqual([
            {
                key: '2026-11-05-0',
                dayText: '5 nov. 2026',
                categoryText: 'security.categories.incident',
                durationText: 'security.common.duration.minutes:{"n":12}',
                codeText: 'security.transparency.consultations.codeNo',
                codeUsed: false
            }
        ]);
        expect(state.visits.map((v) => [v.dayText, v.durationText, v.kind, v.kindText])).toEqual([
            ['5 nov. 2026', 'security.common.duration.minutes:{"n":24}', 'consultation', 'security.transparency.visits.kinds.consultation'],
            ['3 nov. 2026', 'security.common.duration.minutes:{"n":2}', 'none', 'security.transparency.visits.kinds.none'],
            [
                '2 nov. 2026',
                'security.common.duration.hours:{"h":1,"m":"15"}',
                'statistics',
                'security.transparency.visits.kinds.statistics'
            ]
        ]);
    });

    it('répartition : les cinq catégories dans l’ordre, même absentes de la réponse, puis les inconnues', async () => {
        authMock.getTransparency.mockResolvedValue(
            report({
                byCategory: [
                    { category: 'securite', count: 2 },
                    { category: 'inconnu', count: 1 }
                ]
            })
        );
        const { state } = mountTransparency();
        await flush();

        expect(state.byCategory.map((c) => [c.category, c.categoryText, c.count])).toEqual([
            ['incident', 'security.categories.incident', 0],
            ['demande_utilisateur', 'security.categories.demande_utilisateur', 0],
            ['restauration', 'security.categories.restauration', 0],
            ['rgpd', 'security.categories.rgpd', 0],
            ['securite', 'security.categories.securite', 2],
            ['inconnu', 'inconnu', 1]
        ]);
        expect(state.consultationsTotal).toBe(3);
    });

    it('compteur disponible : nombre formaté et date de mise à jour', async () => {
        authMock.getTransparency.mockResolvedValue(report());
        const { state } = mountTransparency();
        await flush();

        expect(state.counterAvailable).toBe(true);
        expect(state.counterText).toBe('42');
        expect(state.counterUpdatedAtText).toMatch(/^security\.transparency\.counter\.updatedAt:\{"date":".*2026.*"\}$/);
    });

    it('compteur indisponible : « indisponible », jamais 0, sans date', async () => {
        authMock.getTransparency.mockResolvedValue(
            report({ humanInterventions: { available: false, eventsTotal: null, updatedAt: null } })
        );
        const { state } = mountTransparency();
        await flush();

        expect(state.counterAvailable).toBe(false);
        expect(state.counterText).toBe('security.transparency.counter.unavailable');
        expect(state.counterText).not.toBe('0');
        expect(state.counterUpdatedAtText).toBe('');
    });

    it('registre vide : listes vides, répartition à zéro, pas d’erreur', async () => {
        authMock.getTransparency.mockResolvedValue(report({ consultations: [], consoleVisits: [], months: [], byCategory: [] }));
        const { state } = mountTransparency();
        await flush();

        expect(state.error).toBeNull();
        expect(state.months).toEqual([]);
        expect(state.consultations).toEqual([]);
        expect(state.visits).toEqual([]);
        expect(state.byCategory).toHaveLength(5);
        expect(state.byCategory.every((c) => c.count === 0)).toBe(true);
        expect(state.consultationsTotal).toBe(0);
    });

    it('remonte l’erreur de chargement', async () => {
        authMock.getTransparency.mockRejectedValue(new Error('boom'));
        const { state } = mountTransparency();
        await flush();

        expect(state.error).toBe('boom');
        expect(state.report).toBeNull();
        expect(state.byCategory).toEqual([]);
        expect(state.windowText).toBe('');
    });
});
