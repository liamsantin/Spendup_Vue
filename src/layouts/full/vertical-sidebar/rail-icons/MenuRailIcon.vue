<script setup lang="ts">
defineOptions({ name: 'MenuRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon :size="size">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5 7.25H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path class="rail-icon-tone" d="M5 12H19" fill="none" stroke-width="1.5" stroke-linecap="round" />
            <path d="M5 16.75H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
    </RailIcon>
</template>
