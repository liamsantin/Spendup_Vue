<script setup lang="ts">
import { computed, useId } from 'vue';
import BaseIcon from './BaseIcon.vue';
import NavLeaf from './NavLeaf.vue';
import ShellNavIcon from './ShellNavIcon.vue';
import { useLinkTag } from '../composables/useLinkTag';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

const props = defineProps<{
    item: NavItem;
    /** L'onglet est celui qui est ouvert. */
    open?: boolean;
    /** Feuille sélectionnée, pour la surbrillance et le point du fil. */
    activeId?: string | null;
    /** La colonne est déployée : conditionne l'accessibilité, pas le style. */
    expanded?: boolean;
    /** Rang dans la liste, pour l'entrée en cascade des libellés. */
    index?: number;
}>();

const emit = defineEmits<{
    toggle: [item: NavItem];
    select: [leaf: NavLeafType];
}>();

const subId = useId();
const hasChildren = computed(() => !!props.item.children?.length);
/** Un onglet à sous-menu reste un bouton : son rôle est de déplier, pas de naviguer. */
const { tag, attrs } = useLinkTag(
    () => props.item,
    () => hasChildren.value
);
/** Ni focusable ni annoncé tant que l'accordéon est fermé ou la colonne repliée. */
const subHidden = computed(() => !props.expanded || !props.open || undefined);
</script>

<template>
    <li class="nav__row" :style="{ '--i': index ?? 0 }">
        <component
            :is="tag"
            v-bind="attrs"
            class="item"
            :class="{ 'is-open': open }"
            :title="expanded ? undefined : item.label"
            :aria-expanded="hasChildren ? !!open : undefined"
            :aria-controls="hasChildren ? subId : undefined"
            @click="emit('toggle', item)"
        >
            <span class="item__icon">
                <ShellNavIcon :icon="item.icon" />
                <span v-if="item.dot" class="item__dot" />
            </span>
            <span class="item__label">{{ item.label }}</span>
            <span v-if="item.badge" class="badge">{{ item.badge }}</span>
            <span v-else-if="hasChildren" class="item__chev">
                <BaseIcon :name="open ? 'minus' : 'plus'" :size="18" />
            </span>
            <span v-else-if="item.action" class="item__chev">
                <BaseIcon :name="item.action" :size="18" />
            </span>
        </component>

        <!-- sous-onglets : points sur le fil au repos, lignes une fois déployé -->
        <div v-if="hasChildren" :id="subId" class="sub" :class="{ 'is-open': open }" :inert="subHidden" :aria-hidden="subHidden">
            <ul class="sub__list">
                <li
                    v-for="(child, ci) in item.children"
                    :key="child.id"
                    class="sub__row"
                    :class="{ 'is-active': activeId === child.id }"
                    :style="{ '--i': ci }"
                >
                    <NavLeaf :leaf="child" :active="activeId === child.id" @select="emit('select', $event)" />
                </li>
            </ul>
        </div>
    </li>
</template>

<style scoped>
/* ── la ligne : bouton d'icône au repos, pilule pleine largeur déployée ── */
.item {
    appearance: none;
    border: 0;
    cursor: pointer;
    width: 100%;
    height: var(--slot);
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0;
    overflow: hidden;
    /* --radius-pill vaut --slot / 2 : cercle parfait tant que la ligne fait 44 px */
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 15px;
    font-weight: 520;
    letter-spacing: -0.01em;
    text-align: left;
    text-decoration: none;
    transition:
        background 0.42s var(--ease),
        color 0.3s var(--ease),
        box-shadow 0.42s var(--ease);
}
.item:hover {
    color: var(--ink);
    background: var(--surface-hover);
    box-shadow: var(--shadow-hover);
}
.item.is-open {
    background: rgb(var(--v-theme-primary));
    color: #fff;
    box-shadow: 0 14px 28px -16px rgba(var(--v-theme-primary), 0.7);
}
/* replié, la ligne courante reste la pastille du rail */
.sidebar:not(.is-expanded) .item.is-open {
    background: rgba(var(--v-theme-primary), 0.14);
    color: rgb(var(--v-theme-primary));
    box-shadow: var(--shadow-pill);
}

