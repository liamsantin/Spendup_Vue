export type ConfigProps = {
    Sidebar_drawer: boolean | null;
    mini_sidebar: boolean;
    setHorizontalLayout: boolean;
    actTheme: string;
    boxed: boolean;
    setBorderCard: boolean;
};

const config: ConfigProps = {
    Sidebar_drawer: null,
    mini_sidebar: false,
    setHorizontalLayout: false,
    actTheme: 'BLUE_THEME',
    boxed: true,
    setBorderCard: false
};

export default config;
