<script setup lang="ts">
/**
 * Accordion Spend.Up — en-tête cliquable + panneau dépliable.
 * Style verre : surface soft, chevron animé, pas de v-expansion-panels.
 */
defineOptions({ name: 'AppAccordion' });

import { computed } from 'vue';
import { ChevronDownIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        /** Titre de l’en-tête (ignoré si le slot `title` est fourni). */
        title?: string;
        /** Sous-titre optionnel sous le titre. */
        subtitle?: string;
        /** Désactive l’ouverture / fermeture. */
        disabled?: boolean;
    }>(),
    {
        title: '',
        subtitle: undefined,
        disabled: false
    }
);

const open = defineModel<boolean>({ default: false });

const expanded = computed(() => open.value === true);

function toggle() {
    if (props.disabled) return;
    open.value = !open.value;
}
</script>

<template>
    <section class="app-accordion" :class="{ 'is-open': expanded, 'is-disabled': disabled }">
        <button
            type="button"
            class="app-accordion__trigger"
            :aria-expanded="expanded"
            :disabled="disabled"
            @click="toggle"
        >
            <span class="app-accordion__lead">
                <span class="app-accordion__titles">
                    <span class="app-accordion__title">
                        <slot name="title">{{ title }}</slot>
                    </span>
                    <span v-if="subtitle || $slots.subtitle" class="app-accordion__subtitle">
                        <slot name="subtitle">{{ subtitle }}</slot>
                    </span>
                </span>
                <span v-if="$slots.extra" class="app-accordion__extra">
                    <slot name="extra" />
                </span>
            </span>
            <span class="app-accordion__chevron" aria-hidden="true">
                <ChevronDownIcon :size="18" stroke-width="1.75" />
            </span>
        </button>

        <div class="app-accordion__panel" :inert="!expanded">
            <div class="app-accordion__panel-inner">
                <div class="app-accordion__body">
                    <slot />
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.app-accordion {
    border-radius: var(--radius-leaf);
    border: 1px solid rgba(var(--v-theme-primary), 0.12);
    background: rgba(255, 255, 255, 0.55);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
    overflow: hidden;
    transition:
        border-color 0.35s var(--ease),
        box-shadow 0.4s var(--ease);
}

.app-accordion.is-open {
    border-color: rgba(var(--v-theme-primary), 0.16);
    box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.75) inset,
        0 10px 28px -18px rgba(var(--v-theme-primary), 0.28);
}

.app-accordion__trigger {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 12px 14px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.28s var(--ease);
}

.app-accordion__trigger:hover:not(:disabled) {
    background: rgba(var(--v-theme-primary), 0.04);
}

.app-accordion__trigger:disabled {
    cursor: default;
    opacity: 0.55;
}

.app-accordion__lead {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.app-accordion__titles {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.app-accordion__title {
    color: var(--ink);
    font-size: 14px;
    font-weight: 620;
    letter-spacing: -0.015em;
    line-height: 1.3;
}

.app-accordion__subtitle {
    color: var(--ink-muted);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.35;
}

.app-accordion__extra {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
}

.app-accordion__chevron {
    display: grid;
    flex: none;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: var(--ink-mute);
    background: rgba(var(--v-theme-primary), 0.06);
    transition:
        transform 0.45s var(--spring),
        color 0.3s var(--ease),
        background 0.3s var(--ease);
}

.app-accordion.is-open .app-accordion__chevron {
    transform: rotate(180deg);
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.12);
}

.app-accordion__panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.app-accordion.is-open .app-accordion__panel {
    grid-template-rows: 1fr;
}

.app-accordion__panel-inner {
    min-height: 0;
    overflow: hidden;
}

.app-accordion__body {
    padding: 0 14px 0;
    border-top: 1px solid transparent;
    opacity: 0;
    transform: translateY(-10px);
    filter: blur(2px);
    transition:
        opacity 0.22s ease,
        transform 0.28s cubic-bezier(0.4, 0, 1, 1),
        filter 0.22s ease,
        padding 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.3s ease;
}

.app-accordion.is-open .app-accordion__body {
    padding: 12px 14px 14px;
    border-top-color: rgba(var(--v-theme-primary), 0.08);
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
    transition:
        opacity 0.38s ease 0.08s,
        transform 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.04s,
        filter 0.35s ease 0.06s,
        padding 0.48s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.35s ease 0.05s;
}

@media (prefers-reduced-motion: reduce) {
    .app-accordion,
    .app-accordion__panel,
    .app-accordion__body,
    .app-accordion__chevron {
        transition-duration: 0.01ms !important;
        transition-delay: 0s !important;
    }

    .app-accordion__body {
        filter: none;
        transform: none;
    }
}
</style>
