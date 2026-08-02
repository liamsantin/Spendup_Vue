import type { ThemeTypes } from '@/types/themeTypes/ThemeType';

/** Catalogue partagé ThemeTab (évite la dérive Customizer). */
export const LIGHT_THEME_OPTIONS = [
    { name: 'BLUE_THEME', bg: 'themeBlue' },
    { name: 'AQUA_THEME', bg: 'themeAqua' },
    { name: 'PURPLE_THEME', bg: 'themePurple' },
    { name: 'GREEN_THEME', bg: 'themeGreen' },
    { name: 'CYAN_THEME', bg: 'themeCyan' },
    { name: 'ORANGE_THEME', bg: 'themeOrange' }
] as const;

export const DARK_THEME_OPTIONS = [
    { name: 'DARK_BLUE_THEME', bg: 'themeDarkBlue' },
    { name: 'DARK_AQUA_THEME', bg: 'themeDarkAqua' },
    { name: 'DARK_PURPLE_THEME', bg: 'themeDarkPurple' },
    { name: 'DARK_GREEN_THEME', bg: 'themeDarkGreen' },
    { name: 'DARK_CYAN_THEME', bg: 'themeDarkCyan' },
    { name: 'DARK_ORANGE_THEME', bg: 'themeDarkOrange' }
] as const;

export type ThemeOptionName = (typeof LIGHT_THEME_OPTIONS)[number]['name'] | (typeof DARK_THEME_OPTIONS)[number]['name'];

/** @deprecated Prefer LIGHT_THEME_OPTIONS / DARK_THEME_OPTIONS — kept for type imports. */
export type { ThemeTypes };
