<script setup lang="ts">
defineOptions({ name: 'ThemeRail' });

import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { Menu2Icon, PowerIcon } from 'vue-tabler-icons';
import { useAuthStore } from '@/features/auth';
import { useSidebarNav } from './useSidebarNav';

const { t } = useI18n();
const { lgAndUp } = useDisplay();
const authStore = useAuthStore();
const { themes, activeThemeId, selectTheme, toggleContentSidebar } = useSidebarNav();
</script>

<template>
    <div class="theme-rail__inner">
        <div v-if="lgAndUp" class="theme-rail__brand">
            <v-btn
                icon
                variant="text"
                rounded="lg"
                size="48"
                class="theme-rail__btn"
                :aria-label="t('nav.toggleMenu')"
                @click="toggleContentSidebar"
            >
                <Menu2Icon size="26" stroke-width="1.5" />
            </v-btn>
        </div>
        <div class="theme-rail__themes" :class="{ 'theme-rail__themes--mobile': !lgAndUp }">
            <template v-for="theme in themes" :key="theme.id">
                <v-divider v-if="theme.dividerBefore" class="theme-rail__divider" />
                <v-btn
                    icon
                    variant="text"
                    rounded="lg"
                    size="48"
                    class="theme-rail__btn"
                    :class="{ 'theme-rail__btn--active': theme.id === activeThemeId }"
                    :aria-label="t(theme.title)"
                    :aria-pressed="theme.id === activeThemeId"
                    @click="selectTheme(theme.id)"
                >
                    <component :is="theme.icon" size="26" stroke-width="1.5" />
                    <v-tooltip activator="parent" location="end">{{ t(theme.title) }}</v-tooltip>
                </v-btn>
            </template>
        </div>
        <v-spacer />
        <v-btn icon variant="text" rounded="lg" size="48" class="theme-rail__btn" :aria-label="t('common.logout')" @click="authStore.logout()">
            <PowerIcon size="26" stroke-width="1.5" />
            <v-tooltip activator="parent" location="end">{{ t('common.logout') }}</v-tooltip>
        </v-btn>
    </div>
</template>
