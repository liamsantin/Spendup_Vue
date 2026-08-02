import { defineStore } from 'pinia';
import { ref } from 'vue';
import config from '@/config';
import { isAppLocale, setI18nLocale, type AppLocale } from '@/plugins/i18n';

const STORAGE_KEY = 'spendup_app_settings';
const SCHEMA_VERSION = 1;

const KNOWN_THEMES = new Set([
    'BLUE_THEME',
    'AQUA_THEME',
    'PURPLE_THEME',
    'GREEN_THEME',
    'CYAN_THEME',
    'ORANGE_THEME',
    'DARK_BLUE_THEME',
    'DARK_AQUA_THEME',
    'DARK_PURPLE_THEME',
    'DARK_GREEN_THEME',
    'DARK_CYAN_THEME',
    'DARK_ORANGE_THEME'
]);

export type PersistedSettings = {
    actTheme: string;
    boxed: boolean;
    mini_sidebar: boolean;
    setHorizontalLayout: boolean;
    setBorderCard: boolean;
    locale: AppLocale;
};

type StoredPayload = PersistedSettings & { v: number };

function defaults(): PersistedSettings {
    return {
        actTheme: config.actTheme,
        boxed: config.boxed,
        mini_sidebar: config.mini_sidebar,
        setHorizontalLayout: config.setHorizontalLayout,
        setBorderCard: config.setBorderCard,
        locale: 'fr'
    };
}

function sanitize(raw: unknown): PersistedSettings {
    const base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    const source = raw as Record<string, unknown>;

    const actTheme = typeof source.actTheme === 'string' && KNOWN_THEMES.has(source.actTheme) ? source.actTheme : base.actTheme;

    return {
        actTheme,
        boxed: typeof source.boxed === 'boolean' ? source.boxed : base.boxed,
        mini_sidebar: typeof source.mini_sidebar === 'boolean' ? source.mini_sidebar : base.mini_sidebar,
        setHorizontalLayout: typeof source.setHorizontalLayout === 'boolean' ? source.setHorizontalLayout : base.setHorizontalLayout,
        setBorderCard: typeof source.setBorderCard === 'boolean' ? source.setBorderCard : base.setBorderCard,
        locale: isAppLocale(source.locale) ? source.locale : base.locale
    };
}

function readPersisted(): PersistedSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaults();
        const parsed = JSON.parse(raw) as Partial<StoredPayload>;
        if (parsed && typeof parsed === 'object' && typeof parsed.v === 'number' && parsed.v !== SCHEMA_VERSION) {
            // Migration future : pour l’instant on sanitize et on réécrit au prochain persist.
        }
        return sanitize(parsed);
    } catch {
        return defaults();
    }
}

function writePersisted(settings: PersistedSettings) {
    const payload: StoredPayload = { v: SCHEMA_VERSION, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export const useAppSettingsStore = defineStore('app-settings', () => {
    const saved = readPersisted();

    const Sidebar_drawer = ref(config.Sidebar_drawer);
    const mini_sidebar = ref(saved.mini_sidebar);
    const setHorizontalLayout = ref(saved.setHorizontalLayout);
    const actTheme = ref(saved.actTheme);
    const boxed = ref(saved.boxed);
    const setBorderCard = ref(saved.setBorderCard);
    const locale = ref<AppLocale>(saved.locale);

    /** Ignore les events `storage` déclenchés par notre propre `persist()`. */
    let suppressStorageSync = false;

    function snapshot(): PersistedSettings {
        return {
            actTheme: actTheme.value,
            boxed: boxed.value,
            mini_sidebar: mini_sidebar.value,
            setHorizontalLayout: setHorizontalLayout.value,
            setBorderCard: setBorderCard.value,
            locale: locale.value
        };
    }

    function applySnapshot(value: PersistedSettings, options?: { fromStorage?: boolean }) {
        const next = sanitize(value);
        actTheme.value = next.actTheme;
        boxed.value = next.boxed;
        mini_sidebar.value = next.mini_sidebar;
        setHorizontalLayout.value = next.setHorizontalLayout;
        setBorderCard.value = next.setBorderCard;
        locale.value = next.locale;
        setI18nLocale(next.locale);
        if (options?.fromStorage) {
            // déjà lu depuis storage
        }
    }

    /** Persistance explicite uniquement (Save Applications, toggles header). Pas de watch live. */
    function persist() {
        suppressStorageSync = true;
        writePersisted(snapshot());
        queueMicrotask(() => {
            suppressStorageSync = false;
        });
    }

    function restorePersisted() {
        applySnapshot(readPersisted());
    }

    function SET_SIDEBAR_DRAWER() {
        Sidebar_drawer.value = !Sidebar_drawer.value;
    }

    function SET_MINI_SIDEBAR(payload: boolean) {
        mini_sidebar.value = payload;
        persist();
    }

    function SET_LAYOUT(payload: boolean) {
        setHorizontalLayout.value = payload;
    }

    function SET_THEME(payload: string) {
        if (!KNOWN_THEMES.has(payload)) return;
        actTheme.value = payload;
        persist();
    }

    function SET_CARD_BORDER(payload: boolean) {
        setBorderCard.value = payload;
    }

    function SET_LOCALE(payload: AppLocale) {
        if (!isAppLocale(payload)) return;
        locale.value = payload;
        setI18nLocale(payload);
        persist();
    }

    function syncFromStorageEvent(event: StorageEvent) {
        if (suppressStorageSync) return;
        if (event.key !== STORAGE_KEY || event.storageArea !== localStorage) return;
        applySnapshot(readPersisted(), { fromStorage: true });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('storage', syncFromStorageEvent);
        setI18nLocale(locale.value);
    }

    return {
        Sidebar_drawer,
        mini_sidebar,
        setHorizontalLayout,
        actTheme,
        boxed,
        setBorderCard,
        locale,
        snapshot,
        applySnapshot,
        persist,
        restorePersisted,
        SET_SIDEBAR_DRAWER,
        SET_MINI_SIDEBAR,
        SET_LAYOUT,
        SET_THEME,
        SET_CARD_BORDER,
        SET_LOCALE
    };
});
