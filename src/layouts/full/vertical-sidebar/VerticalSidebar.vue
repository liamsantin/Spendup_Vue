<script setup lang="ts">
import { shallowRef } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import sidebarItems from './sidebarItem';

import NavGroup from './NavGroup/index.vue';
import NavItem from './NavItem/index.vue';
import NavCollapse from './NavCollapse/NavCollapse.vue';
import Profile from './profile/Profile.vue';
import Logo from '../logo/Logo.vue';

const appSettings = useAppSettingsStore();
const sidebarMenu = shallowRef(sidebarItems);
</script>

<template>
    <v-navigation-drawer
        left
        v-model="appSettings.Sidebar_drawer"
        elevation="0"
        rail-width="75"
        app
        class="leftSidebar"
        :rail="appSettings.mini_sidebar"
        expand-on-hover
        width="270"
    >
        <!---Logo part -->

        <div class="pa-5">
            <Logo />
        </div>
        <!-- ---------------------------------------------- -->
        <!---Navigation -->
        <!-- ---------------------------------------------- -->
        <perfect-scrollbar class="scrollnavbar" :options="PERFECT_SCROLLBAR_OPTIONS">
            <v-list class="pa-6">
                <!---Menu Loop -->
                <template v-for="(item, index) in sidebarMenu" :key="item.header || item.title || index">
                    <!---Item Sub Header -->
                    <NavGroup :item="item" v-if="item.header" />
                    <!---If Has Child -->
                    <NavCollapse class="leftPadding" :item="item" :level="0" v-else-if="item.children" />
                    <!---Single Item-->
                    <NavItem :item="item" v-else class="leftPadding" />
                    <!---End Single Item-->
                </template>
            </v-list>
            <div class="pa-6 userbottom">
                <Profile />
            </div>
        </perfect-scrollbar>
    </v-navigation-drawer>
</template>
