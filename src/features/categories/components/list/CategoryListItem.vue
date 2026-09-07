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
        class="su-person category-list-item"
        :class="{ 'category-list-item--nested': nested, 'category-list-item--editable': !acting }"
        :data-category-id="category.publicId"
        @dblclick="onDoubleClick"
    >
        <button
            v-if="isRoot"
            type="button"
            class="category-list-item__toggle"
            :class="{ 'is-expanded': expanded, 'is-empty': !hasChildren }"
            :disabled="!hasChildren"
            :aria-label="expanded ? t('categoriesPage.actions.collapse') : t('categoriesPage.actions.expand')"
            @click.stop="hasChildren && emit('toggle', category)"
        >
            <ChevronDownIcon v-if="hasChildren" :size="16" stroke-width="1.8" />
        </button>
        <span
            class="su-person__avatar su-person__avatar--tile category-list-item__icon"
            :style="swatchStyle"
            :class="{ 'category-list-item__icon--empty': !category.color }"
        >
            <component :is="resolveCategoryIcon(category.icone)" size="18" stroke-width="1.8" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">{{ category.name }}</p>
            <p class="su-person__sub">
                <span class="category-list-item__badge" :class="`is-${category.type}`">{{ typeLabel }}</span>
            </p>
        </div>
        <div class="su-person__actions">
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
.category-list-item {
    cursor: default;
}

.category-list-item--editable {
    cursor: pointer;
}

.category-list-item--nested {
    margin-left: 28px;
}

.category-list-item__toggle {
    appearance: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-right: 2px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ink-mute);
    cursor: pointer;
    flex: none;
    transition: transform 0.2s ease;
}

.category-list-item__toggle.is-empty {
    cursor: default;
    opacity: 0;
}

.category-list-item__toggle.is-expanded {
    transform: rotate(0deg);
}

.category-list-item__toggle:not(.is-expanded) {
    transform: rotate(-90deg);
}

.category-list-item__icon {
    color: inherit;
}

.category-list-item__icon--empty {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.category-list-item__badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.category-list-item__badge.is-depense {
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.category-list-item__badge.is-revenu {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.category-list-item__badge.is-transfert {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
}

.category-list-item__badge.is-mixte {
    background: rgba(var(--v-theme-secondary), 0.16);
    color: rgb(var(--v-theme-secondary));
}
</style>
