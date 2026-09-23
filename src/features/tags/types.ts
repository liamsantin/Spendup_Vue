export type Tag = {
    publicId: string;
    name: string;
    color: string | null;
    transactionCount: number;
    recurringExpenseCount: number;
    createdAt: string;
    updatedAt: string | null;
};

export type TagList = {
    items: Tag[];
    totalCount: number;
};

export type CreateTagPayload = {
    name: string;
    color?: string | null;
};

export type UpdateTagPayload = {
    name: string;
    color: string | null;
};

export const TAG_NAME_MAX = 100;
export const TAG_PER_ITEM_MAX = 10;
export const TAG_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const TAG_COLOR_PRESETS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B', '#2A9D8F'] as const;
