<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDownIcon, PencilIcon, PlusIcon, TrashIcon } from 'vue-tabler-icons';
import { resolveCategoryIcon } from '@/features/categories/icons';
import type { Category } from '@/features/categories/types';

const props = defineProps<{
    category: Category;
    expanded?: boolean;
    nested?: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [category: Category];
    delete: [category: Category];
    addChild: [category: Category];
    toggle: [category: Category];
}>();

const { t } = useI18n();

const isRoot = computed(() => !props.category.parentPublicId);
const hasChildren = computed(() => (props.category.children?.length ?? 0) > 0);
const childrenCount = computed(() => props.category.children?.length ?? 0);
const typeLabel = computed(() => t(`categoriesPage.types.${props.category.type}`));
const swatchStyle = computed(() => {
    const color = props.category.color;
    return color ? { backgroundColor: color } : undefined;
});

function onDoubleClick(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.category);
}
</script>

<template>
    <div
        class="category-row"
        :class="{
            'category-row--nested': nested,
            'category-row--editable': !acting,
            'category-row--root': isRoot
        }"
        :data-category-id="category.publicId"
        @dblclick="onDoubleClick"
    >
        <button
            v-if="isRoot"
            type="button"
            class="category-row__toggle"
            :class="{ 'is-expanded': expanded, 'is-empty': !hasChildren }"
            :disabled="!hasChildren"
            :aria-label="expanded ? t('categoriesPage.actions.collapse') : t('categoriesPage.actions.expand')"
            @click.stop="hasChildren && emit('toggle', category)"
        >
            <ChevronDownIcon v-if="hasChildren" :size="16" stroke-width="1.8" />
        </button>

        <span class="category-row__icon" :style="swatchStyle" :class="{ 'category-row__icon--empty': !category.color }">
            <component :is="resolveCategoryIcon(category.icone)" size="18" stroke-width="1.8" />
        </span>

        <div class="category-row__meta">
            <div class="category-row__title">
                <p class="category-row__name">{{ category.name }}</p>
                <span class="category-row__badge" :class="`is-${category.type}`">{{ typeLabel }}</span>
                <span v-if="isRoot && childrenCount" class="category-row__count">{{ childrenCount }}</span>
            </div>
        </div>

        <div class="category-row__actions">
            <button
                v-if="isRoot"
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('categoriesPage.actions.addChild')"
                @click.stop="emit('addChild', category)"
            >
                <PlusIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('categoriesPage.actions.edit')"
                @click.stop="emit('edit', category)"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('categoriesPage.actions.delete')"
                @click.stop="emit('delete', category)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.category-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 52px;
    padding: 8px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    transition: background 0.2s ease;
}

.category-row--editable {
    cursor: pointer;
}

.category-row:hover {
    background: var(--surface-hover-soft);
}

.category-row--nested {
    min-height: 44px;
    padding-left: 8px;
}

.category-row__toggle {
    appearance: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ink-mute, var(--ink-muted));
    cursor: pointer;
    flex: none;
    transition: transform 0.2s ease;
}

.category-row__toggle:hover:not(:disabled) {
    background: var(--hair);
}

.category-row__toggle.is-empty {
    cursor: default;
    opacity: 0;
    pointer-events: none;
}

.category-row__toggle:not(.is-expanded) {
    transform: rotate(-90deg);
}

.category-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    color: inherit;
    box-shadow: 0 6px 14px -10px rgba(16, 16, 20, 0.35);
}

.category-row__icon--empty {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.category-row__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.category-row__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.category-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.category-row__badge {
    flex: none;
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.2;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.category-row__badge.is-depense {
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.category-row__badge.is-revenu {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.category-row__badge.is-transfert {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}

.category-row__badge.is-mixte {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}

.category-row__count {
    flex: none;
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: var(--hair);
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 650;
}

.category-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

@media (max-width: 600px) {
    .category-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .category-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 38px;
    }

    .category-row--nested .category-row__actions {
        padding-left: 8px;
    }
}
</style>
