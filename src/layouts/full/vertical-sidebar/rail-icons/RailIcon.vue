<script setup lang="ts">
defineOptions({ name: 'RailIcon' });

import settings from '@/assets/icons/rail/settings.svg?raw';
import finances from '@/assets/icons/rail/finances.svg?raw';

const icons = {
    settings,
    finances
} as const;

export type RailIconName = keyof typeof icons;

withDefaults(
    defineProps<{
        name: RailIconName;
        size?: number;
    }>(),
    { size: 26 }
);
</script>

<template>
    <span class="rail-icon" :style="{ width: `${size}px`, height: `${size}px` }" v-html="icons[name]" />
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
