<script setup lang="ts">
defineOptions({ name: 'GestionRailIcon' });

import TwotoneIconShell from './TwotoneIconShell.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 24 });
</script>

<template>
    <TwotoneIconShell :size="size">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                class="icon-fill"
                d="M4.5 8.75A1.5 1.5 0 0 1 6 7.25h3.2L10.85 8.75H18a1.5 1.5 0 0 1 1.5 1.5v8.25a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V8.75Z"
            />

            <g class="icon-stroke">
                <path
                    d="M4 8.35A1.85 1.85 0 0 1 5.85 6.5h3.35L11 8.35h7.15A1.85 1.85 0 0 1 20 10.2v8.05A1.85 1.85 0 0 1 18.15 20.1H5.85A1.85 1.85 0 0 1 4 18.25V8.35Z"
                />
                <g class="icon-detail icon-detail--sheet">
                    <path d="M8.75 18.6V12.15c0-.7.57-1.25 1.25-1.25h4c.7 0 1.25.55 1.25 1.25V18.6" />
                    <path d="M10.35 13.6h3.3M10.35 15.85h2.35" />
                </g>
            </g>
        </svg>
    </TwotoneIconShell>
</template>
