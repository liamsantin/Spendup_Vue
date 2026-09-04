<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BurgerButton from './BurgerButton.vue';
import NewDD from '@/layouts/full/vertical-header/NewDD.vue';
import NotificationDD from '@/layouts/full/vertical-header/NotificationDD.vue';
import ProfileDD from '@/layouts/full/vertical-header/ProfileDD.vue';
import Searchbar from '@/layouts/full/vertical-header/Searchbar.vue';

withDefaults(
    defineProps<{
        /** État du menu, pour l'aspect et l'aria du burger. */
        menuOpen?: boolean;
        /** Conservé pour l'API du shell ; le badge vit dans NotificationDD. */
        notifications?: number;
        searchPlaceholder?: string;
        searchLabel?: string;
    }>(),
    { notifications: 0, searchPlaceholder: 'Rechercher…', searchLabel: 'Rechercher' }
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
        <BurgerButton class="brand" :open="menuOpen" :label="t('nav.toggleMenu')" @click="emit('toggle-menu')" />

        <div class="bar__tools">
            <Searchbar />
            <NewDD class="bar__new" />
        </div>

        <div class="bar__spacer" />

        <div class="bar__actions">
            <NotificationDD />
            <div class="bar__sep" />
            <ProfileDD />
        </div>
    </header>
</template>

<style scoped>
.bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
    height: var(--header-h);
    border-radius: var(--radius-header);
    padding: 0 12px;
    background: var(--surface);
    border: 1px solid var(--stroke);
    backdrop-filter: var(--blur);
    box-shadow: var(--shadow-rest);
    color: var(--ink);
    font-family: var(--font-ui);
    animation: bar-in 0.8s var(--ease) both;
}

@keyframes bar-in {
    from {
        opacity: 0;
        transform: translateY(-14px) scale(0.99);
    }
}

.bar__tools,
.bar__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
}

.bar__spacer {
    flex: 1;
    min-width: 0;
}

.bar__sep {
    width: 1px;
    height: 24px;
    margin: 0 6px;
    background: var(--hair);
}

.brand {
    display: none;
}

.bar :deep(.su-orb) {
    color: var(--ink-mute);
}

.bar :deep(.su-orb:hover) {
    color: var(--ink);
}

.bar__new :deep(.su-btn) {
    height: 40px;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 20px;
    font-size: 13.5px;
}

@media (max-width: 767px) {
    .bar {
        height: var(--header-h-mobile);
        border-radius: var(--radius-header-mobile);
        padding: 0 8px;
        gap: 2px;
    }

    .brand {
        display: grid;
        --burger-size: 40px;
    }

    .bar__sep {
        margin: 0 2px;
    }

    .bar__new :deep(.su-btn) {
        min-height: 36px;
        height: 36px;
        padding-inline: 12px;
    }
}
</style>
