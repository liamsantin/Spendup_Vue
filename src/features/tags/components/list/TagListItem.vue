<script setup lang="ts">
/**
 * Ligne de tag sur filet fin : carré 7 px de couleur + nom 700 | usage gris à droite | actions au survol.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';
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

const colorStyle = computed(() => (props.tag.color ? { '--sq-color': props.tag.color } : undefined));
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
    <div class="tag-row" :class="{ 'tag-row--editable': !acting }" :style="colorStyle" :data-tag-id="tag.publicId" @click="onActivate">
        <span class="su-sq tag-row__sq" aria-hidden="true" />
        <p class="tag-row__name">{{ tag.name }}</p>
        <span class="tag-row__usage">{{ usageText }}</span>
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
    --sq-color: var(--t-gray-ink);
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-width: 0;
    min-height: 52px;
    padding: 8px 8px;
    box-sizing: border-box;
    border-top: 1px solid var(--line);
    color: inherit;
    transition: background 0.15s var(--ease);
}

.tag-row--editable {
    cursor: pointer;
}

.tag-row:hover {
    background: var(--soft);
}

.tag-row__sq {
    flex: none;
}

.tag-row__name {
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

.tag-row__usage {
    flex: none;
    font-size: 13px;
    color: var(--gray);
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.tag-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s var(--ease);
}

.tag-row:hover .tag-row__actions,
.tag-row:focus-within .tag-row__actions {
    opacity: 1;
}

@media (hover: none) {
    .tag-row__actions {
        opacity: 1;
    }
}

@media (max-width: 600px) {
    .tag-row {
        flex-wrap: wrap;
        gap: 8px 10px;
        padding-left: 0;
        padding-right: 0;
    }

    .tag-row__usage {
        flex: 1 1 100%;
        order: 3;
        padding-left: 17px;
        text-align: left;
    }
}
</style>
