export type CategoryType = 'depense' | 'revenu' | 'transfert' | 'mixte';

/** Type de dépense pour la répartition du mois : absent = hérite de la racine, sinon « non classé ». */
export type SpendingKind = 'obligatoire' | 'plaisir' | 'epargne';

export const SPENDING_KINDS: SpendingKind[] = ['obligatoire', 'plaisir', 'epargne'];

/** Le type de dépense n'a de sens que pour une catégorie qui porte des dépenses. */
export function hasSpendingKind(type: CategoryType): boolean {
    return type === 'depense' || type === 'mixte';
}

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
    /** Nature fiscale par défaut (code du catalogue), facultative. */
    taxNature?: string | null;
    /** Type de dépense (obligatoire, plaisir, épargne), facultatif. */
    spendingKind?: SpendingKind | null;
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
    taxNature?: string | null;
    spendingKind?: SpendingKind | null;
};

export type UpdateCategoryPayload = {
    name: string;
    type: CategoryType;
    color: string | null;
    icone: string | null;
    parentPublicId: string | null;
    /** Absent : l'API conserve la nature ; chaîne vide : elle l'efface. */
    taxNature?: string;
    /** Même règle : absent conserve, chaîne vide efface. */
    spendingKind?: SpendingKind | '';
};

export const CATEGORY_TYPES: CategoryType[] = ['depense', 'revenu', 'transfert', 'mixte'];

export const CATEGORY_NAME_MAX = 150;
export const CATEGORY_ICON_MAX = 50;
export const CATEGORY_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const CATEGORY_COLOR_PRESETS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B', '#2A9D8F'] as const;
