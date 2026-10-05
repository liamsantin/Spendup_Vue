<script setup lang="ts">
defineOptions({ name: 'LogoutRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon :size="size">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7.15 6.85a7.4 7.4 0 1 0 9.7 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path class="rail-icon-tone" d="M12 4.4V12.2" fill="none" stroke-width="1.5" stroke-linecap="round" />
        </svg>
    </RailIcon>
</template>
