<script setup lang="ts">
import { computed, useId } from 'vue';
import BaseIcon from './BaseIcon.vue';
import NavLeaf from './NavLeaf.vue';
import ShellNavIcon from './ShellNavIcon.vue';
import { useLinkTag } from '../composables/useLinkTag';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

/**
 * Rangée de section Swiss, même comportement que l'ancienne colonne : icône 16 px,
 * libellé 14 px et chevron sur 40 px ; un clic déplie ses pages en accordéon (une
 * seule section ouverte à la fois, arbitrée par le parent). Une section sans
 * enfants (Tableau de bord) est un lien.
 *
 * Rail replié (`expanded = false`) : la rangée devient un carré de 40 px avec sa
 * seule icône ; libellé, chevron et liste restent dans le DOM et s'effacent en
 * opacité, pour que le repli glisse sans reconstruire la colonne. Un clic sur
 * l'icône redéploie la colonne sur cette section.
 */
const props = defineProps<{
    item: NavItem;
    /** Section dépliée. */
    open?: boolean;
    /** Feuille sélectionnée. */
    activeId?: string | null;
    /** Colonne déployée ; repliée, seule l'icône de section reste. */
    expanded?: boolean;
    index?: number;
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
/* replié, toutes les listes se ferment : seule l'icône de section reste visible */
const isOpen = computed(() => hasChildren.value && !!props.open && !compact.value);
const childActive = computed(() => !!props.item.children?.some((child) => child.id === props.activeId));
const isCurrent = computed(() => childActive.value || props.activeId === props.item.id);
/** Une section à sous-menu reste un bouton : son rôle est de déplier, pas de naviguer. */
const { tag, attrs } = useLinkTag(
    () => props.item,
    () => hasChildren.value
);

function onRowClick() {
    if (compact.value) {
        emit('tab', props.item);
        return;
    }
    if (hasChildren.value) {
        emit('toggle', props.item);
        return;
    }
    if (!props.item.disabled) emit('select', props.item);
}
</script>

<template>
    <li class="group" :class="{ 'is-open': isOpen, 'is-compact': compact, 'is-muted': item.muted }">
        <component
            :is="tag"
            v-bind="attrs"
            class="row"
            :class="{ 'is-current': isCurrent, 'is-disabled': item.disabled }"
            :title="compact ? item.label : undefined"
            :aria-label="compact ? item.label : undefined"
            :aria-expanded="hasChildren && !compact ? isOpen : undefined"
            :aria-controls="hasChildren ? subId : undefined"
            :aria-current="!hasChildren && isCurrent && !item.disabled ? 'page' : undefined"
            :aria-disabled="item.disabled ? 'true' : undefined"
            @click="onRowClick"
        >
            <span class="row__icon"><ShellNavIcon :icon="item.icon" :size="compact ? 18 : 16" /></span>
            <span class="row__label">{{ item.label }}</span>
            <span v-if="item.badge" class="row__badge">{{ item.badge }}</span>
            <span v-else-if="item.caption" class="row__caption">{{ item.caption }}</span>
            <BaseIcon v-else-if="hasChildren" name="chevron-right" :size="14" class="row__chev" />
            <span v-else-if="isCurrent" class="row__mark" aria-hidden="true" />
        </component>

        <!-- un seul enfant de grille : la hauteur 0fr se replie proprement -->
        <div v-if="hasChildren" :id="subId" class="fold" :inert="!isOpen || undefined" :aria-hidden="!isOpen || undefined">
            <ul class="fold__list">
                <li v-for="child in item.children" :key="child.id">
                    <NavLeaf :leaf="child" :active="activeId === child.id" @select="emit('select', $event)" />
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
    transition: margin-top var(--dur-expand) var(--ease);
}

/* les rangées se suivent, séparées par un filet fin */
.group + .group .row {
    border-top-color: var(--line);
}

.row {
    appearance: none;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 40px;
    margin: 0;
    padding: 0;
    border: 0;
    border-top: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.2;
    text-align: left;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
        padding-left var(--dur-expand) var(--ease),
        border-color 0.2s var(--ease),
        background 0.15s var(--ease),
        color 0.15s var(--ease);
}

.row:hover {
    background: var(--soft);
}

.row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

/* section de la page courante : graisse 700, icône bleue */
.row.is-current {
    font-weight: 700;
}

.row.is-current .row__icon {
    color: var(--blue);
}

.row.is-disabled {
    cursor: not-allowed;
    color: var(--gray);
}

.row.is-disabled:hover {
    background: transparent;
}

/* section annoncée : en retrait, en gris */
.is-muted .row {
    color: var(--gray);
}

.row__icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    color: var(--ink-mute);
    --rail-icon-tone-stroke: currentColor;
    transition:
        width var(--dur-expand) var(--ease),
        height var(--dur-expand) var(--ease),
        color 0.15s var(--ease);
}

.is-muted .row__icon {
    color: var(--gray);
}

.row__icon :deep(svg) {
    display: block;
}

.row__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.row__caption {
    flex: none;
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
}

.row__chev {
    flex: none;
    color: var(--gray);
    transition:
        transform 0.2s var(--ease),
        opacity 0.2s var(--ease);
}

.is-open .row__chev {
    transform: rotate(90deg);
}

.row__badge {
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

.row__mark {
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

/* ce qui n'est pas l'icône s'efface au repli, et revient après l'élargissement */
.row__label,
.row__caption,
.row__chev,
.row__badge,
.row__mark {
    transition:
        opacity 0.2s var(--ease) 0.1s,
        visibility 0s linear 0s;
}

.fold {
    display: grid;
    grid-template-rows: 0fr;
    transition:
        grid-template-rows 0.25s var(--ease),
        opacity 0.2s var(--ease);
}

.is-open .fold {
    grid-template-rows: 1fr;
}

/* pages de la section, en retrait de l'icône */
.fold__list {
    list-style: none;
    margin: 0;
    padding: 0 0 0 28px;
    min-height: 0;
    overflow: hidden;
}

/* ── rail replié : l'icône seule, en carré de 40 px, sans changer le DOM ── */
.is-compact + .is-compact {
    margin-top: 4px;
}

.is-compact .row {
    /* (40 − 18) / 2 : l'icône est centrée dans le carré */
    padding-left: 11px;
    border-top-color: transparent;
}

.is-compact .row__icon {
    width: 18px;
    height: 18px;
    color: var(--ink);
}

.is-compact .row.is-current .row__icon {
    color: var(--blue);
}

.is-compact .row__label,
.is-compact .row__caption,
.is-compact .row__chev,
.is-compact .row__badge,
.is-compact .row__mark {
    opacity: 0;
    visibility: hidden;
    transition:
        opacity 0.15s var(--ease),
        visibility 0s linear 0.15s;
}

.is-compact .fold {
    opacity: 0;
}

@media (max-width: 767px) {
    .row {
        min-height: 46px;
        font-size: 15px;
    }
    .row:hover {
        background: transparent;
    }
}
</style>
