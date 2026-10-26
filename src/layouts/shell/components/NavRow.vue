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
 *
 * Rail replié (`expanded = false`) : le groupe ne montre plus que l'icône de sa
 * section, en carré de 40 px ; libellé et liste restent dans le DOM et s'effacent
 * en opacité, pour que le repli glisse sans reconstruire la colonne.
 */
const props = defineProps<{
    item: NavItem;
    /** Groupe déplié (groupes repliables uniquement). */
    open?: boolean;
    /** Feuille sélectionnée. */
    activeId?: string | null;
    /** Colonne déployée ; repliée, seule l'icône de section reste. */
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
    /** Clic sur l'icône de section du rail replié. */
    tab: [item: NavItem];
}>();

const subId = useId();
const compact = computed(() => props.expanded === false);
const hasChildren = computed(() => !!props.item.children?.length);
const collapsible = computed(() => hasChildren.value && !!props.item.muted);
/* replié, toutes les listes se ferment : seule l'icône de section reste visible */
const isOpen = computed(() => !compact.value && (!collapsible.value || !!props.open));
const childActive = computed(() => !!props.item.children?.some((child) => child.id === props.activeId));
const sectionActive = computed(() => childActive.value || props.activeId === props.item.id);

function subLabel(index: number): string | null {
    const child = props.item.children?.[index];
    if (!child?.group) return null;
    const previous = props.item.children?.[index - 1];
    return previous?.group === child.group ? null : child.group;
}
</script>

<template>
    <li class="group" :class="{ 'is-muted': item.muted, 'is-open': isOpen, 'group--row': rowToggle, 'is-compact': compact }">
        <div class="group__head">
            <!-- icône de section : à gauche du libellé déployée, seule visible dans le rail replié -->
            <button
                type="button"
                class="group__tab"
                :class="{ 'is-current': sectionActive }"
                :title="item.label"
                :aria-label="item.label"
                :tabindex="compact ? 0 : -1"
                :aria-hidden="!compact || undefined"
                @click="emit('tab', item)"
            >
                <ShellNavIcon :icon="item.icon" :size="compact ? 18 : 16" />
            </button>

            <!-- libellé de groupe : texte simple, ou bouton quand le groupe est repliable -->
            <button
                v-if="collapsible"
                type="button"
                class="group__label group__label--toggle"
                :class="{ 'is-current': childActive }"
                :tabindex="compact ? -1 : 0"
                :aria-hidden="compact || undefined"
                :aria-expanded="isOpen"
                :aria-controls="subId"
                @click="emit('toggle', item)"
            >
                <span class="group__text">{{ item.label }}</span>
                <span v-if="item.badge" class="group__badge">{{ item.badge }}</span>
                <BaseIcon name="chevron-right" :size="14" class="group__chev" />
            </button>
            <p v-else class="group__label" :aria-hidden="compact || undefined">
                <span class="group__text">{{ hasChildren ? item.label : (groupLabel ?? item.label) }}</span>
                <span v-if="item.badge" class="group__badge">{{ item.badge }}</span>
            </p>
        </div>

        <!-- un seul enfant de grille : la hauteur 0fr se replie proprement -->
        <div :id="subId" class="group__fold" :inert="!isOpen || undefined" :aria-hidden="!isOpen || undefined">
            <ul v-if="hasChildren" class="group__list">
                <template v-for="(child, ci) in item.children" :key="child.id">
                    <li v-if="subLabel(ci)" class="group__sublabel">{{ subLabel(ci) }}</li>
                    <li>
                        <NavLeaf :leaf="child" :active="activeId === child.id" :nested="!!child.group" @select="emit('select', $event)" />
                    </li>
                </template>
            </ul>
            <ul v-else class="group__list">
                <li>
                    <NavLeaf :leaf="item" :active="activeId === item.id" @select="emit('select', $event)" />
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
    transition: margin-top var(--dur-expand) var(--ease);
}

/* l'en-tête porte l'icône de section et le libellé : déployé, l'icône (16 px) précède
   le texte ; replié, elle grandit en carré de 40 px et le libellé s'efface */
.group__head {
    position: relative;
    margin-bottom: 8px;
    min-height: 0;
    transition: min-height var(--dur-expand) var(--ease);
}

.group--row .group__head {
    margin-bottom: 0;
}

.group__tab {
    appearance: none;
    position: absolute;
    top: 50%;
    left: 0;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gray);
    cursor: pointer;
    transform: translateY(-50%);
    /* décoratif tant que la colonne est déployée : c'est le libellé qui agit */
    pointer-events: none;
    transition:
        width var(--dur-expand) var(--ease),
        height var(--dur-expand) var(--ease),
        color 0.15s var(--ease),
        background 0.15s var(--ease);
}

.group__tab :deep(svg) {
    display: block;
    --rail-icon-tone-stroke: currentColor;
}

.group--row .group__tab {
    color: var(--ink-mute);
}

.group__tab.is-current,
.group--row .group__tab.is-current {
    color: var(--blue);
}

/* survol du libellé repliable : l'icône fonce avec le texte */
.group__head:has(.group__label--toggle:hover) .group__tab:not(.is-current) {
    color: var(--ink);
}

.group__tab:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

.group__label {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    /* place de l'icône de section (16 px) et de son écart */
    padding: 0 0 0 24px;
    border: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.2;
    text-align: left;
    cursor: default;
    transition:
        opacity 0.2s var(--ease),
        visibility 0s linear 0s;
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
    padding-left: 28px;
    color: var(--ink);
    font-size: 14px;
}

.group--row .group__label--toggle.is-current {
    font-weight: 700;
}

.group--row .group__label--toggle:hover {
    background: var(--soft);
}

.group__fold {
    display: grid;
    grid-template-rows: 1fr;
    transition:
        grid-template-rows 0.25s var(--ease),
        opacity 0.2s var(--ease);
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

/* ── rail replié : l'icône de section remplace libellé et liste, sans changer le DOM ── */
.is-compact + .is-compact {
    margin-top: 4px;
}

.is-compact .group__head {
    min-height: 40px;
    margin-bottom: 0;
}

/* l'icône devient le bouton de la section : carré de 40 px, pictogramme 18 px, encre noire */
.is-compact .group__tab {
    width: 40px;
    height: 40px;
    color: var(--ink);
    pointer-events: auto;
}

.is-compact .group__tab.is-current {
    color: var(--blue);
}

.is-compact .group__tab:hover {
    background: var(--soft);
}

.is-compact .group__label {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
        opacity 0.15s var(--ease),
        visibility 0s linear 0.15s;
}

.is-compact .group__fold {
    opacity: 0;
}
</style>
