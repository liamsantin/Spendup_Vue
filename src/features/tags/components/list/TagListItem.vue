<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, TagIcon, TrashIcon } from 'vue-tabler-icons';
import type { Tag } from '@/features/tags/types';

const props = defineProps<{
    tag: Tag;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [tag: Tag];
    delete: [tag: Tag];
}>();

const { t } = useI18n();

const swatchStyle = computed(() => (props.tag.color ? { backgroundColor: props.tag.color } : undefined));
const usageText = computed(() => {
    const tx = props.tag.transactionCount;
    const rec = props.tag.recurringExpenseCount;
    if (!tx && !rec) return t('tagsPage.list.unused');
    const parts: string[] = [];
    if (tx) parts.push(t('tagsPage.list.transactions', { count: tx }, tx));
    if (rec) parts.push(t('tagsPage.list.recurringExpenses', { count: rec }, rec));
    return parts.join(' · ');
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.tag);
}
</script>

<template>
    <div class="tag-row" :class="{ 'tag-row--editable': !acting }" :data-tag-id="tag.publicId" @click="onActivate">
        <span class="tag-row__icon" :style="swatchStyle" :class="{ 'tag-row__icon--empty': !tag.color }">
            <TagIcon size="18" stroke-width="1.8" />
        </span>
        <div class="tag-row__meta">
            <p class="tag-row__name">{{ tag.name }}</p>
            <p class="tag-row__sub">{{ usageText }}</p>
        </div>
        <div class="tag-row__actions">
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('tagsPage.actions.edit')"
                @click.stop="emit('edit', tag)"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('tagsPage.actions.delete')"
                @click.stop="emit('delete', tag)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.tag-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-width: 0;
    min-height: 52px;
    padding: 8px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    transition: background 0.2s ease;
}

.tag-row--editable {
    cursor: pointer;
}

.tag-row:hover {
    background: var(--surface-hover-soft);
}

.tag-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    color: inherit;
    box-shadow: 0 6px 14px -10px rgba(16, 16, 20, 0.35);
}

.tag-row__icon--empty {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.tag-row__meta {
    flex: 1 1 auto;
    min-width: 0;
}

.tag-row__name {
    margin: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tag-row__sub {
    margin: 2px 0 0;
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.tag-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 4px;
}
</style>
