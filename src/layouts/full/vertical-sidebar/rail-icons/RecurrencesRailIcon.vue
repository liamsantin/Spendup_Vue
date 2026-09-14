<script setup lang="ts">
defineOptions({ name: 'RecurrencesRailIcon' });

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
    <span class="recurrences-rail-icon-hit" @mouseenter="play" @mouseleave="stop">
        <RailIcon :size="size">
            <svg
                class="recurrences-rail-icon"
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
                <!-- Tone 1 : demi-cycle haut -->
                <g class="recurrences-arc recurrences-arc--top">
                    <path
                        d="M7.15 8.2A5.95 5.95 0 0 1 17.4 9.55"
                        stroke="currentColor"
                        stroke-width="1.5"
                    />
                    <path
                        d="M17.4 9.55 15.1 7.65M17.4 9.55l-1.7 2.3"
                        stroke="currentColor"
                        stroke-width="1.5"
                    />
                </g>

                <!-- Tone 2 : demi-cycle bas (thème) -->
                <g class="recurrences-arc recurrences-arc--bottom">
                    <path
                        class="rail-icon-tone"
                        d="M16.85 15.8A5.95 5.95 0 0 1 6.6 14.45"
                        stroke-width="1.5"
                    />
                    <path
                        class="rail-icon-tone"
                        d="M6.6 14.45 8.9 16.35M6.6 14.45l1.7-2.3"
                        stroke-width="1.5"
                    />
                </g>

                <!-- Point central -->
                <circle class="recurrences-core rail-icon-tone" cx="12" cy="12" r="1.45" fill="none" stroke-width="1.5" />
            </svg>
        </RailIcon>
    </span>
</template>

<style scoped lang="scss">
.recurrences-rail-icon-hit {
    display: inline-flex;
    line-height: 0;
}

.recurrences-rail-icon {
    display: block;
    overflow: visible;
}

.recurrences-arc,
.recurrences-core {
    transform-origin: 12px 12px;
}

.recurrences-rail-icon.is-playing {
    .recurrences-arc--top {
        animation: recurrences-spin 0.75s cubic-bezier(0.33, 1, 0.32, 1) 1;
    }

    .recurrences-arc--bottom {
        animation: recurrences-spin 0.75s cubic-bezier(0.33, 1, 0.32, 1) 1;
    }

    .recurrences-core {
        animation: recurrences-core-pulse 0.75s cubic-bezier(0.34, 1.25, 0.64, 1) 1;
    }
}

@keyframes recurrences-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

@keyframes recurrences-core-pulse {
    0%,
    100% {
        transform: scale(1);
    }
    45% {
        transform: scale(1.25);
    }
}
</style>
