<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BurgerButton from './BurgerButton.vue';
import HeaderSearch from './HeaderSearch.vue';
import HeaderShortcuts from './HeaderShortcuts.vue';
import type { NavItem, NavLeaf } from '../types/navigation';
import NewDD from '@/layouts/full/vertical-header/NewDD.vue';
import NotificationDD from '@/layouts/full/vertical-header/NotificationDD.vue';
import ProfileDD from '@/layouts/full/vertical-header/ProfileDD.vue';

/**
 * Header Swiss (72 px) : recherche · « + Nouveau » ··· raccourcis (calendrier, amis)
 * · cloche à pastille · séparateur · photo de profil. Filet 1 px noir en bas.
 */
withDefaults(
    defineProps<{
        /** État du menu, pour l'aspect et l'aria du burger (mobile). */
        menuOpen?: boolean;
        /** Conservé pour l'API du shell ; le badge vit dans NotificationDD. */
        notifications?: number;
        searchPlaceholder?: string;
        searchLabel?: string;
        headerLinks?: NavLeaf[];
        headerMenus?: NavItem[];
    }>(),
    {
        notifications: 0,
        searchPlaceholder: 'Rechercher…',
        searchLabel: 'Rechercher',
        headerLinks: () => [],
        headerMenus: () => []
    }
);

defineModel<string>('search', { default: '' });

const emit = defineEmits<{
    'toggle-menu': [];
    'search-submit': [value: string];
    'notifications-click': [];
    'account-click': [];
}>();

const { t } = useI18n();
</script>

<template>
    <header class="bar">
        <BurgerButton class="bar__burger" :open="menuOpen" :label="t('nav.toggleMenu')" @click="emit('toggle-menu')" />

        <HeaderSearch class="bar__search" />

        <!-- enveloppe : NewDD a plusieurs racines, une classe posée dessus serait ignorée -->
        <div class="bar__new-wrap">
            <NewDD class="bar__new" />
        </div>

        <div class="bar__spacer" />

        <div class="bar__actions">
            <HeaderShortcuts v-if="headerLinks.length || headerMenus.length" :links="headerLinks" :menus="headerMenus" />
            <NotificationDD />
            <div class="bar__sep" />
            <ProfileDD />
        </div>
    </header>
</template>

<style scoped>
.bar {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 24px;
    flex: none;
    height: var(--header-h);
    padding: 0 var(--content-pad-x);
    background: var(--bg);
    border-bottom: 1px solid var(--ink);
    color: var(--ink);
    font-family: var(--font-ui);
}

.bar__burger {
    display: none;
}

.bar__new-wrap {
    display: flex;
    align-items: center;
    flex: none;
}

.bar__spacer {
    flex: 1;
    min-width: 0;
}

.bar__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
}

.bar__sep {
    width: 1px;
    height: 28px;
    margin: 0 8px;
    background: var(--line);
}

.bar :deep(.su-orb) {
    color: var(--ink);
}

@media (max-width: 1199px) {
    .bar {
        padding: 0 32px;
        gap: 16px;
    }
}

@media (max-width: 767px) {
    .bar {
        height: var(--header-h-mobile);
        padding: 0 8px 0 4px;
        gap: 4px;
    }

    .bar__burger {
        display: grid;
    }

    /* « Nouveau » vit dans la barre d'onglets du bas (+) */
    .bar__new-wrap {
        display: none;
    }

    .bar__sep {
        margin: 0 2px;
    }
}
</style>
