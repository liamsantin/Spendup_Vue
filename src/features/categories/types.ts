export type CategoryType = 'depense' | 'revenu' | 'transfert' | 'mixte';

export type Category = {
    publicId: string;
    name: string;
    type: CategoryType;
    color: string | null;
    icone: string | null;
    parentPublicId: string | null;
    createdAt: string;
    updatedAt: string | null;
    children: Category[];
};

export type CategoryList = {
    items: Category[];
    totalCount: number;
};

export type ListCategoriesQuery = {
    type?: CategoryType;
};

export type CreateCategoryPayload = {
    name: string;
    type: CategoryType;
    color?: string | null;
    icone?: string | null;
    parentPublicId?: string | null;
};

export type UpdateCategoryPayload = {
    name: string;
    type: CategoryType;
    color: string | null;
    icone: string | null;
    parentPublicId: string | null;
};

export const CATEGORY_TYPES: CategoryType[] = ['depense', 'revenu', 'transfert', 'mixte'];

export const CATEGORY_NAME_MAX = 150;
export const CATEGORY_ICON_MAX = 50;
export const CATEGORY_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const CATEGORY_COLOR_PRESETS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B', '#2A9D8F'] as const;
