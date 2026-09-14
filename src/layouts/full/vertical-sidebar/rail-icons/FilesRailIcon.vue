<script setup lang="ts">
defineOptions({ name: 'FilesRailIcon' });

import { ref } from 'vue';
import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });

const playing = ref(false);

function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    playing.value = false;
    requestAnimationFrame(() => {
        playing.value = true;
    });
}

function stop() {
    playing.value = false;
}
</script>

<template>
    <span class="files-rail-icon-hit" @mouseenter="play" @mouseleave="stop">
        <RailIcon :size="size">
            <svg
                class="files-rail-icon"
                :class="{ 'is-playing': playing }"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <!-- Feuille arrière (géométrie type Tabler Files) -->
                <path
                    class="files-back"
                    d="M16 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"
                    stroke="currentColor"
                    stroke-width="1.5"
                />

                <g class="files-front">
                    <!-- Coin plié -->
                    <path d="M15 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" stroke-width="1.5" />
                    <!-- Page avant -->
                    <path
                        d="M18 17h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l5 5v7a2 2 0 0 1-2 2z"
                        stroke="currentColor"
                        stroke-width="1.5"
                    />
                    <!-- Lignes de contenu -->
                    <path
                        class="files-line files-line--accent files-line--a"
                        d="M11.25 10.5h4.75"
                        stroke-width="1.5"
                    />
                    <path class="files-line files-line--b" d="M11.25 13h5.25" stroke="currentColor" stroke-width="1.5" />
                    <path
                        class="files-line files-line--accent files-line--c"
                        d="M11.25 15.5h3.75"
                        stroke-width="1.5"
                    />
                </g>
            </svg>
        </RailIcon>
    </span>
</template>

<style scoped lang="scss">
.files-rail-icon-hit {
    display: inline-flex;
    line-height: 0;
}

.files-rail-icon {
    display: block;
    overflow: visible;
}

.files-line--accent {
    stroke: rgb(var(--v-theme-primary));
}

.files-line {
    transform-box: fill-box;
    transform-origin: left center;
}

.files-rail-icon.is-playing {
    .files-front {
        animation: files-front-pop 0.65s cubic-bezier(0.34, 1.25, 0.64, 1) 1;
    }

    .files-back {
        animation: files-back-pop 0.65s cubic-bezier(0.34, 1.25, 0.64, 1) 1;
    }

    .files-line--a {
        animation: files-line-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.04s 1 both;
    }

    .files-line--b {
        animation: files-line-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.11s 1 both;
    }

    .files-line--c {
        animation: files-line-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.18s 1 both;
    }
}

@keyframes files-front-pop {
    0%,
    100% {
        transform: translate(0, 0);
    }
    45% {
        transform: translate(0.7px, -0.85px);
    }
}

@keyframes files-back-pop {
    0%,
    100% {
        transform: translate(0, 0);
    }
    45% {
        transform: translate(-0.65px, 0.8px);
    }
}

@keyframes files-line-in {
    from {
        transform: scaleX(0.25);
        opacity: 0;
    }
    to {
        transform: scaleX(1);
        opacity: 1;
    }
}
</style>
