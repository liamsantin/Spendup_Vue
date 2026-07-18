type notificationType = {
    avatar: string;
    title: string;
    subtitle: string;
};

type profileType = {
    avatar: string;
    title: string;
    subtitle: string;
    href: string;
};

type appsLinkType = {
    avatar: string;
    title: string;
    subtext: string;
    href: string;
};

type quickLinksType = {
    title: string;
    href: string;
};

type searchType = {
    title: string;
    href: string;
};

export type { notificationType, profileType, appsLinkType, quickLinksType, searchType };
