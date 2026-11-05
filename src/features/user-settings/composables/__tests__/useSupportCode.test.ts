import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
    getSupportCodeStatus: vi.fn(),
    generateSupportCode: vi.fn()
}));

vi.mock('@/features/auth', () => ({
    useAuthStore: () => authMock
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => (params?.date ? `${key}:${String(params.date)}` : key),
        locale: { value: 'fr' }
    })
}));

import { useSupportCode } from '@/features/user-settings/composables/useSupportCode';

type SupportCodeState = ReturnType<typeof useSupportCode>;

/** Monte le composable dans un composant minimal et renvoie son état réactif. */
function mountSupportCode() {
    let state!: SupportCodeState;
    const wrapper = mount(
        defineComponent({
            setup() {
                state = useSupportCode();
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

describe('useSupportCode', () => {
    beforeEach(() => {
        authMock.getSupportCodeStatus.mockReset();
        authMock.generateSupportCode.mockReset();
    });

    it('charge l’état au montage : aucun code actif', async () => {
        authMock.getSupportCodeStatus.mockResolvedValue({ hasActiveCode: false, expiresAt: null, usedAt: null });
        const { state } = mountSupportCode();

        expect(state.statusLoading).toBe(true);
        await flush();

        expect(authMock.getSupportCodeStatus).toHaveBeenCalledTimes(1);
        expect(state.statusLoading).toBe(false);
        expect(state.hasActiveCode).toBe(false);
        expect(state.statusText).toBe('security.supportCode.status.none');
        expect(state.generateLabel).toBe('security.supportCode.generate');
    });

    it('affiche « actif jusqu’au » avec la date et le libellé « nouveau code »', async () => {
        authMock.getSupportCodeStatus.mockResolvedValue({
            hasActiveCode: true,
            expiresAt: '2026-11-06T10:30:00Z',
            usedAt: null
        });
        const { state } = mountSupportCode();
        await flush();

        expect(state.hasActiveCode).toBe(true);
        expect(state.statusText).toMatch(/^security\.supportCode\.status\.active:.+/);
        expect(state.statusText).not.toContain('2026-11-06T10:30:00Z');
        expect(state.generateLabel).toBe('security.supportCode.regenerate');
    });

    it('affiche « utilisé le » quand le dernier code a été consommé', async () => {
        authMock.getSupportCodeStatus.mockResolvedValue({
            hasActiveCode: false,
            expiresAt: null,
            usedAt: '2026-11-04T08:00:00Z'
        });
        const { state } = mountSupportCode();
        await flush();

        expect(state.hasActiveCode).toBe(false);
        expect(state.statusText).toMatch(/^security\.supportCode\.status\.used:.+/);
    });

    it('génère un code, le garde affiché et passe l’état en actif', async () => {
        authMock.getSupportCodeStatus.mockResolvedValue({ hasActiveCode: false, expiresAt: null, usedAt: null });
        authMock.generateSupportCode.mockResolvedValue({ code: 'ABCD-EFGH', expiresAt: '2026-11-06T10:30:00Z' });
        const { state } = mountSupportCode();
        await flush();

        await state.generate();

        expect(authMock.generateSupportCode).toHaveBeenCalledTimes(1);
        expect(state.generated?.code).toBe('ABCD-EFGH');
        expect(state.hasActiveCode).toBe(true);
        expect(state.statusText).toMatch(/^security\.supportCode\.status\.active:/);
        expect(state.generatedExpiresText).toMatch(/^security\.supportCode\.expiresAt:/);
        expect(state.generateLabel).toBe('security.supportCode.regenerate');
        expect(state.error).toBeNull();
    });

    it('remonte l’erreur de génération sans effacer l’état', async () => {
        authMock.getSupportCodeStatus.mockResolvedValue({ hasActiveCode: false, expiresAt: null, usedAt: null });
        authMock.generateSupportCode.mockRejectedValue(new Error('boom'));
        const { state } = mountSupportCode();
        await flush();

        await state.generate();

        expect(state.error).toBe('boom');
        expect(state.generated).toBeNull();
        expect(state.hasActiveCode).toBe(false);
    });

    it('copie le code dans le presse-papiers puis réinitialise « Copié »', async () => {
        vi.useFakeTimers();
        try {
            const writeText = vi.fn().mockResolvedValue(undefined);
            vi.stubGlobal('navigator', { clipboard: { writeText } });
            authMock.getSupportCodeStatus.mockResolvedValue({ hasActiveCode: false, expiresAt: null, usedAt: null });
            authMock.generateSupportCode.mockResolvedValue({ code: 'ABCD-EFGH', expiresAt: '2026-11-06T10:30:00Z' });
            const { state } = mountSupportCode();
            await state.generate();

            await state.copyCode();

            expect(writeText).toHaveBeenCalledWith('ABCD-EFGH');
            expect(state.copied).toBe(true);
            vi.advanceTimersByTime(2000);
            expect(state.copied).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('signale l’échec de copie', async () => {
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
        authMock.getSupportCodeStatus.mockResolvedValue({ hasActiveCode: false, expiresAt: null, usedAt: null });
        authMock.generateSupportCode.mockResolvedValue({ code: 'ABCD-EFGH', expiresAt: '2026-11-06T10:30:00Z' });
        const { state } = mountSupportCode();
        await state.generate();

        await state.copyCode();

        expect(state.copied).toBe(false);
        expect(state.error).toBe('security.supportCode.errors.copyFailed');
    });
});
