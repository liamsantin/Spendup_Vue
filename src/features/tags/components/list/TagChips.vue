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
    return sanitizeTagPublicIds(props.tagPublicIds).map((id) => {
        const tag = store.findByPublicId(id);
        return {
            publicId: id,
            name: tag?.name ?? id,
            color: tag?.color ?? null,
            unknown: !tag
        };
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
            :class="{ 'is-unknown': chip.unknown }"
            :style="chip.color ? { '--tag-color': chip.color } : undefined"
        >
            {{ chip.name }}
        </span>
    </span>
</template>

<style scoped>
.tag-chips {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-width: 0;
}

.tag-chips__chip {
    --tag-color: rgb(var(--v-theme-primary));
    display: inline-flex;
    align-items: center;
    max-width: 140px;
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tag-color) 16%, transparent);
    color: var(--tag-color);
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tag-chips.is-compact .tag-chips__chip {
    max-width: 110px;
    padding: 0 6px;
    font-size: 0.65rem;
}

.tag-chips__chip.is-unknown {
    --tag-color: var(--ink-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 500;
}
</style>
