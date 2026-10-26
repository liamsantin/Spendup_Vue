<script setup lang="ts">
import { computed, useId } from 'vue';
import BaseIcon from './BaseIcon.vue';
import NavLeaf from './NavLeaf.vue';
import ShellNavIcon from './ShellNavIcon.vue';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

/**
 * Groupe de navigation Swiss : libellé de groupe 12 px gris, puis entrées de 40 px
 * séparées par un filet fin. Une entrée sans enfants (Tableau de bord) est rendue
 * seule, sous son propre libellé. Les groupes annoncés (`muted`) sont repliables
 * et fermés par défaut ; en bas de colonne (`rowToggle`) le déclencheur prend la
 * forme d'une entrée (icône + libellé), façon « Paramètres ».
 */
const props = defineProps<{
    item: NavItem;
    /** Groupe déplié (groupes repliables uniquement). */
    open?: boolean;
    /** Feuille sélectionnée. */
    activeId?: string | null;
    /** Colonne déployée ; repliée, seules les icônes restent (libellés en info-bulle). */
    expanded?: boolean;
    index?: number;
    /** Libellé affiché au-dessus d'une entrée sans enfants. */
    groupLabel?: string;
    /** Déclencheur rendu comme une entrée de 40 px (icône + libellé) plutôt qu'un libellé de groupe. */
    rowToggle?: boolean;
}>();

const emit = defineEmits<{
    toggle: [item: NavItem];
    select: [leaf: NavLeafType];
}>();

const subId = useId();
const compact = computed(() => props.expanded === false);
const hasChildren = computed(() => !!props.item.children?.length);
const collapsible = computed(() => hasChildren.value && !!props.item.muted);
const isOpen = computed(() => !collapsible.value || !!props.open);
const childActive = computed(() => !!props.item.children?.some((child) => child.id === props.activeId));

function subLabel(index: number): string | null {
    const child = props.item.children?.[index];
    if (!child?.group) return null;
    const previous = props.item.children?.[index - 1];
    return previous?.group === child.group ? null : child.group;
}
</script>

<template>
    <li class="group" :class="{ 'is-muted': item.muted, 'is-open': isOpen, 'group--row': rowToggle, 'group--compact': compact }">
        <!-- libellé de groupe : texte simple, ou bouton quand le groupe est repliable.
             Rail replié : le bouton ne garde que son icône, le texte simple disparaît. -->
        <button
            v-if="collapsible"
            type="button"
            class="group__label group__label--toggle"
            :class="{ 'is-current': childActive }"
            :title="compact ? item.label : undefined"
            :aria-label="compact ? item.label : undefined"
            :aria-expanded="isOpen"
            :aria-controls="subId"
            @click="emit('toggle', item)"
        >
            <span v-if="rowToggle || compact" class="group__icon"><ShellNavIcon :icon="item.icon" :size="16" /></span>
            <template v-if="!compact">
                <span class="group__text">{{ item.label }}</span>
                <span v-if="item.badge" class="group__badge">{{ item.badge }}</span>
                <BaseIcon name="chevron-right" :size="14" class="group__chev" />
            </template>
        </button>
        <p v-else-if="!compact" class="group__label">
            <span class="group__text">{{ hasChildren ? item.label : (groupLabel ?? item.label) }}</span>
            <span v-if="item.badge" class="group__badge">{{ item.badge }}</span>
        </p>

        <!-- un seul enfant de grille : la hauteur 0fr se replie proprement -->
        <div :id="subId" class="group__fold" :inert="!isOpen || undefined" :aria-hidden="!isOpen || undefined">
            <ul v-if="hasChildren" class="group__list">
                <template v-for="(child, ci) in item.children" :key="child.id">
                    <li v-if="subLabel(ci) && !compact" class="group__sublabel">{{ subLabel(ci) }}</li>
                    <li>
                        <NavLeaf
                            :leaf="child"
                            :active="activeId === child.id"
                            :nested="!!child.group"
                            :compact="compact"
                            @select="emit('select', $event)"
                        />
                    </li>
                </template>
            </ul>
            <ul v-else class="group__list">
                <li>
                    <NavLeaf :leaf="item" :active="activeId === item.id" :compact="compact" @select="emit('select', $event)" />
                </li>
            </ul>
        </div>
    </li>
</template>

<style scoped>
.group {
    list-style: none;
    margin: 0;
    padding: 0;
}

.group + .group {
    margin-top: 20px;
}

.group__label {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0 0 8px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.2;
    text-align: left;
    cursor: default;
}

.group__text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group__label--toggle {
    cursor: pointer;
    min-height: 24px;
}

.group__label--toggle:hover {
    color: var(--ink);
}

.group__label--toggle:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.group__chev {
    flex: none;
    transition: transform 0.2s var(--ease);
}

.is-open .group__chev {
    transform: rotate(90deg);
}

.group__badge {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--blue);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
}

/* déclencheur-entrée (bas de colonne) : 40 px, icône 16 px, libellé 14 px noir */
.group--row .group__label--toggle {
    gap: 12px;
    min-height: 40px;
    margin: 0;
    color: var(--ink);
    font-size: 14px;
}

.group--row .group__label--toggle.is-current {
    font-weight: 700;
}

.group--row .group__label--toggle:hover {
    background: var(--soft);
}

.group__icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    color: var(--ink-mute);
    --rail-icon-tone-stroke: currentColor;
}

.group--row .is-current .group__icon,
.group--row .group__label--toggle.is-current .group__icon {
    color: var(--blue);
}

.group__icon :deep(svg) {
    display: block;
    width: 16px;
    height: 16px;
}

.group__fold {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.25s var(--ease);
}

.group:not(.is-open) .group__fold {
    grid-template-rows: 0fr;
}

.group__list {
    list-style: none;
    margin: 0;
    padding: 0;
    min-height: 0;
    overflow: hidden;
}

.group__list > li:last-child {
    border-bottom: 1px solid var(--line);
}

.group--row .group__list > li:last-child {
    border-bottom: 0;
}

.group__sublabel {
    padding: 12px 0 6px;
    color: var(--gray);
    font-size: 12px;
    border-top: 1px solid var(--line);
}

.group__sublabel + li :deep(.leaf) {
    border-top: 0;
}

/* ── rail replié : groupes séparés par l'espace, déclencheurs en carré de 40 px ── */
.group--compact + .group--compact {
    margin-top: 12px;
}

.group--compact .group__label--toggle {
    justify-content: center;
    gap: 0;
    min-height: 40px;
    margin: 0;
    color: var(--ink);
}

.group--compact .group__label--toggle:hover {
    background: var(--soft);
}

.group--compact .group__label--toggle.is-current .group__icon {
    color: var(--blue);
}
</style>
