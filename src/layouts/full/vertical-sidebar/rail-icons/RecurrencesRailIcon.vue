<script setup lang="ts">
defineOptions({ name: 'RecurrencesRailIcon' });

import TwotoneIconShell from './TwotoneIconShell.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 24 });
</script>

<template>
    <TwotoneIconShell :size="size">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle class="icon-fill" cx="12" cy="12" r="7.25" />

            <g class="icon-stroke">
                <g class="icon-detail icon-detail--orbit">
                    <path d="M7.1 8.15A5.9 5.9 0 0 1 17.35 9.5" />
                    <path d="M17.35 9.5 15.05 7.6M17.35 9.5l-1.65 2.25" />
                    <path d="M16.9 15.85A5.9 5.9 0 0 1 6.65 14.5" />
                    <path d="M6.65 14.5 8.95 16.4M6.65 14.5l1.65-2.25" />
                </g>
                <circle cx="12" cy="12" r="1.35" />
            </g>
        </svg>
    </TwotoneIconShell>
</template>
