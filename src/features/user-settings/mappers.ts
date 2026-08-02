import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { isAppLocale, type AppLocale } from '@/plugins/i18n';
import { HEX_TO_DARK_THEME, HEX_TO_LIGHT_THEME, normalizeHex } from './themeColorOptions';
import {
    IDLE_LOGOUT_MINUTES_MAX,
    IDLE_LOGOUT_MINUTES_MIN,
    TRUSTED_DEVICE_DAYS_MAX,
    TRUSTED_DEVICE_DAYS_MIN,
    type UserSettings
} from './types';

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}

/** Normalise les champs sécurité avant PUT (aligné validation API). */
export function normalizeSecuritySettings(settings: UserSettings): UserSettings {
    const idle = settings.idleLogoutMinutes;
    const idleLogoutMinutes =
        idle == null || !Number.isFinite(idle) ? null : clampInt(idle, IDLE_LOGOUT_MINUTES_MIN, IDLE_LOGOUT_MINUTES_MAX);

    return {
        ...settings,
        idleLogoutMinutes,
        trustedDeviceDurationDays: clampInt(settings.trustedDeviceDurationDays, TRUSTED_DEVICE_DAYS_MIN, TRUSTED_DEVICE_DAYS_MAX),
        require2faForSensitiveActions: !!settings.require2faForSensitiveActions
    };
}

/** Mappe `fr-CH` / `en-US` → locale i18n `fr` / `en`. */
export function localeToAppLocale(locale: string): AppLocale {
    const base = locale.trim().toLowerCase().split('-')[0] ?? 'fr';
    return isAppLocale(base) ? base : 'fr';
}

function resolveVuetifyTheme(settings: UserSettings, currentlyDark: boolean): string | null {
    // Mode jour/nuit = thème Vuetify courant. Les hex API choisissent la famille de couleur.
    const hex = normalizeHex(currentlyDark ? settings.themeDarkColor : settings.themeColor);
    const mapped = currentlyDark ? HEX_TO_DARK_THEME[hex] : HEX_TO_LIGHT_THEME[hex];
    return mapped ?? null;
}

/** Applique les settings API au runtime (i18n + thème Vuetify). */
export function applyUserSettingsToRuntime(settings: UserSettings) {
    const app = useAppSettingsStore();
    app.SET_LOCALE(localeToAppLocale(settings.locale));

    const currentlyDark = app.actTheme.startsWith('DARK_');
    const themeName = resolveVuetifyTheme(settings, currentlyDark);
    if (themeName) {
        app.SET_THEME(themeName);
    }
}

export function cloneSettings(settings: UserSettings): UserSettings {
    return { ...settings };
}

export function settingsEqual(a: UserSettings, b: UserSettings): boolean {
    const keys = Object.keys(a) as (keyof UserSettings)[];
    return keys.every((key) => a[key] === b[key]);
}
