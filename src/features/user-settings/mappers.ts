import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { isAppLocale, type AppLocale } from '@/plugins/i18n';
import type { UserSettings } from './types';

/** Mappe `fr-CH` / `en-US` → locale i18n `fr` / `en`. */
export function localeToAppLocale(locale: string): AppLocale {
    const base = locale.trim().toLowerCase().split('-')[0] ?? 'fr';
    return isAppLocale(base) ? base : 'fr';
}

/** Applique les settings API au shell runtime (i18n + layout local). */
export function applyUserSettingsToRuntime(settings: UserSettings) {
    const app = useAppSettingsStore();

    app.SET_LOCALE(localeToAppLocale(settings.locale));

    app.boxed = settings.containerOption === 'boxed';
    app.setBorderCard = settings.cardStyle === 'border';
    app.mini_sidebar = settings.sidebarType === 'mini' || settings.sidebarLayout === 'mini';

    // themeActive light/dark : bascule famille claire/sombre sans écraser la couleur choisie localement
    const isDark = app.actTheme.startsWith('DARK_');
    if (settings.themeActive === 'dark' && !isDark) {
        const darkName = `DARK_${app.actTheme.replace(/^DARK_/, '')}`;
        if (darkName !== app.actTheme) {
            app.actTheme = darkName.startsWith('DARK_') ? darkName : 'DARK_BLUE_THEME';
        }
    } else if (settings.themeActive === 'light' && isDark) {
        app.actTheme = app.actTheme.replace(/^DARK_/, '') || 'BLUE_THEME';
    }
}

export function cloneSettings(settings: UserSettings): UserSettings {
    return { ...settings };
}

export function settingsEqual(a: UserSettings, b: UserSettings): boolean {
    const keys = Object.keys(a) as (keyof UserSettings)[];
    return keys.every((key) => a[key] === b[key]);
}
