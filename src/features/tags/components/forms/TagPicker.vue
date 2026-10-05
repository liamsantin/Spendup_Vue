<script setup lang="ts">
/**
 * Multi-select de tags (max 10) + création inline.
 */

defineOptions({ name: 'TagPicker' });

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { XIcon } from 'vue-tabler-icons';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { sanitizeTagPublicIds } from '@/features/tags/format';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import { TAG_PER_ITEM_MAX, type Tag } from '@/features/tags/types';
import TagFormModal from '@/features/tags/components/modals/TagFormModal.vue';

const props = withDefaults(
    defineProps<{
        modelValue: string[];
        disabled?: boolean;
        error?: boolean;
        errorMessages?: string | null;
        label?: string;
        hint?: string | null;
    }>(),
    {
        disabled: false,
        error: false,
        errorMessages: null,
        label: undefined,
        hint: null
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string[]];
}>();

const { t } = useI18n();
const store = useTagsStore();

const createOpen = ref(false);
const createName = ref('');
const addValue = ref('');
let unsubscribeDeleted: (() => void) | null = null;

const selectedIds = computed(() => sanitizeTagPublicIds(props.modelValue));
const atLimit = computed(() => selectedIds.value.length >= TAG_PER_ITEM_MAX);

const selectedTags = computed(() =>
    selectedIds.value.map((id) => {
        const tag = store.findByPublicId(id);
        return {
            publicId: id,
            name: tag?.name ?? '…',
            color: tag?.color ?? null
        };
    })
);

const remainingItems = computed(() => {
    const selected = new Set(selectedIds.value);
    return store.items.filter((tag) => !selected.has(tag.publicId)).map((tag) => ({ title: tag.name, value: tag.publicId }));
});

function setIds(next: string[]) {
    emit('update:modelValue', sanitizeTagPublicIds(next));
}

function removeId(publicId: string) {
    setIds(selectedIds.value.filter((id) => id !== publicId));
}

function addId(publicId: string) {
    if (!publicId || atLimit.value) return;
    setIds([...selectedIds.value, publicId]);
    addValue.value = '';
}

function onAdd(value: string) {
    addId(value);
}

function openCreate(name?: string) {
    if (atLimit.value || props.disabled) return;
    createName.value = name?.trim() || '';
    createOpen.value = true;
}

function onCreated(tag: Tag) {
    addId(tag.publicId);
}

onMounted(() => {
    if (!store.initialized) {
        void store.loadList().catch(() => undefined);
    }
    unsubscribeDeleted = store.subscribeToDeleted((publicId) => {
        if (!selectedIds.value.includes(publicId)) return;
        setIds(selectedIds.value.filter((id) => id !== publicId));
    });
});

onUnmounted(() => {
    unsubscribeDeleted?.();
    unsubscribeDeleted = null;
});
</script>

<template>
    <div class="tag-picker" :class="{ 'is-disabled': disabled }">
        <div v-if="selectedTags.length" class="tag-picker__chips">
            <button
                v-for="chip in selectedTags"
                :key="chip.publicId"
                type="button"
                class="tag-picker__chip"
                :disabled="disabled"
                :style="chip.color ? { '--tag-color': chip.color } : undefined"
                :aria-label="t('tagsPage.picker.remove', { name: chip.name })"
                @click="removeId(chip.publicId)"
            >
                <span class="tag-picker__chip-name">{{ chip.name }}</span>
                <XIcon :size="12" stroke-width="2" />
            </button>
        </div>
        <AppSelect
            v-model="addValue"
            :items="remainingItems"
            :label="label || t('tagsPage.picker.add')"
            :disabled="disabled || atLimit"
            hide-details="auto"
            :error="error"
            :error-messages="errorMessages || undefined"
            :hint="atLimit ? t('tagsPage.picker.limit', { max: TAG_PER_ITEM_MAX }) : hint || undefined"
            :persistent-hint="atLimit || !!hint"
            searchable
            :search-placeholder="t('tagsPage.picker.search')"
            :no-results-label="t('tagsPage.picker.empty')"
            :create-label="atLimit ? undefined : t('tagsPage.picker.createNew')"
            :create-named-label="atLimit ? undefined : t('tagsPage.picker.create', { name: '{name}' })"
            @update:model-value="onAdd"
            @create="openCreate"
        />
        <TagFormModal v-model="createOpen" :default-name="createName" @saved="onCreated" />
    </div>
</template>

<style scoped>
.tag-picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.tag-picker__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tag-picker__chip {
    --tag-color: rgb(var(--v-theme-primary));
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    margin: 0;
    padding: 3px 8px 3px 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tag-color) 16%, transparent);
    color: var(--tag-color);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 620;
    cursor: pointer;
}

.tag-picker__chip:disabled {
    cursor: default;
    opacity: 0.65;
}

.tag-picker__chip-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tag-picker.is-disabled {
    opacity: 0.7;
    pointer-events: none;
}
</style>
