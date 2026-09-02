<script setup lang="ts">
defineOptions({ name: 'DualSidebar' });

import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { CONTENT_SIDEBAR_WIDTH, THEME_RAIL_WIDTH } from './sidebarItem';
import { useSidebarNav } from './useSidebarNav';
import ThemeRail from './ThemeRail.vue';
import VerticalSidebar from './VerticalSidebar.vue';

const appSettings = useAppSettingsStore();
const { lgAndUp } = useDisplay();
const route = useRoute();
const { syncThemeFromRoute } = useSidebarNav();

const megaWidth = THEME_RAIL_WIDTH + CONTENT_SIDEBAR_WIDTH;

if (appSettings.Sidebar_drawer === null) {
    appSettings.Sidebar_drawer = lgAndUp.value;
}

const menuOpen = computed({
    get: () => Boolean(appSettings.Sidebar_drawer),
    set: (open: boolean) => {
        appSettings.Sidebar_drawer = open;
    }
});

watch(
    () => route.path,
    (path, prev) => {
        syncThemeFromRoute(path);
        if (prev != null && !lgAndUp.value) {
            appSettings.Sidebar_drawer = false;
        }
    },
    { immediate: true }
);
</script>

<template>
    <template v-if="lgAndUp">
        <v-navigation-drawer
            location="left"
            permanent
            app
            disable-resize-watcher
            elevation="0"
            :order="0"
            :width="THEME_RAIL_WIDTH"
            class="theme-rail"
            name="theme-rail"
        >
            <ThemeRail />
        </v-navigation-drawer>

        <v-navigation-drawer
            location="left"
            app
            disable-resize-watcher
            elevation="0"
            :order="1"
            :width="CONTENT_SIDEBAR_WIDTH"
            class="leftSidebar"
            name="content-sidebar"
            v-model="menuOpen"
        >
            <VerticalSidebar />
        </v-navigation-drawer>
    </template>

    <v-navigation-drawer
        v-else
        location="left"
        temporary
        app
        disable-resize-watcher
        elevation="10"
        :width="megaWidth"
        class="mobile-dual-sidebar"
        name="mobile-dual-sidebar"
        v-model="menuOpen"
    >
        <div class="mobile-dual-sidebar__row">
            <div class="theme-rail theme-rail--embedded" :style="{ width: `${THEME_RAIL_WIDTH}px` }">
                <ThemeRail />
            </div>
            <div class="leftSidebar leftSidebar--embedded">
                <VerticalSidebar />
            </div>
        </div>
    </v-navigation-drawer>
</template>
