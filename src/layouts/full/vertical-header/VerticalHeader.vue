<script setup lang="ts">
import { ref, watch } from 'vue';
import { useCustomizerStore } from '@/app/stores/app-settings-store';
import { GridDotsIcon, Menu2Icon } from 'vue-tabler-icons';
import NotificationDD from './NotificationDD.vue';
import ProfileDD from './ProfileDD.vue';
import Searchbar from './Searchbar.vue';
import RightMobileSidebar from './RightMobileSidebar.vue';
import Navigations from './Navigations.vue';
import ThemeToggler from './ThemeToggler.vue';

const customizer = useCustomizerStore();
const appsdrawer = ref(false);
const priority = ref(customizer.setHorizontalLayout ? 0 : 0);
watch(priority, (newPriority) => {
    priority.value = newPriority;
});
</script>

<template>
    <v-app-bar elevation="0" :priority="priority" height="70" class="">
        <v-btn
            class="hidden-md-and-down"
            icon
            color="primary"
            variant="text"
            @click.stop="customizer.SET_MINI_SIDEBAR(!customizer.mini_sidebar)"
        >
            <Menu2Icon size="20" stroke-width="1.5" />
        </v-btn>
        <v-btn class="hidden-lg-and-up" icon variant="flat" @click.stop="customizer.SET_SIDEBAR_DRAWER" size="small">
            <Menu2Icon size="20" stroke-width="1.5" />
        </v-btn>

        <v-sheet>
            <Searchbar />
        </v-sheet>

        <div class="hidden-md-and-down">
            <Navigations />
        </div>
        <v-spacer />

        <div class="me-2">
            <ThemeToggler />
        </div>

        <NotificationDD />

        <v-btn variant="text" color="primary" class="hidden-lg-and-up" icon @click.stop="appsdrawer = !appsdrawer">
            <GridDotsIcon size="17" stroke-width="1.5" />
        </v-btn>

        <div class="ml-2">
            <ProfileDD />
        </div>
    </v-app-bar>

    <v-navigation-drawer v-model="appsdrawer" location="right" temporary>
        <RightMobileSidebar />
    </v-navigation-drawer>
</template>
