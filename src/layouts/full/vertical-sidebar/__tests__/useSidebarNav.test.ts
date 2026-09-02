import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

const lgAndUp = { value: true };
const unread = { count: 0 };

vi.mock('vuetify', () => ({
    useDisplay: () => ({ lgAndUp })
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        get unreadCount() {
            return unread.count;
        }
    })
}));

import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useSidebarNavStore } from '../sidebar-nav-store';
import { useSidebarNav } from '../useSidebarNav';

describe('useSidebarNav', () => {
    beforeEach(() => {
        createTestPinia();
        lgAndUp.value = true;
        unread.count = 0;
        useSidebarNavStore().reset();
        useAppSettingsStore().Sidebar_drawer = false;
    });

    it('syncThemeFromRoute suit le path', () => {
        const nav = useSidebarNav();
        nav.syncThemeFromRoute('/app/friends');
        expect(nav.activeThemeId.value).toBe('friends');
        nav.syncThemeFromRoute('/app/finances/comptes');
        expect(nav.activeThemeId.value).toBe('finances');
    });

    it('selectTheme ouvre le menu sans changer la route', () => {
        const nav = useSidebarNav();
        nav.syncThemeFromRoute('/app');
        nav.selectTheme('friends');
        expect(nav.activeThemeId.value).toBe('friends');
        expect(useAppSettingsStore().Sidebar_drawer).toBe(true);
    });

    it('reset Pinia isole le thème entre tests', () => {
        useSidebarNavStore().activeThemeId = 'settings';
        useSidebarNavStore().reset();
        expect(useSidebarNavStore().activeThemeId).toBe('general');
    });

    it('ajoute le chip notifications si unread > 0', () => {
        unread.count = 4;
        const nav = useSidebarNav();
        nav.syncThemeFromRoute('/app');
        const notif = nav.sidebarMenu.value.find((item) => item.to === '/app/notifications');
        expect(notif?.chip).toBe('4');
    });

    it('toggleContentSidebar inverse le drawer', () => {
        const nav = useSidebarNav();
        const settings = useAppSettingsStore();
        settings.Sidebar_drawer = true;
        nav.toggleContentSidebar();
        expect(settings.Sidebar_drawer).toBe(false);
    });
});