.item__icon {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: var(--slot);
    height: var(--slot);
    /* les icônes rail gardent leur accent aligné sur la couleur du texte */
    --rail-icon-tone-stroke: currentColor;
    /* le survol ne joue que sur transform : l'icône grossit sans quitter son centre */
    transition: transform 0.35s var(--spring);
}
.item__icon :deep(svg) {
    display: block;
    color: inherit;
}
.item:hover .item__icon {
    transform: scale(1.08);
}
.item__dot {
    position: absolute;
    top: 9px;
    right: 10px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

/* libellé, badge et chevron n'apparaissent qu'une fois la place libérée */
.item__label,
.item__chev,
.badge {
    opacity: 0;
    transition: opacity 0.42s var(--ease);
}
.is-expanded .item__label,
.is-expanded .badge {
    opacity: 1;
    transition-delay: calc(var(--i) * 38ms + 90ms);
}
.is-expanded .item__chev {
    opacity: 0.45;
    transition-delay: calc(var(--i) * 38ms + 90ms);
}
.is-expanded .item:hover .item__chev {
    opacity: 0.9;
}
.is-expanded .item.is-open .item__chev {
    opacity: 0.85;
}

.item__label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: translateX(-6px);
    transition:
        opacity 0.42s var(--ease),
        transform 0.55s var(--ease);
}
.is-expanded .item__label {
    transform: none;
}
/* le survol ne touche que l'icône : le libellé ne doit ni grossir ni bouger */

.item__chev {
    flex: none;
    display: grid;
    place-items: center;
    margin-right: 14px;
    transition:
        opacity 0.42s var(--ease),
        transform 0.45s var(--spring);
}
.item.is-open .item__chev {
    transform: rotate(180deg);
}

.badge {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 24px;
    height: 24px;
    margin-right: 14px;
    padding: 0 7px;
    border-radius: 12px;
    background: rgb(var(--v-theme-primary));
    color: #fff;
    font-size: 12px;
    font-weight: 600;
}
.item.is-open .badge {
    background: var(--surface-raised);
    color: var(--ink);
}

/* ── accordéon ─────────────────────────────────────────── */
.sub {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.6s var(--ease);
}
.sub.is-open {
    grid-template-rows: 1fr;
}
.sub__list {
    position: relative;
    overflow: hidden;
    list-style: none;
    margin: 0;
    padding: 0 0 0 26px;
}
/* le filet tombe pile sous le centre de l'icône parente */
.sub__list::before {
    content: '';
    position: absolute;
    left: calc(var(--slot) / 2);
    top: 8px;
    bottom: 14px;
    width: 1px;
    background: var(--thread);
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.6s var(--ease) 0.08s;
}
.sub.is-open .sub__list::before {
    transform: scaleY(1);
}

/* replié, chaque sous-onglet se résume à son point sur le fil */
.sub__row {
    position: relative;
}
.sub__row::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -6.5px;
    width: 5px;
    height: 5px;
    margin-top: -2.5px;
    border-radius: 50%;
    background: var(--thread-node);
    transition:
        opacity 0.35s var(--ease),
        background 0.3s,
        box-shadow 0.3s;
}
.sub__row.is-active::before {
    background: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 4px var(--hair);
}
.is-expanded .sub__row::before {
    opacity: 0;
}

@media (max-width: 767px) {
    /* cible tactile */
    .item {
        height: 48px;
    }
    /* pas d'état de survol au doigt */
    .item:hover {
        background: transparent;
        box-shadow: none;
    }
    .item:hover .item__icon {
        transform: none;
    }
    .item.is-open:hover {
        background: rgb(var(--v-theme-primary));
    }
}
</style>
