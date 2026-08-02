import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import { en, fr } from 'vuetify/locale';
import { DEFAULT_LOCALE } from '@/plugins/i18n';

import { BLUE_THEME, AQUA_THEME, PURPLE_THEME, GREEN_THEME, CYAN_THEME, ORANGE_THEME } from '@/theme/LightTheme';
import {
    DARK_BLUE_THEME,
    DARK_AQUA_THEME,
    DARK_ORANGE_THEME,
    DARK_PURPLE_THEME,
    DARK_GREEN_THEME,
    DARK_CYAN_THEME
} from '@/theme/DarkTheme';

/**
 * Icônes Vuetify en SVG inline (aliases) — pas de webfont `@mdi/font` (~1 Mo+).
 * Composants / directives auto-importés via `vite-plugin-vuetify`.
 */
export default createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi }
    },

    locale: {
        locale: DEFAULT_LOCALE,
        fallback: 'en',
        messages: { fr, en }
    },

    date: {
        locale: {
            fr: 'fr-FR',
            en: 'en-US'
        }
    },

    theme: {
        defaultTheme: 'BLUE_THEME',
        themes: {
            BLUE_THEME,
            AQUA_THEME,
            PURPLE_THEME,
            GREEN_THEME,
            CYAN_THEME,
            ORANGE_THEME,

            DARK_BLUE_THEME,
            DARK_AQUA_THEME,
            DARK_ORANGE_THEME,
            DARK_PURPLE_THEME,
            DARK_GREEN_THEME,
            DARK_CYAN_THEME
        }
    },
    defaults: {
        VCard: {
            rounded: 'md'
        },
        VTextField: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VTextarea: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VSelect: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VListItem: {
            minHeight: '45px'
        },
        VTooltip: {
            location: 'top'
        }
    }
});
