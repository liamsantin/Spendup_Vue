<script setup lang="ts">
import { ref } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useSidebarNav } from '../vertical-sidebar/useSidebarNav';
import { GridDotsIcon, Menu2Icon } from 'vue-tabler-icons';
import NotificationDD from './NotificationDD.vue';
import Navigations from './Navigations.vue';
import NewDD from './NewDD.vue';
import ProfileDD from './ProfileDD.vue';
import RightMobileSidebar from './RightMobileSidebar.vue';
import Searchbar from './Searchbar.vue';

const appSettings = useAppSettingsStore();
const { toggleContentSidebar } = useSidebarNav();
const appsdrawer = ref(false);
/** Après les deux drawers (order 0–1) pour que le header commence à droite de la sidebar menu. */
const HEADER_LAYOUT_ORDER = 2;
</script>

<template>
    <v-app-bar elevation="0" :order="HEADER_LAYOUT_ORDER" height="70">
        <v-btn class="hidden-lg-and-up" icon variant="flat" @click.stop="toggleContentSidebar" size="small">
            <Menu2Icon size="20" stroke-width="1.5" />
        </v-btn>

        <v-sheet>
            <Searchbar />
        </v-sheet>

        <NewDD class="ml-1" />

        <div class="hidden-md-and-down">
            <Navigations />
        </div>

        <v-spacer />

        <NotificationDD />

        <v-btn variant="text" color="primary" class="hidden-lg-and-up custom-hover-primary" icon @click.stop="appsdrawer = !appsdrawer">
            <GridDotsIcon size="17" stroke-width="1.5" />
        </v-btn>

        <div class="ml-2">
            <ProfileDD />
        </div>
    </v-app-bar>

    <v-navigation-drawer v-model="appsdrawer" location="right" temporary>
        <RightMobileSidebar @close="appsdrawer = false" />
    </v-navigation-drawer>
</template>
