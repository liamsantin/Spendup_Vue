<script setup lang="ts">
/**
 * Ligne de l’arbre des catégories, sur filet fin.
 * Racine : carré 36 px teinté de la couleur + nom 700 ; enfant : carré 7 px de couleur + nom 400 indenté.
 */
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
const colorStyle = computed(() => (props.category.color ? { '--cat-color': props.category.color } : undefined));

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
            'category-row--root': isRoot,
            'category-row--uncolored': !category.color
        }"
        :style="colorStyle"
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
            :aria-expanded="hasChildren ? expanded : undefined"
            @click.stop="hasChildren && emit('toggle', category)"
        >
            <ChevronDownIcon v-if="hasChildren" :size="16" stroke-width="1.8" />
        </button>

        <span v-if="isRoot" class="category-row__tile" aria-hidden="true">
            <component :is="resolveCategoryIcon(category.icone)" :size="18" stroke-width="1.7" />
        </span>
        <span v-else class="su-sq category-row__sq" aria-hidden="true" />

        <p class="category-row__name">{{ category.name }}</p>

        <span class="category-row__type">{{ typeLabel }}</span>
        <span v-if="isRoot" class="category-row__count">{{ childrenCount || '' }}</span>

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
    --cat-color: var(--t-gray-ink);
    --sq-color: var(--cat-color);
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 56px;
    padding: 10px 8px;
    box-sizing: border-box;
    border-top: 1px solid var(--line);
    color: inherit;
    transition: background 0.15s var(--ease);
}

.category-row--editable {
    cursor: pointer;
}

.category-row:hover {
    background: var(--soft);
}

/* enfant : indenté sous le carré 36 px du parent, nom en 400 */
.category-row--nested {
    min-height: 44px;
    padding: 8px 8px 8px 84px;
}

.category-row__toggle {
    appearance: none;
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    cursor: pointer;
    transition:
        transform 0.2s var(--ease),
        color 0.15s var(--ease);
}

.category-row__toggle:hover:not(:disabled) {
    color: var(--ink);
}

.category-row__toggle:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.category-row__toggle.is-empty {
    cursor: default;
    opacity: 0;
    pointer-events: none;
}

.category-row__toggle:not(.is-expanded) {
    transform: rotate(-90deg);
}

/* carré 36 px teinté de la couleur de la catégorie, pictogramme trait 18 px */
.category-row__tile {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 0;
    background: color-mix(in srgb, var(--cat-color) 14%, transparent);
    color: color-mix(in srgb, var(--cat-color) 78%, var(--ink));
}

.category-row--uncolored .category-row__tile {
    background: var(--t-gray-bg);
    color: var(--t-gray-ink);
}

.category-row__sq {
    flex: none;
}

.category-row__name {
    flex: 1 1 auto;
    margin: 0;
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.006em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.category-row--nested .category-row__name {
    font-weight: 400;
}

.category-row__type {
    flex: none;
    min-width: 72px;
    font-size: 13px;
    color: var(--gray);
}

.category-row__count {
    flex: none;
    min-width: 24px;
    font-size: 13px;
    color: var(--gray);
    text-align: right;
    font-variant-numeric: tabular-nums;
}

/* actions : boutons-icônes carrés, révélés au survol (toujours visibles au toucher) */
.category-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    min-width: 124px;
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.category-row:hover .category-row__actions,
.category-row:focus-within .category-row__actions {
    opacity: 1;
}

@media (hover: none) {
    .category-row__actions {
        opacity: 1;
    }
}

@media (max-width: 600px) {
    .category-row {
        gap: 10px;
        padding-left: 0;
        padding-right: 0;
    }

    .category-row--nested {
        padding-left: 50px;
    }

    .category-row__type,
    .category-row__count {
        display: none;
    }

    .category-row__actions {
        min-width: 0;
    }
}
</style>
