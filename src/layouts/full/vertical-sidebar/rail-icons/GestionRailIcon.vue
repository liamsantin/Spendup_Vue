<script setup lang="ts">
defineOptions({ name: 'GestionRailIcon' });

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
    <span class="gestion-rail-icon-hit" @mouseenter="play" @mouseleave="stop">
        <RailIcon :size="size">
            <svg
                class="gestion-rail-icon"
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
                <!-- Tone 1 : dossier -->
                <path
                    class="gestion-folder"
                    d="M4 8.25A2 2 0 0 1 6 6.25h3.4L11.15 8.25H18a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-10.5Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                />

                <!-- Tone 2 : fiche (couleur thème via rail-icon-tone) -->
                <g class="gestion-sheet">
                    <path
                        class="rail-icon-tone"
                        d="M8.5 18.75V12.4c0-.77.63-1.4 1.4-1.4h4.2c.77 0 1.4.63 1.4 1.4v6.35"
                        stroke-width="1.5"
                    />
                    <path class="rail-icon-tone gestion-line gestion-line--a" d="M10.15 13.85h3.7" stroke-width="1.5" />
                    <path class="rail-icon-tone gestion-line gestion-line--b" d="M10.15 16.15h2.6" stroke-width="1.5" />
                </g>
            </svg>
        </RailIcon>
    </span>
</template>

<style scoped lang="scss">
.gestion-rail-icon-hit {
    display: inline-flex;
    line-height: 0;
}

.gestion-rail-icon {
    display: block;
    overflow: visible;
}

.gestion-folder,
.gestion-sheet {
    transform-origin: 12px 14px;
}

.gestion-line {
    transform-box: fill-box;
    transform-origin: left center;
}

.gestion-rail-icon.is-playing {
    .gestion-folder {
        animation: gestion-folder-pop 0.65s cubic-bezier(0.34, 1.25, 0.64, 1) 1;
    }

    .gestion-sheet {
        animation: gestion-sheet-pop 0.65s cubic-bezier(0.34, 1.25, 0.64, 1) 1;
    }

    .gestion-line--a {
        animation: gestion-line-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.06s 1 both;
    }

    .gestion-line--b {
        animation: gestion-line-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.14s 1 both;
    }
}

@keyframes gestion-folder-pop {
    0%,
    100% {
        transform: translate(0, 0);
    }
    45% {
        transform: translate(0, 0.4px);
    }
}

@keyframes gestion-sheet-pop {
    0%,
    100% {
        transform: translate(0, 0);
    }
    45% {
        transform: translate(0, -1.2px);
    }
}

@keyframes gestion-line-in {
    from {
        transform: scaleX(0.2);
        opacity: 0;
    }
    to {
        transform: scaleX(1);
        opacity: 1;
    }
}
</style>
