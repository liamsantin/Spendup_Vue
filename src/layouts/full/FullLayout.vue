<script setup lang="ts">
import { RouterView } from 'vue-router';
import DualSidebar from './vertical-sidebar/DualSidebar.vue';
import { THEME_RAIL_WIDTH } from './vertical-sidebar/sidebarItem';
import VerticalHeaderVue from './vertical-header/VerticalHeader.vue';
import HorizontalHeader from './horizontal-header/HorizontalHeader.vue';
import HorizontalSidebar from './horizontal-sidebar/HorizontalSidebar.vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useIdleLogout } from '@/features/auth/composables/useIdleLogout';
import StepUpDialog from '@/features/auth/components/StepUpDialog.vue';

const appSettings = useAppSettingsStore();
useIdleLogout();
</script>

<template>
    <v-locale-provider :locale="appSettings.locale">
        <v-app
            :theme="appSettings.actTheme"
            :style="{ '--theme-rail-width': `${THEME_RAIL_WIDTH}px` }"
            :class="[
                appSettings.actTheme,
                appSettings.setHorizontalLayout ? 'horizontalLayout' : 'verticalLayout',
                appSettings.setBorderCard ? 'cardBordered' : ''
            ]"
        >
            <DualSidebar v-if="!appSettings.setHorizontalLayout" />
            <VerticalHeaderVue v-if="!appSettings.setHorizontalLayout" />
            <HorizontalHeader v-if="appSettings.setHorizontalLayout" />
            <HorizontalSidebar v-if="appSettings.setHorizontalLayout" />

            <v-main id="main-content" tabindex="-1">
                <v-container fluid class="page-wrapper">
                    <div class="page-content" :class="appSettings.boxed ? 'maxWidth' : ''">
                        <RouterView />
                    </div>
                </v-container>
            </v-main>

            <StepUpDialog />
        </v-app>
    </v-locale-provider>
</template>
