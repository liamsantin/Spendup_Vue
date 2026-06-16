export type ConfigProps = {
    Sidebar_drawer: boolean;
    Customizer_drawer: boolean;
    mini_sidebar: boolean;
    setHorizontalLayout: boolean;
    actTheme: string;
    boxed: boolean;
    setBorderCard: boolean;
};

const config: ConfigProps = {
    Sidebar_drawer: false,
    Customizer_drawer: false,
    mini_sidebar: false,
    setHorizontalLayout: false, // Horizontal layout
    actTheme: 'BLUE_THEME',
    boxed: true,
    setBorderCard: false
};

export default config;
