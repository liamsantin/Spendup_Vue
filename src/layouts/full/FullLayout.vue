<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useIdleLogout } from '@/features/auth/composables/useIdleLogout';
import StepUpDialog from '@/features/auth/components/StepUpDialog.vue';
import AppShell from '@/layouts/shell/components/AppShell.vue';
import { useShellNav } from '@/layouts/shell/composables/useShellNav';

const appSettings = useAppSettingsStore();
useIdleLogout();

const { open, openId, activeId, primaryNav, secondaryNav, unreadCount, title } = useShellNav();
</script>

<template>
    <v-locale-provider :locale="appSettings.locale">
        <v-app
            :theme="appSettings.actTheme"
            class="app-shell-host"
            :class="[appSettings.actTheme, appSettings.setBorderCard ? 'cardBordered' : '']"
        >
            <AppShell
                v-model:open="open"
                v-model:open-id="openId"
                v-model:active-id="activeId"
                :items="primaryNav"
                :bottom-items="secondaryNav"
                :notifications="unreadCount"
                :title="title"
            >
                <div class="page-content" :class="appSettings.boxed ? 'maxWidth' : ''">
                    <RouterView />
                </div>
            </AppShell>

            <StepUpDialog />
        </v-app>
    </v-locale-provider>
</template>

<style scoped>
.app-shell-host {
    background: transparent !important;
    height: 100%;
    overflow: hidden;
}

.app-shell-host :deep(.v-application__wrap) {
    min-height: 100vh;
    min-height: 100dvh;
    height: 100%;
    overflow: hidden;
}
</style>
