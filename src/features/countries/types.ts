export type Country = {
    id: number;
    code: string;
    codeAlpha3: string;
    name: string;
};

export type CountriesResult = {
    items: Country[];
};
