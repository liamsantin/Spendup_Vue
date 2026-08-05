type profileType = {
    avatar: string;
    titleKey: string;
    subtitleKey: string;
    href: string;
};

type searchType = {
    titleKey: string;
    subtitleKey: string;
    href: string;
    /** Clé d’icône résolue dans Searchbar. */
    icon: 'dashboard' | 'notifications' | 'friends' | 'account' | 'home' | 'features' | 'about';
    group: 'app' | 'site';
};

type appsLinkType = {
    avatar: string;
    titleKey: string;
    subtitleKey: string;
    href: string;
};

type quickLinksType = {
    titleKey: string;
    href: string;
};

export type { profileType, searchType, appsLinkType, quickLinksType };
