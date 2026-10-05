import {
    emptyToNull,
    findCategoryInTree,
    flattenCategories,
    isCompatibleParentType,
    normalizeColor,
    normalizeName
} from '@/features/categories/format';
import {
    CATEGORY_ICON_MAX,
    CATEGORY_NAME_MAX,
    CATEGORY_TYPES,
    type Category,
    type CategoryType,
    type CreateCategoryPayload,
    type UpdateCategoryPayload
} from '@/features/categories/types';

export type CategoryPayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'nameDuplicate'
    | 'typeInvalid'
    | 'colorInvalid'
    | 'iconeTooLong'
    | 'parentNotRoot'
    | 'parentSelf'
    | 'parentHasChildren'
    | 'parentTypeIncompatible';

export type CategoryFormFields = {
    name: string;
    type: CategoryType;
    color: string | null;
    icone: string;
    parentPublicId: string;
};

export type BuildCategoryPayloadOk<T> = { ok: true; payload: T };
export type BuildCategoryPayloadFail = { ok: false; code: CategoryPayloadErrorCode; field?: string };
export type BuildCategoryPayloadResult<T> = BuildCategoryPayloadOk<T> | BuildCategoryPayloadFail;

function fail(code: CategoryPayloadErrorCode, field?: string): BuildCategoryPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function isDuplicateName(
    name: string,
    type: CategoryType,
    parentPublicId: string | null,
    roots: readonly Category[],
    excludePublicId?: string | null
): boolean {
    const needle = name.trim().toLowerCase();
    if (!needle) return false;
    const parent = parentPublicId?.trim() || null;
    const siblings = parent ? (findCategoryInTree(roots, parent)?.children ?? []) : roots;
    return siblings.some((item) => {
        if (excludePublicId && item.publicId === excludePublicId) return false;
        if (item.type !== type) return false;
        return item.name.trim().toLowerCase() === needle;
    });
}

function commonFields(
    fields: CategoryFormFields,
    roots: readonly Category[],
    options: { excludePublicId?: string | null } = {}
):
    | BuildCategoryPayloadFail
    | {
          ok: true;
          name: string;
          type: CategoryType;
          color: string | null;
          icone: string | null;
          parentPublicId: string | null;
      } {
    if (!CATEGORY_TYPES.includes(fields.type)) {
        return fail('typeInvalid', 'type');
    }

    const name = normalizeName(fields.name);
    if (!name) return fail('nameRequired', 'name');
    if (name.length > CATEGORY_NAME_MAX) return fail('nameTooLong', 'name');

    const colorRaw = emptyToNull(fields.color);
    if (colorRaw && !normalizeColor(colorRaw)) {
        return fail('colorInvalid', 'color');
    }
    const color = normalizeColor(colorRaw);

    const icone = emptyToNull(fields.icone);
    if (icone && icone.length > CATEGORY_ICON_MAX) {
        return fail('iconeTooLong', 'icone');
    }

    const parentPublicId = emptyToNull(fields.parentPublicId);
    if (parentPublicId) {
        if (options.excludePublicId && parentPublicId === options.excludePublicId) {
            return fail('parentSelf', 'parentPublicId');
        }
        const parent = findCategoryInTree(roots, parentPublicId);
        if (!parent || parent.parentPublicId) {
            return fail('parentNotRoot', 'parentPublicId');
        }
        if (!isCompatibleParentType(parent.type, fields.type)) {
            return fail('parentTypeIncompatible', 'parentPublicId');
        }
        if (options.excludePublicId) {
            const current = findCategoryInTree(roots, options.excludePublicId);
            if (current?.children?.length) {
                return fail('parentHasChildren', 'parentPublicId');
            }
        }
    }

    if (isDuplicateName(name, fields.type, parentPublicId, roots, options.excludePublicId)) {
        return fail('nameDuplicate', 'name');
    }

    return {
        ok: true,
        name,
        type: fields.type,
        color,
        icone,
        parentPublicId
    };
}

export function buildCreateCategoryPayload(
    fields: CategoryFormFields,
    roots: readonly Category[] = []
): BuildCategoryPayloadResult<CreateCategoryPayload> {
    const common = commonFields(fields, roots);
    if (!common.ok) return common;

    const payload: CreateCategoryPayload = {
        name: common.name,
        type: common.type
    };
    if (common.color) payload.color = common.color;
    if (common.icone) payload.icone = common.icone;
    if (common.parentPublicId) payload.parentPublicId = common.parentPublicId;
    return { ok: true, payload };
}

export function buildUpdateCategoryPayload(
    fields: CategoryFormFields,
    roots: readonly Category[] = [],
    excludePublicId?: string | null
): BuildCategoryPayloadResult<UpdateCategoryPayload> {
    const common = commonFields(fields, roots, { excludePublicId });
    if (!common.ok) return common;

    return {
        ok: true,
        payload: {
            name: common.name,
            type: common.type,
            color: common.color,
            icone: common.icone,
            parentPublicId: common.parentPublicId
        }
    };
}

export function isCategoryFormDirty(category: Category, fields: CategoryFormFields): boolean {
    if (normalizeName(fields.name) !== normalizeName(category.name)) return true;
    if (fields.type !== category.type) return true;
    if (normalizeColor(fields.color) !== normalizeColor(category.color)) return true;
    if (emptyToNull(fields.icone) !== emptyToNull(category.icone)) return true;
    if (emptyToNull(fields.parentPublicId) !== emptyToNull(category.parentPublicId)) return true;
    return false;
}

export function categorySelectItems(
    roots: readonly Category[],
    options: { noneTitle: string; childPrefix?: string } = { noneTitle: '' }
): { title: string; value: string; indent?: number }[] {
    const prefix = options.childPrefix ?? '↳ ';
    const items: { title: string; value: string; indent?: number }[] = [{ title: options.noneTitle, value: '' }];
    for (const root of roots) {
        items.push({ title: root.name, value: root.publicId, indent: 0 });
        for (const child of root.children ?? []) {
            items.push({ title: `${prefix}${child.name}`, value: child.publicId, indent: 1 });
        }
    }
    return items;
}

export function allCategoriesFromRoots(roots: readonly Category[]): Category[] {
    return flattenCategories(roots);
}
