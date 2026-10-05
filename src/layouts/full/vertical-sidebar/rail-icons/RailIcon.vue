<script setup lang="ts">
defineOptions({ name: 'RailIcon' });

withDefaults(
    defineProps<{
        size?: number;
    }>(),
    { size: 26 }
);
</script>

<template>
    <span class="rail-icon" :style="{ width: `${size}px`, height: `${size}px` }">
        <slot />
    </span>
</template>

<style scoped lang="scss">
.rail-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: inherit;

    :deep(svg) {
        display: block;
        width: 100%;
        height: 100%;
        color: inherit;
    }

    :deep(.rail-icon-tone) {
        stroke: var(--rail-icon-tone-stroke, rgb(var(--v-theme-primary)));
    }
}
</style>
