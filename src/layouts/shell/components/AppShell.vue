<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import type { NavItem, NavLeaf } from '../types/navigation';

/**
 * Coquille de layout : sidebar + header + contenu.
 *
 * Elle porte la seule glu nécessaire (état d'ouverture partagé, colonnes, décor
 * de fond, adaptation mobile) pour qu'un projet n'ait qu'à poser
 * `<AppShell :items="…">contenu</AppShell>`. Le header peut être remplacé par le
 * slot `header`, qui reçoit l'état et l'action de bascule.
 */
withDefaults(
    defineProps<{
        items?: NavItem[];
        bottomItems?: NavItem[];
        title?: string;
        notifications?: number;
    }>(),
    { items: () => [], bottomItems: () => [], title: 'Menu', notifications: 0 }
);

/** Sidebar déployée. Exposé pour piloter le layout depuis l'application. */
const open = defineModel<boolean>('open', { default: false });
const openId = defineModel<string | null>('openId', { default: null });
const activeId = defineModel<string | null>('activeId', { default: null });
const search = defineModel<string>('search', { default: '' });

const emit = defineEmits<{
    select: [leaf: NavLeaf];
    'search-submit': [value: string];
}>();
</script>

<template>
    <div class="shell">
        <div class="shell__glow" />

        <div class="shell__aside">
            <AppSidebar
                v-model:open="open"
                v-model:open-id="openId"
                v-model:active-id="activeId"
                :items="items"
                :bottom-items="bottomItems"
                :title="title"
                @select="emit('select', $event)"
            />
        </div>

        <!-- header et contenu partagent la même colonne : le header se redimensionne
         donc au rythme du déploiement de la sidebar, sans code de synchronisation -->
        <div class="shell__main">
            <slot name="header" :open="open" :toggle="() => (open = !open)">
                <AppHeader
                    v-model:search="search"
                    :menu-open="open"
                    :notifications="notifications"
                    @toggle-menu="open = !open"
                    @search-submit="emit('search-submit', $event)"
                />
            </slot>

            <main id="main-content" class="shell__content" tabindex="-1">
                <slot />
            </main>
        </div>
    </div>
</template>

<style scoped>
.shell {
    position: relative;
    display: flex;
    height: 100dvh;
    min-height: 100vh;
    padding: 28px;
    gap: 20px;
    overflow: hidden;
    background:
        radial-gradient(1200px 700px at 12% -10%, #ffffff 0%, rgba(255, 255, 255, 0) 60%),
        linear-gradient(160deg, #f3f3f5 0%, #e9e9ee 48%, #dedee5 100%);
}

/* halo diffus derrière la sidebar, pour donner du relief au verre */
.shell__glow {
    position: absolute;
    top: -180px;
    left: -160px;
    width: 720px;
    height: 720px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 68%);
    pointer-events: none;
}

.shell__aside {
    position: relative;
    z-index: 2;
    height: calc(100vh - 56px);
}

.shell__main {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.shell__content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-ui);
    color: var(--ink);
}

.shell__content > :deep(.page-content) {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow: auto;
    padding: 4px 4px 8px;
}

@media (max-width: 767px) {
    .shell {
        padding: 14px;
        /* plus de rail dans le flux : le header occupe toute la largeur */
        gap: 0;
    }
    .shell__glow {
        top: -240px;
        left: -220px;
        width: 520px;
        height: 520px;
    }
    .shell__aside {
        width: 0;
        height: calc(100dvh - 28px);
    }
    .shell__main {
        gap: 12px;
    }
}
</style>
