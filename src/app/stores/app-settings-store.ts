import { defineStore } from 'pinia';
import { ref } from 'vue';
import config from '@/config';

export const useAppSettingsStore = defineStore('app-settings', () => {
    const Sidebar_drawer = ref(config.Sidebar_drawer);
    const Customizer_drawer = ref(config.Customizer_drawer);
    const mini_sidebar = ref(config.mini_sidebar);
    const setHorizontalLayout = ref(config.setHorizontalLayout);
    const actTheme = ref(config.actTheme);
    const boxed = ref(config.boxed);
    const setBorderCard = ref(config.setBorderCard);

    function SET_SIDEBAR_DRAWER() {
        Sidebar_drawer.value = !Sidebar_drawer.value;
    }

    function SET_MINI_SIDEBAR(payload: boolean) {
        mini_sidebar.value = payload;
    }

    function SET_CUSTOMIZER_DRAWER(payload: boolean) {
        Customizer_drawer.value = payload;
    }

    function SET_LAYOUT(payload: boolean) {
        setHorizontalLayout.value = payload;
    }

    function SET_THEME(payload: string) {
        actTheme.value = payload;
    }

    function SET_CARD_BORDER(payload: boolean) {
        setBorderCard.value = payload;
    }

    return {
        Sidebar_drawer,
        Customizer_drawer,
        mini_sidebar,
        setHorizontalLayout,
        actTheme,
        boxed,
        setBorderCard,
        SET_SIDEBAR_DRAWER,
        SET_MINI_SIDEBAR,
        SET_CUSTOMIZER_DRAWER,
        SET_LAYOUT,
        SET_THEME,
        SET_CARD_BORDER
    };
});
