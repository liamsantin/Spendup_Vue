<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { Menu2Icon } from 'vue-tabler-icons';
import Logo from '../logo/Logo.vue';
import NotificationDD from '../vertical-header/NotificationDD.vue';
import NewDD from '../vertical-header/NewDD.vue';
import ProfileDD from '../vertical-header/ProfileDD.vue';
import Searchbar from '../vertical-header/Searchbar.vue';

const appSettings = useAppSettingsStore();
const priority = ref(appSettings.setHorizontalLayout ? 0 : 0);
watch(priority, (newPriority) => {
    priority.value = newPriority;
});
</script>

<template>
    <v-app-bar elevation="10" :priority="priority" height="70" class="horizontal-header">
        <div :class="appSettings.boxed ? 'maxWidth v-toolbar__content' : 'v-toolbar__content px-6'">
            <div class="hidden-md-and-down">
                <Logo />
            </div>
            <v-btn class="hidden-lg-and-up ms-3" icon rounded="sm" variant="flat" @click.stop="appSettings.SET_SIDEBAR_DRAWER" size="small">
                <Menu2Icon size="20" stroke-width="1.5" />
            </v-btn>

            <v-sheet class="mx-2">
                <Searchbar />
            </v-sheet>

            <NewDD class="ml-1" />

            <v-spacer />

            <NotificationDD />

            <div class="ml-3 mr-sm-0 mr-3">
                <ProfileDD />
            </div>
        </div>
    </v-app-bar>
</template>
