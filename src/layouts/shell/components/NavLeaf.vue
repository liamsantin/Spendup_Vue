<script setup lang="ts">
import ShellNavIcon from './ShellNavIcon.vue';
import { useLinkTag } from '../composables/useLinkTag';
import type { NavLeaf } from '../types/navigation';

const props = defineProps<{
    leaf: NavLeaf;
    active?: boolean;
    /** Conservé pour compatibilité (colonne de détail) : même rendu. */
    wide?: boolean;
    /** Entrée imbriquée sous un sous-groupe : légèrement en retrait. */
    nested?: boolean;
    /** Rail replié : icône seule, centrée, le libellé passe en info-bulle. */
    compact?: boolean;
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
        :class="{ 'is-active': active, 'is-disabled': leaf.disabled, 'leaf--nested': nested, 'leaf--compact': compact }"
        :title="compact ? leaf.label : undefined"
        :aria-label="compact ? leaf.label : undefined"
        :aria-current="active && !leaf.disabled ? 'page' : undefined"
        :aria-disabled="leaf.disabled ? 'true' : undefined"
        :disabled="leaf.disabled || undefined"
        @click="onSelect"
    >
        <span class="leaf__icon"><ShellNavIcon :icon="leaf.icon" :size="16" /></span>
        <span v-if="!compact" class="leaf__label">{{ leaf.label }}</span>
        <span v-if="!compact && leaf.caption" class="leaf__caption">{{ leaf.caption }}</span>
        <span v-else-if="!compact && active" class="leaf__mark" aria-hidden="true" />
    </component>
</template>

<style scoped>
/* entrée 40 px, filet fin au-dessus, icône trait 16 px ; actif = 700 + icône bleue + carré bleu 6 px */
.leaf {
    appearance: none;
    border: 0;
    border-top: 1px solid var(--line);
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 40px;
    padding: 0;
    margin: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    text-align: left;
    text-decoration: none;
    transition:
        color 0.15s var(--ease),
        background 0.15s var(--ease);
}

.leaf:hover {
    background: var(--soft);
}

.leaf:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.leaf.is-active {
    font-weight: 700;
}

.leaf.is-active .leaf__icon {
    color: var(--blue);
}

.leaf.is-disabled {
    cursor: not-allowed;
    color: var(--gray);
}

.leaf.is-disabled:hover {
    background: transparent;
}

.leaf--nested {
    padding-left: 12px;
}

.leaf__icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    color: var(--ink-mute);
    --rail-icon-tone-stroke: currentColor;
}

.leaf__icon :deep(svg) {
    display: block;
    width: 16px;
    height: 16px;
    color: inherit;
}

.leaf__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.leaf__caption {
    flex: none;
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
}

.leaf__mark {
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

/* rail replié : l'entrée devient un carré de 40 px, icône centrée ; actif = icône bleue */
.leaf--compact {
    justify-content: center;
    gap: 0;
    padding: 0;
}

.leaf--compact.leaf--nested {
    padding-left: 0;
}

@media (max-width: 767px) {
    .leaf {
        min-height: 46px;
        font-size: 15px;
    }
    .leaf:hover {
        background: transparent;
    }
}
</style>
