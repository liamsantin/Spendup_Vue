import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useNotificationsStore } from '@/features/notifications';
import { useSidebarNavStore } from './sidebar-nav-store';
import sidebarThemes, { themeIdFromPath, type menu, type SidebarThemeId } from './sidebarItem';

export function useSidebarNav() {
    const appSettings = useAppSettingsStore();
    const notifications = useNotificationsStore();
    const { lgAndUp } = useDisplay();
    const navStore = useSidebarNavStore();

    const themes = sidebarThemes;
    const activeThemeId = computed({
        get: () => navStore.activeThemeId,
        set: (id: SidebarThemeId) => {
            navStore.activeThemeId = id;
        }
    });

    const sidebarMenu = computed<menu[]>(() => {
        const theme = sidebarThemes.find((item) => item.id === navStore.activeThemeId) ?? sidebarThemes[0];
        return theme.items.map((item) => {
            if (item.to !== '/app/notifications') return item;
            const count = notifications.unreadCount;
            if (count <= 0) {
                return { ...item, chip: undefined };
            }
            return {
                ...item,
                chip: String(count),
                chipColor: item.chipColor ?? 'surface',
                chipBgColor: item.chipBgColor ?? 'primary'
            };
        });
    });

    function syncThemeFromRoute(path: string) {
        navStore.activeThemeId = themeIdFromPath(path);
    }

    function selectTheme(id: SidebarThemeId) {
        navStore.activeThemeId = id;
        appSettings.Sidebar_drawer = true;
    }

    function toggleContentSidebar() {
        const isOpen = appSettings.Sidebar_drawer ?? lgAndUp.value;
        appSettings.Sidebar_drawer = !isOpen;
    }

    return {
        activeThemeId,
        themes,
        sidebarMenu,
        syncThemeFromRoute,
        selectTheme,
        toggleContentSidebar
    };
}
