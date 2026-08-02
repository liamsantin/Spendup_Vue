<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { Menu2Icon } from 'vue-tabler-icons';
import NotificationDD from './NotificationDD.vue';
import ProfileDD from './ProfileDD.vue';
import Searchbar from './Searchbar.vue';

const appSettings = useAppSettingsStore();
const priority = ref(appSettings.setHorizontalLayout ? 0 : 0);
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
            @click.stop="appSettings.SET_MINI_SIDEBAR(!appSettings.mini_sidebar)"
        >
            <Menu2Icon size="20" stroke-width="1.5" />
        </v-btn>
        <v-btn class="hidden-lg-and-up" icon variant="flat" @click.stop="appSettings.SET_SIDEBAR_DRAWER" size="small">
            <Menu2Icon size="20" stroke-width="1.5" />
        </v-btn>

        <v-sheet>
            <Searchbar />
        </v-sheet>

        <v-spacer />

        <NotificationDD />

        <div class="ml-2">
            <ProfileDD />
        </div>
    </v-app-bar>
</template>
