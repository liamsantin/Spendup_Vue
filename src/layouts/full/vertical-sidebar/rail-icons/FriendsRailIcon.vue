<script setup lang="ts">
defineOptions({ name: 'FriendsRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon :size="size">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="9.2" cy="8" r="2.7" fill="none" stroke="currentColor" stroke-width="1.5" />
            <path
                d="M4.55 18.75c0-2.85 2.1-5.05 4.65-5.05s4.65 2.2 4.65 5.05"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
            />
            <circle class="rail-icon-tone" cx="16.05" cy="8.35" r="2.35" fill="none" stroke-width="1.5" />
            <path class="rail-icon-tone" d="M13.4 18.75c.4-2.35 2-4.15 4.15-4.15 2.15 0 3.75 1.8 4.15 4.15" fill="none" stroke-width="1.5" stroke-linecap="round" />
        </svg>
    </RailIcon>
</template>
