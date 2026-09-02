import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useNotificationsStore } from '@/features/notifications';
import sidebarThemes, { themeIdFromPath, type menu, type SidebarThemeId } from './sidebarItem';

const activeThemeId = ref<SidebarThemeId>('spendup');

export function useSidebarNav() {
    const appSettings = useAppSettingsStore();
    const notifications = useNotificationsStore();
    const { lgAndUp } = useDisplay();

    const themes = sidebarThemes;

    const sidebarMenu = computed<menu[]>(() => {
        const theme = sidebarThemes.find((item) => item.id === activeThemeId.value) ?? sidebarThemes[0];
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
        activeThemeId.value = themeIdFromPath(path);
    }

    function selectTheme(id: SidebarThemeId) {
        if (id === activeThemeId.value) {
            if (lgAndUp.value) {
                toggleContentSidebar();
            }
            return;
        }
        activeThemeId.value = id;
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
