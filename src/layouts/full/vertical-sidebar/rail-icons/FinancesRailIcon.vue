<script setup lang="ts">
defineOptions({ name: 'FinancesRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon :size="size">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3.5" y="6.75" width="17" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M3.5 10.4H20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle class="rail-icon-tone" cx="16.15" cy="14.55" r="2" fill="none" stroke-width="1.5" />
        </svg>
    </RailIcon>
</template>
