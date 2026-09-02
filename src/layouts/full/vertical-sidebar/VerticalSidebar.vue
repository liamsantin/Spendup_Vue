<script setup lang="ts">
defineOptions({ name: 'VerticalSidebar' });

import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { useSidebarNav } from './useSidebarNav';

import NavGroup from './NavGroup/index.vue';
import NavItem from './NavItem/index.vue';
import NavCollapse from './NavCollapse/NavCollapse.vue';
import Logo from '../logo/Logo.vue';

const { sidebarMenu } = useSidebarNav();
</script>

<template>
    <div class="sidebar-nav">
        <div class="pa-5">
            <Logo />
        </div>
        <perfect-scrollbar class="scrollnavbar" :options="PERFECT_SCROLLBAR_OPTIONS">
            <v-list class="pa-6">
                <template v-for="(item, index) in sidebarMenu" :key="item.header || item.title || index">
                    <NavGroup :item="item" v-if="item.header" />
                    <NavCollapse class="leftPadding" :item="item" :level="0" v-else-if="item.children" />
                    <NavItem :item="item" v-else class="leftPadding" />
                </template>
            </v-list>
        </perfect-scrollbar>
    </div>
</template>
