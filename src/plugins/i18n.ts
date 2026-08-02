import { createI18n } from 'vue-i18n';
import messages from '@/utils/locales/messages';

export type AppLocale = 'fr' | 'en';

export const APP_LOCALES: AppLocale[] = ['fr', 'en'];

export function isAppLocale(value: unknown): value is AppLocale {
    return value === 'fr' || value === 'en';
}

/** Lit la locale persistée avant le boot Pinia (même clé que app-settings). */
export function readInitialLocale(): AppLocale {
    try {
        const raw = localStorage.getItem('spendup_app_settings');
        if (!raw) return 'fr';
        const parsed = JSON.parse(raw) as { locale?: unknown };
        return isAppLocale(parsed.locale) ? parsed.locale : 'fr';
    } catch {
        return 'fr';
    }
}

export const i18n = createI18n({
    legacy: false,
    locale: readInitialLocale(),
    fallbackLocale: 'fr',
    messages,
    globalInjection: true,
    missingWarn: false,
    fallbackWarn: false
});

export function setI18nLocale(locale: AppLocale) {
    i18n.global.locale.value = locale;
    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
    }
}
