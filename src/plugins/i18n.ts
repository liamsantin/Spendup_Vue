import { createI18n } from 'vue-i18n';
import messages from '@/utils/locales/messages';

export type AppLocale = 'fr' | 'en';

export const APP_LOCALES: AppLocale[] = ['fr', 'en'];

export function isAppLocale(value: unknown): value is AppLocale {
    return value === 'fr' || value === 'en';
}

export const DEFAULT_LOCALE: AppLocale = 'fr';

export const i18n = createI18n({
    legacy: false,
    locale: DEFAULT_LOCALE,
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
