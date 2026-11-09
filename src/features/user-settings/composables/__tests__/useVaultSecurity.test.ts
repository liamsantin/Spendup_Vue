import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import type { VaultStatus } from '@/features/vault/types';

const apiMock = vi.hoisted(() => ({
    status: vi.fn(),
    migrateBatch: vi.fn(),
    migrateWrite: vi.fn(),
    complete: vi.fn(),
    setRecovery: vi.fn(),
    setPasswordWrap: vi.fn()
}));

vi.mock('@/features/vault/api', () => ({ vaultApi: apiMock }));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => ({ user: { userPublicId: 'U1' } }) }));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => {
            if (params?.date) return `${key}:${String(params.date)}`;
            if (params?.count != null) return `${key}:${String(params.count)}`;
            return key;
        },
        locale: { value: 'fr' }
    })
}));

import { useVaultSecurity } from '@/features/user-settings/composables/useVaultSecurity';

type State = ReturnType<typeof useVaultSecurity>;

function mountComposable() {
    let state!: State;
    mount(
        defineComponent({
            setup() {
                state = useVaultSecurity();
                return {};
            },
            template: '<div />'
        })
    );
    return state;
}

async function flush() {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
}

function status(overrides: Partial<VaultStatus> = {}): VaultStatus {
    return {
        exists: true,
        state: 'active',
        version: 1,
        kdf: 'pbkdf2',
        iterations: 600_000,
        memoryKiB: null,
        parallelism: null,
        salt: 'c2FsdA',
        dekWrappedPassword: 'd3JhcA',
        recoverySalt: null,
        dekWrappedRecovery: null,
        hasRecovery: false,
        recoveryCreatedAt: null,
        locked: false,
        plan: 'free',
        allowedScope: 'core',
        pendingCount: 0,
        activatedAt: null,
        ...overrides
    };
}

describe('useVaultSecurity', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(apiMock).forEach((fn) => fn.mockReset());
    });

    it('Coffre absent : état gris, pas de bloc récupération', async () => {
        apiMock.status.mockResolvedValue(status({ exists: false, state: null }));
        const state = mountComposable();
        expect(state.loading).toBe(true);
        await flush();

        expect(state.loading).toBe(false);
        expect(state.exists).toBe(false);
        expect(state.statusText).toBe('security.vault.status.absent');
        expect(state.statusColor).toBe('var(--gray)');
        expect(state.canManageRecovery).toBe(false);
    });

    it('Coffre actif mais fermé sur cet appareil : rappel du code de récupération, périmètre socle', async () => {
        apiMock.status.mockResolvedValue(status());
        const state = mountComposable();
        await flush();

        expect(state.exists).toBe(true);
        expect(state.locked).toBe(true);
        expect(state.statusText).toBe('security.vault.status.locked');
        expect(state.statusColor).toBe('var(--violet)');
        expect(state.scopeText).toBe('security.vault.scope.core');
        expect(state.hasRecovery).toBe(false);
        expect(state.canManageRecovery).toBe(true);
        expect(state.recoveryText).toBe('security.vault.recovery.reminder');
        expect(state.recoveryButtonLabel).toBe('security.vault.recovery.generate');
    });

    it('migration en cours avec compteur, périmètre étendu, code déjà enregistré', async () => {
        apiMock.status.mockResolvedValue(
            status({
                state: 'migrating',
                pendingCount: 42,
                allowedScope: 'extended',
                hasRecovery: true,
                recoveryCreatedAt: '2026-11-09T10:00:00Z'
            })
        );
        const state = mountComposable();
        await flush();

        expect(state.statusText).toBe('security.vault.status.migrating:42');
        expect(state.scopeText).toBe('security.vault.scope.extended');
        expect(state.recoveryText).toMatch(/^security\.vault\.recovery\.done:.+/);
        expect(state.recoveryText).not.toContain('2026-11-09T10:00:00Z');
        expect(state.recoveryButtonLabel).toBe('security.vault.recovery.renew');
    });

    it('clé perdue côté serveur : état « lost », pas de code de récupération possible', async () => {
        apiMock.status.mockResolvedValue(status({ locked: true, dekWrappedPassword: null }));
        const state = mountComposable();
        await flush();

        expect(state.lost).toBe(true);
        expect(state.statusText).toBe('security.vault.status.lost');
        expect(state.canManageRecovery).toBe(false);
    });

    it('erreur API : message d’erreur, pas de plantage', async () => {
        apiMock.status.mockRejectedValue(new Error('boom'));
        const state = mountComposable();
        await flush();

        expect(state.loading).toBe(false);
        expect(state.error).toBe('security.vault.status.absent');
        expect(state.exists).toBe(false);
    });
});
