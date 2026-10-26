<script setup lang="ts">
/**
 * Accordion Spend.Up — en-tête cliquable + panneau dépliable.
 * Style Swiss : filet 1 px au-dessus, titre 700, chevron trait, pas de v-expansion-panels.
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
        <button type="button" class="app-accordion__trigger" :aria-expanded="expanded" :disabled="disabled" @click="toggle">
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
                <ChevronDownIcon :size="18" stroke-width="1.6" />
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
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    overflow: hidden;
}

.app-accordion + .app-accordion {
    border-top: 0;
}

.app-accordion__trigger {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    margin: 0;
    padding: 10px 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s var(--ease);
}

.app-accordion__trigger:hover:not(:disabled) {
    background: var(--soft);
}

.app-accordion__trigger:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
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
    font-weight: 700;
    letter-spacing: -0.006em;
    line-height: 1.3;
}

.app-accordion__subtitle {
    color: var(--gray);
    font-size: 13px;
    font-weight: 400;
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
    color: var(--ink);
    transition: transform 0.2s var(--ease);
}

.app-accordion.is-open .app-accordion__chevron {
    transform: rotate(180deg);
}

.app-accordion__panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s var(--ease);
}

.app-accordion.is-open .app-accordion__panel {
    grid-template-rows: 1fr;
}

.app-accordion__panel-inner {
    min-height: 0;
    overflow: hidden;
}

.app-accordion__body {
    padding: 0;
    opacity: 0;
    transition:
        opacity 0.15s ease,
        padding 0.25s var(--ease);
}

.app-accordion.is-open .app-accordion__body {
    padding: 4px 0 16px;
    opacity: 1;
    transition:
        opacity 0.2s ease 0.05s,
        padding 0.25s var(--ease);
}

@media (prefers-reduced-motion: reduce) {
    .app-accordion__panel,
    .app-accordion__body,
    .app-accordion__chevron {
        transition-duration: 0.01ms !important;
        transition-delay: 0s !important;
    }
}
</style>
