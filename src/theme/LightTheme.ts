import type { ThemeTypes } from '@/types/themeTypes/ThemeType';

const lightBase = {
    variables: {
        'border-color': '#e5eaef',
        'border-opacity': 1
    },
    colors: {
        info: '#539BFF',
        success: '#13DEB9',
        accent: '#FFAB91',
        warning: '#FFAE1F',
        error: '#FA896B',
        lightsuccess: '#E6FFFA',
        lighterror: '#FDEDE8',
        lightinfo: '#EBF3FE',
        lightwarning: '#FEF5E5',
        textPrimary: '#2A3547',
        textSecondary: '#2A3547',
        borderColor: '#e5eaef',
        inputBorder: '#DFE5EF',
        containerBg: '#ffffff',
        background: '#ffffff',
        hoverColor: '#f6f9fc',
        surface: '#fff',
        'on-surface-variant': '#fff',
        grey100: '#F2F6FA',
        grey200: '#EAEFF4'
    }
} as const;

const BLUE_THEME: ThemeTypes = {
    name: 'BLUE_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#5D87FF',
        secondary: '#49BEFF',
        lightprimary: '#ECF2FF',
        lightsecondary: '#E8F7FF'
    }
};

const AQUA_THEME: ThemeTypes = {
    name: 'AQUA_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#0074BA',
        secondary: '#47D7BC',
        lightprimary: '#E5F1F8',
        lightsecondary: '#EDFBF7'
    }
};

const PURPLE_THEME: ThemeTypes = {
    name: 'PURPLE_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#763EBD',
        secondary: '#94D0D6',
        lightprimary: '#F2ECF9',
        lightsecondary: '#EDF8FA'
    }
};

const GREEN_THEME: ThemeTypes = {
    name: 'GREEN_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#0A7EA4',
        secondary: '#CCDA4E',
        lightprimary: '#E6F2F6',
        lightsecondary: '#FAFBEF'
    }
};

const CYAN_THEME: ThemeTypes = {
    name: 'CYAN_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#01C0C8',
        secondary: '#FB9678',
        lightprimary: '#EBF9FA',
        lightsecondary: '#FFF5F2'
    }
};

const ORANGE_THEME: ThemeTypes = {
    name: 'ORANGE_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#FA896B',
        secondary: '#0074BA',
        lightprimary: '#FBF2EF',
        lightsecondary: '#EFF9FF'
    }
};

export { BLUE_THEME, AQUA_THEME, PURPLE_THEME, GREEN_THEME, CYAN_THEME, ORANGE_THEME };
