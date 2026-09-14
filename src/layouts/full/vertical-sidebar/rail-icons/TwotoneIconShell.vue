<script setup lang="ts">
defineOptions({ name: 'TwotoneIconShell' });

withDefaults(defineProps<{ size?: number }>(), { size: 24 });
</script>

<template>
    <span class="icon-wrapper" :style="{ '--icon-size': `${size}px` }">
        <slot />
    </span>
</template>

<style scoped lang="scss">
.icon-wrapper {
    --icon-ease: cubic-bezier(0.4, 0, 0.2, 1);
    --icon-duration: 220ms;

    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--icon-size, 24px);
    height: var(--icon-size, 24px);
    color: inherit;
    border-radius: 8px;
    outline: none;
    transition: transform var(--icon-duration) var(--icon-ease);

    /* Cible tactile ≥ 44×44 sans décaler le layout */
    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: max(100%, 44px);
        height: max(100%, 44px);
        translate: -50% -50%;
    }

    :deep(svg) {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
        color: inherit;
    }

    :deep(.icon-fill) {
        fill: currentColor;
        stroke: none;
        opacity: 0.2;
        transform-box: fill-box;
        transform-origin: center;
        transition:
            opacity var(--icon-duration) var(--icon-ease),
            transform var(--icon-duration) var(--icon-ease);
    }

    :deep(.icon-stroke) {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    :deep(.icon-detail) {
        transform-box: fill-box;
        transform-origin: center;
        transition: transform var(--icon-duration) var(--icon-ease);
    }

    :deep(.icon-detail--orbit) {
        transform-box: view-box;
        transform-origin: 12px 12px;
    }

    &:hover,
    &:focus-visible {
        :deep(.icon-fill) {
            opacity: 0.35;
            transform: scale(1.06);
        }

        :deep(.icon-detail--back) {
            transform: translate(-0.6px, 0.7px);
        }

        :deep(.icon-detail--lines) {
            transform: translateX(0.85px);
        }

        :deep(.icon-detail--sheet) {
            transform: translateY(-1.35px);
        }

        :deep(.icon-detail--orbit) {
            transform: rotate(28deg);
        }
    }

    &:active {
        transform: scale(0.96);
    }

    &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .icon-wrapper {
        transition: none;

        &:active {
            transform: none;
        }

        :deep(.icon-fill),
        :deep(.icon-detail) {
            transition: opacity var(--icon-duration) var(--icon-ease);
        }

        &:hover,
        &:focus-visible {
            :deep(.icon-fill) {
                opacity: 0.35;
                transform: none;
            }

            :deep(.icon-detail--back),
            :deep(.icon-detail--lines),
            :deep(.icon-detail--sheet),
            :deep(.icon-detail--orbit) {
                transform: none;
            }
        }
    }
}
</style>
