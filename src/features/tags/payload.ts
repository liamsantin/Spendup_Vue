import { isDuplicateTagName, normalizeColor, normalizeName } from '@/features/tags/format';
import { TAG_NAME_MAX, type CreateTagPayload, type Tag, type UpdateTagPayload } from '@/features/tags/types';

export type TagPayloadErrorCode = 'nameRequired' | 'nameTooLong' | 'nameDuplicate' | 'colorInvalid';

export type TagFormFields = {
    name: string;
    color: string | null;
};

export type BuildTagPayloadOk<T> = { ok: true; payload: T };
export type BuildTagPayloadFail = { ok: false; code: TagPayloadErrorCode; field?: string };
export type BuildTagPayloadResult<T> = BuildTagPayloadOk<T> | BuildTagPayloadFail;

function fail(code: TagPayloadErrorCode, field?: string): BuildTagPayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

export function emptyTagFormFields(partial: Partial<TagFormFields> = {}): TagFormFields {
    return {
        name: '',
        color: null,
        ...partial
    };
}

export function tagToFormFields(tag: Tag): TagFormFields {
    return {
        name: tag.name,
        color: tag.color
    };
}

function commonFields(
    fields: TagFormFields,
    known: readonly Tag[],
    excludePublicId?: string | null
): BuildTagPayloadFail | { ok: true; name: string; color: string | null } {
    const name = normalizeName(fields.name);
    if (!name) return fail('nameRequired', 'name');
    if (name.length > TAG_NAME_MAX) return fail('nameTooLong', 'name');

    const colorRaw = fields.color;
    if (colorRaw && colorRaw.trim() && !normalizeColor(colorRaw)) {
        return fail('colorInvalid', 'color');
    }
    const color = normalizeColor(colorRaw);

    if (isDuplicateTagName(name, known, excludePublicId)) {
        return fail('nameDuplicate', 'name');
    }

    return { ok: true, name, color };
}

export function buildCreateTagPayload(fields: TagFormFields, known: readonly Tag[] = []): BuildTagPayloadResult<CreateTagPayload> {
    const common = commonFields(fields, known);
    if (!common.ok) return common;
    const payload: CreateTagPayload = { name: common.name };
    if (common.color) payload.color = common.color;
    return { ok: true, payload };
}

export function buildUpdateTagPayload(
    fields: TagFormFields,
    known: readonly Tag[] = [],
    excludePublicId?: string | null
): BuildTagPayloadResult<UpdateTagPayload> {
    const common = commonFields(fields, known, excludePublicId);
    if (!common.ok) return common;
    return {
        ok: true,
        payload: {
            name: common.name,
            color: common.color
        }
    };
}

export function isTagFormDirty(tag: Tag, fields: TagFormFields): boolean {
    if (normalizeName(fields.name) !== normalizeName(tag.name)) return true;
    if (normalizeColor(fields.color) !== normalizeColor(tag.color)) return true;
    return false;
}
