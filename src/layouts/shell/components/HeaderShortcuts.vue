<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';
import { useHeaderMenuOverlay } from '@/layouts/full/vertical-header/useHeaderMenuOverlay';
import ShellNavIcon from './ShellNavIcon.vue';
import type { NavItem, NavLeaf } from '../types/navigation';

withDefaults(
    defineProps<{
        links?: NavLeaf[];
        menus?: NavItem[];
    }>(),
    { links: () => [], menus: () => [] }
);

const { t } = useI18n();
const route = useRoute();
const { scrim, opacity } = useHeaderMenuOverlay();
const openMenuId = ref<string | null>(null);

function pathOf(leaf: NavLeaf): string {
    return typeof leaf.to === 'string' ? leaf.to : '';
}

function isCurrent(leaf: NavLeaf): boolean {
    const path = pathOf(leaf);
    if (!path) return false;
    return route.path === path || route.path.startsWith(`${path}/`);
}

function menuCurrent(menu: NavItem): boolean {
    return (menu.children ?? []).some((leaf) => isCurrent(leaf));
}

function onMenuToggle(id: string, open: boolean) {
    if (open) openMenuId.value = id;
    else if (openMenuId.value === id) openMenuId.value = null;
}
</script>

<template>
    <nav class="shortcuts" :aria-label="t('nav.shortcuts')">
        <RouterLink
            v-for="link in links"
            :key="link.id"
            class="su-orb"
            :class="{ 'is-current': isCurrent(link) }"
            :to="link.to ?? '/app'"
            :aria-label="link.label"
            :title="link.label"
            :aria-current="isCurrent(link) ? 'page' : undefined"
        >
            <ShellNavIcon :icon="link.icon" :size="20" />
        </RouterLink>

        <v-menu
            v-for="menu in menus"
            :key="menu.id"
            :model-value="openMenuId === menu.id"
            location="bottom end"
            :scrim="scrim"
            :opacity="opacity"
            :close-on-content-click="true"
            @update:model-value="onMenuToggle(menu.id, $event)"
        >
            <template #activator="{ props: menuProps }">
                <button
                    type="button"
                    class="su-orb"
                    :class="{ 'is-current': menuCurrent(menu) }"
                    v-bind="menuProps"
                    :aria-label="menu.label"
                    :title="menu.label"
                    :aria-expanded="openMenuId === menu.id"
                >
                    <ShellNavIcon :icon="menu.icon" :size="20" />
                </button>
            </template>
            <v-sheet class="su-menu shortcuts__menu" rounded="0" width="280" elevation="0">
                <p class="shortcuts__title">{{ menu.label }}</p>
                <component
                    :is="leaf.disabled || !leaf.to ? 'span' : RouterLink"
                    v-for="leaf in menu.children"
                    :key="leaf.id"
                    class="shortcuts__link"
                    :class="{ 'is-active': isCurrent(leaf), 'is-disabled': leaf.disabled }"
                    :to="leaf.disabled ? undefined : leaf.to"
                    :aria-current="isCurrent(leaf) && !leaf.disabled ? 'page' : undefined"
                    :aria-disabled="leaf.disabled ? 'true' : undefined"
                >
                    <ShellNavIcon :icon="leaf.icon" :size="16" />
                    <span class="shortcuts__label">{{ leaf.label }}</span>
                    <span v-if="leaf.caption" class="shortcuts__caption">{{ leaf.caption }}</span>
                </component>
            </v-sheet>
        </v-menu>
    </nav>
</template>

<style scoped>
.shortcuts {
    display: flex;
    align-items: center;
    gap: 4px;
}

.su-orb.is-current {
    color: var(--blue-ink);
    box-shadow: inset 0 -2px 0 var(--ink);
}

@media (max-width: 767px) {
    .su-orb {
        width: 36px;
        height: 36px;
    }
}

.shortcuts__menu {
    padding: 8px !important;
}

.shortcuts__title {
    margin: 4px 10px 6px;
    color: var(--gray);
    font-size: 12px;
}

.shortcuts__link {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 40px;
    padding: 0 10px;
    border-top: 1px solid var(--line);
    color: var(--ink);
    font-size: 14px;
    text-decoration: none;
    --rail-icon-tone-stroke: currentColor;
}

.shortcuts__link:hover {
    background: var(--soft);
}

.shortcuts__link.is-active {
    font-weight: 700;
}

.shortcuts__link.is-active::after {
    content: '';
    margin-left: auto;
    width: 6px;
    height: 6px;
    background: var(--blue);
}

.shortcuts__link.is-disabled {
    color: var(--gray);
    pointer-events: none;
}

.shortcuts__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.shortcuts__caption {
    margin-left: auto;
    color: var(--gray);
    font-size: 12px;
}
</style>
