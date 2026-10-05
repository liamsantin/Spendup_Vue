export { tagsApi } from '@/features/tags/api';
export { useTagsStore, refreshTagCountersIfLoaded } from '@/features/tags/stores/tags-store';
export {
    emptyToNull,
    normalizeName,
    normalizeColor,
    sortTags,
    matchesTagSearch,
    isDuplicateTagName,
    sanitizeTagPublicIds,
    sameTagPublicIds,
    withoutTagPublicId,
    normalizeTag
} from '@/features/tags/format';
export { emptyTagFormFields, tagToFormFields, buildCreateTagPayload, buildUpdateTagPayload, isTagFormDirty } from '@/features/tags/payload';
export type { TagFormFields, TagPayloadErrorCode } from '@/features/tags/payload';
export type { Tag, TagList, CreateTagPayload, UpdateTagPayload } from '@/features/tags/types';
export { TAG_NAME_MAX, TAG_PER_ITEM_MAX, TAG_COLOR_PRESETS } from '@/features/tags/types';
export { default as TagsDirectory } from '@/features/tags/components/TagsDirectory.vue';
export { default as TagListItem } from '@/features/tags/components/list/TagListItem.vue';
export { default as TagChips } from '@/features/tags/components/list/TagChips.vue';
export { default as TagFormModal } from '@/features/tags/components/modals/TagFormModal.vue';
export { default as TagPicker } from '@/features/tags/components/forms/TagPicker.vue';
