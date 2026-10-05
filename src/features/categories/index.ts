export { categoriesApi } from '@/features/categories/api';
export { useCategoriesStore } from '@/features/categories/stores/categories-store';
export {
    emptyToNull,
    normalizeName,
    normalizeColor,
    sortCategoryTree,
    flattenCategories,
    findCategoryInTree,
    compatibleParentCandidates,
    isCompatibleParentType
} from '@/features/categories/format';
export {
    buildCreateCategoryPayload,
    buildUpdateCategoryPayload,
    isCategoryFormDirty,
    isDuplicateName,
    categorySelectItems
} from '@/features/categories/payload';
export type { CategoryFormFields, CategoryPayloadErrorCode } from '@/features/categories/payload';
export { CATEGORY_ICON_KEYS, resolveCategoryIcon, isCategoryIconKey } from '@/features/categories/icons';
export type { CategoryIconKey } from '@/features/categories/icons';
export type {
    CategoryType,
    Category,
    CategoryList,
    ListCategoriesQuery,
    CreateCategoryPayload,
    UpdateCategoryPayload
} from '@/features/categories/types';
export { CATEGORY_TYPES, CATEGORY_NAME_MAX, CATEGORY_ICON_MAX, CATEGORY_COLOR_PRESETS } from '@/features/categories/types';
export { default as CategoriesTree } from '@/features/categories/components/CategoriesTree.vue';
export { default as CategoryListItem } from '@/features/categories/components/list/CategoryListItem.vue';
export { default as CategoryFormModal } from '@/features/categories/components/modals/CategoryFormModal.vue';
export { default as CategoryPlanModal } from '@/features/categories/components/modals/CategoryPlanModal.vue';
export { DEFAULT_CATEGORY_PLAN } from '@/features/categories/plans';
export type { CategoryPlanNodeDef } from '@/features/categories/plans';
