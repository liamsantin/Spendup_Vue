import type { ThemeTypes } from '@/types/themeTypes/ThemeType';

const lightBase = {
    variables: {
        'border-color': '#ebecef',
        'border-opacity': 1
    },
    colors: {
        info: '#5D87FF',
        success: '#2F5BD9',
        accent: '#775CFF',
        warning: '#7F6125',
        error: '#C0352B',
        lightsuccess: '#EDF1FC',
        lighterror: '#FBEEEC',
        lightinfo: '#EDF1FC',
        lightwarning: '#F5F0E6',
        textPrimary: '#0B0C10',
        textSecondary: '#686B75',
        borderColor: '#ebecef',
        inputBorder: '#ebecef',
        containerBg: '#ffffff',
        background: '#ffffff',
        hoverColor: '#f4f5f8',
        surface: '#fff',
        'on-surface-variant': '#fff',
        grey100: '#F4F5F8',
        grey200: '#EBECEF'
    }
} as const;

const BLUE_THEME: ThemeTypes = {
    name: 'BLUE_THEME',
    dark: false,
    variables: { ...lightBase.variables },
    colors: {
        ...lightBase.colors,
        primary: '#5D87FF',
        secondary: '#775CFF',
        lightprimary: '#EDF1FC',
        lightsecondary: '#F0EDFB'
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
