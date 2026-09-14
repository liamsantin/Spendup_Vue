<script setup lang="ts">
defineOptions({ name: 'FilesRailIcon' });

import TwotoneIconShell from './TwotoneIconShell.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 24 });
</script>

<template>
    <TwotoneIconShell :size="size">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                class="icon-fill"
                d="M8 4.5h5.2L17.5 8.8V18a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 18V6A1.5 1.5 0 0 1 8 4.5Z"
            />

            <g class="icon-stroke">
                <path class="icon-detail icon-detail--back" d="M15.5 17.5v1.25A1.75 1.75 0 0 1 13.75 20.5H7.5" />
                <path
                    d="M8 3.75h5.35L17.75 8.15V18A1.75 1.75 0 0 1 16 19.75H8A1.75 1.75 0 0 1 6.25 18V5.5A1.75 1.75 0 0 1 8 3.75Z"
                />
                <path d="M13.35 3.75V7.4c0 .69.56 1.25 1.25 1.25h3.15" />
                <path class="icon-detail icon-detail--lines" d="M9.25 11.25h5.5M9.25 13.75h5.5M9.25 16.25h3.75" />
            </g>
        </svg>
    </TwotoneIconShell>
</template>
