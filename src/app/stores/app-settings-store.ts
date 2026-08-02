import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import config from '@/config';

const STORAGE_KEY = 'spendup_app_settings';

type PersistedSettings = {
    actTheme: string;
    boxed: boolean;
    mini_sidebar: boolean;
    setHorizontalLayout: boolean;
    setBorderCard: boolean;
};

function readPersisted(): Partial<PersistedSettings> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writePersisted(settings: PersistedSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const useAppSettingsStore = defineStore('app-settings', () => {
    const saved = readPersisted();

    const Sidebar_drawer = ref(config.Sidebar_drawer);
    const Customizer_drawer = ref(config.Customizer_drawer);
    const mini_sidebar = ref(saved.mini_sidebar ?? config.mini_sidebar);
    const setHorizontalLayout = ref(saved.setHorizontalLayout ?? config.setHorizontalLayout);
    const actTheme = ref(saved.actTheme ?? config.actTheme);
    const boxed = ref(saved.boxed ?? config.boxed);
    const setBorderCard = ref(saved.setBorderCard ?? config.setBorderCard);

    function snapshot(): PersistedSettings {
        return {
            actTheme: actTheme.value,
            boxed: boxed.value,
            mini_sidebar: mini_sidebar.value,
            setHorizontalLayout: setHorizontalLayout.value,
            setBorderCard: setBorderCard.value
        };
    }

    function applySnapshot(value: PersistedSettings) {
        actTheme.value = value.actTheme;
        boxed.value = value.boxed;
        mini_sidebar.value = value.mini_sidebar;
        setHorizontalLayout.value = value.setHorizontalLayout;
        setBorderCard.value = value.setBorderCard;
    }

    function persist() {
        writePersisted(snapshot());
    }

    /** Restaure la dernière version persistée (ou les défauts config). */
    function restorePersisted() {
        const next = readPersisted();
        applySnapshot({
            actTheme: next.actTheme ?? config.actTheme,
            boxed: next.boxed ?? config.boxed,
            mini_sidebar: next.mini_sidebar ?? config.mini_sidebar,
            setHorizontalLayout: next.setHorizontalLayout ?? config.setHorizontalLayout,
            setBorderCard: next.setBorderCard ?? config.setBorderCard
        });
    }

    watch([actTheme, boxed, mini_sidebar, setHorizontalLayout, setBorderCard], () => {
        // Persistance live pour thème / layout (survits au reload hors page Applications).
        persist();
    });

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
        snapshot,
        applySnapshot,
        persist,
        restorePersisted,
        SET_SIDEBAR_DRAWER,
        SET_MINI_SIDEBAR,
        SET_CUSTOMIZER_DRAWER,
        SET_LAYOUT,
        SET_THEME,
        SET_CARD_BORDER
    };
});
