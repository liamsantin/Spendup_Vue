export type PackageType = {
    caption: string;
    subtext: string;
    price: number;
    period: string;
    buttontext: string;
    url: string;
    tagtext: boolean;
    tagLabel?: string;
    buttonOutlined?: boolean;
    list: {
        listtitle: string;
        status: boolean;
        icon: boolean;
        disable: boolean;
    }[];
};

export type FooterType = {
    menu: string;
    link: string;
};
