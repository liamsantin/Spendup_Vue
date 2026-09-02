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
    <div class="theme-rail__inner d-flex flex-column align-center fill-height px-2 py-4">
        <div class="d-flex flex-column ga-2">
            <v-btn
                v-if="lgAndUp"
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
            <v-btn
                v-for="theme in themes"
                :key="theme.id"
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
        </div>
        <v-spacer />
        <v-btn icon variant="text" rounded="lg" size="48" class="theme-rail__btn" :aria-label="t('common.logout')" @click="authStore.logout()">
            <PowerIcon size="26" stroke-width="1.5" />
            <v-tooltip activator="parent" location="end">{{ t('common.logout') }}</v-tooltip>
        </v-btn>
    </div>
</template>
