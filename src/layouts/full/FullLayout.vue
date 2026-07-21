<script setup lang="ts">
import { RouterView } from 'vue-router';
import VerticalSidebarVue from './vertical-sidebar/VerticalSidebar.vue';
import VerticalHeaderVue from './vertical-header/VerticalHeader.vue';
import HorizontalHeader from './horizontal-header/HorizontalHeader.vue';
import HorizontalSidebar from './horizontal-sidebar/HorizontalSidebar.vue';
import Customizer from './customizer/Customizer.vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
const appSettings = useAppSettingsStore();
</script>

<template>
    <v-locale-provider>
        <v-app
            :theme="appSettings.actTheme"
            :class="[
                appSettings.actTheme,
                appSettings.mini_sidebar ? 'mini-sidebar' : '',
                appSettings.setHorizontalLayout ? 'horizontalLayout' : 'verticalLayout',
                appSettings.setBorderCard ? 'cardBordered' : ''
            ]"
        >
            <Customizer />
            <VerticalSidebarVue v-if="!appSettings.setHorizontalLayout" />
            <VerticalHeaderVue v-if="!appSettings.setHorizontalLayout" />
            <HorizontalHeader v-if="appSettings.setHorizontalLayout" />
            <HorizontalSidebar v-if="appSettings.setHorizontalLayout" />

            <v-main>
                <v-container fluid class="page-wrapper pb-sm-15 pb-10">
                    <div :class="appSettings.boxed ? 'maxWidth' : ''">
                        <RouterView />
                        <v-btn
                            class="customizer-btn"
                            size="large"
                            icon
                            variant="flat"
                            color="primary"
                            @click.stop="appSettings.SET_CUSTOMIZER_DRAWER(!appSettings.Customizer_drawer)"
                        >
                            <SettingsIcon />
                        </v-btn>
                    </div>
                </v-container>
            </v-main>
        </v-app>
    </v-locale-provider>
</template>
