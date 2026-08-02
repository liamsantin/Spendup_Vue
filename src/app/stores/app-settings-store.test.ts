import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

describe('useAppSettingsStore', () => {
    beforeEach(() => {
        localStorage.clear();
        createTestPinia();
        vi.resetModules();
    });

    it('persiste uniquement via persist() / SET_THEME (pas de watch live)', async () => {
        const { useAppSettingsStore } = await import('@/app/stores/app-settings-store');
        const store = useAppSettingsStore();

        store.boxed = false;
        expect(localStorage.getItem('spendup_app_settings')).toBeNull();

        store.persist();
        const raw = localStorage.getItem('spendup_app_settings');
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw!).boxed).toBe(false);
        expect(JSON.parse(raw!).v).toBe(1);
        expect(JSON.parse(raw!).locale).toBeUndefined();
    });

    it('SET_LOCALE reste en mémoire (pas de localStorage)', async () => {
        const { useAppSettingsStore } = await import('@/app/stores/app-settings-store');
        const store = useAppSettingsStore();

        store.SET_LOCALE('en');
        expect(store.locale).toBe('en');
        expect(localStorage.getItem('spendup_app_settings')).toBeNull();

        store.persist();
        expect(JSON.parse(localStorage.getItem('spendup_app_settings')!).locale).toBeUndefined();
    });

    it('SET_THEME persiste immédiatement', async () => {
        const { useAppSettingsStore } = await import('@/app/stores/app-settings-store');
        const store = useAppSettingsStore();

        store.SET_THEME('DARK_BLUE_THEME');
        const parsed = JSON.parse(localStorage.getItem('spendup_app_settings')!);
        expect(parsed.actTheme).toBe('DARK_BLUE_THEME');
        expect(store.actTheme).toBe('DARK_BLUE_THEME');
    });

    it('ignore un thème inconnu dans le storage', async () => {
        localStorage.setItem(
            'spendup_app_settings',
            JSON.stringify({
                v: 1,
                actTheme: 'NOT_A_THEME',
                boxed: true,
                mini_sidebar: false,
                setHorizontalLayout: false,
                setBorderCard: false
            })
        );
        const { useAppSettingsStore } = await import('@/app/stores/app-settings-store');
        const store = useAppSettingsStore();
        expect(store.actTheme).toBe('BLUE_THEME');
    });

    it('Cancel restaure le snapshot sans laisser dirty', async () => {
        const { useAppSettingsStore } = await import('@/app/stores/app-settings-store');
        const store = useAppSettingsStore();
        store.SET_THEME('BLUE_THEME');
        const baseline = store.snapshot();

        store.actTheme = 'AQUA_THEME';
        store.boxed = !baseline.boxed;
        store.applySnapshot(baseline);

        expect(store.actTheme).toBe(baseline.actTheme);
        expect(store.boxed).toBe(baseline.boxed);
    });
});
