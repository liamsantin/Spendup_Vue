/** Couleurs prédéfinies alignées sur les thèmes Vuetify Spend.Up. */
export type ThemeColorOption = {
    id: string;
    hex: string;
    bg: string;
};

export const DAY_THEME_COLORS: ThemeColorOption[] = [
    { id: 'blue', hex: '#5D87FF', bg: 'themeBlue' },
    { id: 'aqua', hex: '#0074BA', bg: 'themeAqua' },
    { id: 'purple', hex: '#763EBD', bg: 'themePurple' },
    { id: 'green', hex: '#0A7EA4', bg: 'themeGreen' },
    { id: 'cyan', hex: '#01C0C8', bg: 'themeCyan' },
    { id: 'orange', hex: '#FA896B', bg: 'themeOrange' }
];

export const NIGHT_THEME_COLORS: ThemeColorOption[] = [
    { id: 'dark-blue', hex: '#5D87FF', bg: 'themeDarkBlue' },
    { id: 'dark-aqua', hex: '#0074BA', bg: 'themeDarkAqua' },
    { id: 'dark-purple', hex: '#763EBD', bg: 'themeDarkPurple' },
    { id: 'dark-green', hex: '#0A7EA4', bg: 'themeDarkGreen' },
    { id: 'dark-cyan', hex: '#01C0C8', bg: 'themeDarkCyan' },
    { id: 'dark-orange', hex: '#FA896B', bg: 'themeDarkOrange' }
];

/** Map hex → thème Vuetify pour sync runtime (optionnel). */
export const HEX_TO_LIGHT_THEME: Record<string, string> = {
    '#5D87FF': 'BLUE_THEME',
    '#0074BA': 'AQUA_THEME',
    '#763EBD': 'PURPLE_THEME',
    '#0A7EA4': 'GREEN_THEME',
    '#01C0C8': 'CYAN_THEME',
    '#FA896B': 'ORANGE_THEME'
};

export const HEX_TO_DARK_THEME: Record<string, string> = {
    '#5D87FF': 'DARK_BLUE_THEME',
    '#0074BA': 'DARK_AQUA_THEME',
    '#763EBD': 'DARK_PURPLE_THEME',
    '#0A7EA4': 'DARK_GREEN_THEME',
    '#01C0C8': 'DARK_CYAN_THEME',
    '#FA896B': 'DARK_ORANGE_THEME'
};

export function normalizeHex(value: string): string {
    return value.trim().toUpperCase();
}

export function isKnownThemeHex(value: string, options: ThemeColorOption[]): boolean {
    const hex = normalizeHex(value);
    return options.some((option) => normalizeHex(option.hex) === hex);
}
