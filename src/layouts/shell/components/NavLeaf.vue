<script setup lang="ts">
import ShellNavIcon from './ShellNavIcon.vue';
import { useLinkTag } from '../composables/useLinkTag';
import type { NavLeaf } from '../types/navigation';

const props = defineProps<{
    leaf: NavLeaf;
    active?: boolean;
    /** Variante de la colonne de détail : un peu plus haute. */
    wide?: boolean;
}>();

const emit = defineEmits<{ select: [leaf: NavLeaf] }>();

const { tag, attrs } = useLinkTag(() => props.leaf);

function onSelect() {
    if (props.leaf.disabled) return;
    emit('select', props.leaf);
}
</script>

<template>
    <component
        :is="tag"
        v-bind="attrs"
        class="leaf"
        :class="{ 'is-active': active, 'leaf--wide': wide, 'is-disabled': leaf.disabled }"
        :aria-current="active && !leaf.disabled ? 'page' : undefined"
        :aria-disabled="leaf.disabled ? 'true' : undefined"
        :disabled="leaf.disabled || undefined"
        @click="onSelect"
    >
        <ShellNavIcon :icon="leaf.icon" :size="20" />
        <span class="leaf__label">{{ leaf.label }}</span>
        <span v-if="leaf.caption" class="leaf__caption">{{ leaf.caption }}</span>
    </component>
</template>

<style scoped>
.leaf {
    appearance: none;
    border: 0;
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 9px 14px;
    margin: 2px 0;
    border-radius: var(--radius-leaf);
    background: transparent;
    color: var(--ink-mute);
    font: inherit;
    font-size: 14.5px;
    font-weight: 500;
    white-space: nowrap;
    text-align: left;
    text-decoration: none;
    --rail-icon-tone-stroke: currentColor;
    /* replié, la ligne s'efface derrière son point sur le fil ; `visibility`
     la sort aussi de l'ordre de tabulation, ce que `opacity` ne fait pas. */
    visibility: hidden;
    opacity: 0;
    transform: translateX(-10px);
    transition:
        visibility 0s linear 0.45s,
        opacity 0.45s var(--ease),
        transform 0.5s var(--ease),
        background 0.2s var(--ease),
        color 0.18s var(--ease),
        box-shadow 0.2s var(--ease);
}
.leaf:hover {
    color: var(--ink);
    background: var(--surface-hover-soft);
}
.leaf.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.12);
    box-shadow: none;
}
.leaf.is-disabled {
    cursor: not-allowed;
    opacity: 0.55;
}
.leaf.is-disabled:hover {
    color: var(--ink-mute);
    background: transparent;
}
.leaf__caption {
    flex: none;
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ink-mute);
}
.leaf :deep(svg) {
    display: block;
    flex: none;
    color: inherit;
}
.leaf--wide {
    padding: 10px 14px;
}
.leaf__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* visible dès que la colonne est déployée : sous-onglets d'un accordéon ouvert,
   et lignes de la colonne de détail (toujours montées avec leur propre volet) */
.is-expanded .sub.is-open .leaf,
.is-expanded .leaf--wide {
    visibility: visible;
    opacity: 1;
    transform: none;
    transition-delay: 0s;
}
/* Le décalage en cascade ne porte que sur l'apparition. Appliqué à tout, il
   retardait aussi le fond et l'ombre : un clic sur le troisième sous-onglet
   restait 280 ms sans réaction avant de commencer son fondu. */
.is-expanded .sub.is-open .leaf {
    transition:
        visibility 0s linear calc(var(--i) * 60ms + 160ms),
        opacity 0.45s var(--ease) calc(var(--i) * 60ms + 160ms),
        transform 0.5s var(--ease) calc(var(--i) * 60ms + 160ms),
        background 0.2s var(--ease),
        color 0.18s var(--ease),
        box-shadow 0.2s var(--ease);
}

@media (max-width: 767px) {
    .leaf {
        padding: 12px 14px;
        font-size: 15.5px;
    }
    .leaf:hover {
        background: transparent;
    }
    .leaf.is-active:hover {
        background: rgba(var(--v-theme-primary), 0.12);
    }
}
</style>
