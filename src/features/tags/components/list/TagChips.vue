<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTagsStore } from '@/features/tags/stores/tags-store';
import { sanitizeTagPublicIds } from '@/features/tags/format';

const props = withDefaults(
    defineProps<{
        tagPublicIds?: readonly string[] | null;
        compact?: boolean;
    }>(),
    {
        tagPublicIds: () => [],
        compact: false
    }
);

const store = useTagsStore();

const chips = computed(() => {
    return sanitizeTagPublicIds(props.tagPublicIds).flatMap((id) => {
        const tag = store.findByPublicId(id);
        if (!tag) return [];
        return [{ publicId: tag.publicId, name: tag.name, color: tag.color }];
    });
});

onMounted(() => {
    if (!store.initialized) void store.loadList().catch(() => undefined);
});
</script>

<template>
    <span v-if="chips.length" class="tag-chips" :class="{ 'is-compact': compact }">
        <span
            v-for="chip in chips"
            :key="chip.publicId"
            class="tag-chips__chip"
            :style="chip.color ? { '--tag-color': chip.color } : undefined"
        >
            <span class="tag-chips__sq" aria-hidden="true" />
            {{ chip.name }}
        </span>
    </span>
</template>

<style scoped>
/* Tags Swiss : carré gris bordé d'un filet, petit carré de la couleur du tag, texte gris. */
.tag-chips {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-width: 0;
}

.tag-chips__chip {
    --tag-color: var(--gray);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 160px;
    height: 22px;
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tag-chips__sq {
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--tag-color);
}

.tag-chips.is-compact .tag-chips__chip {
    max-width: 120px;
    height: 20px;
    padding: 0 6px;
    font-size: 11.5px;
}
</style>
