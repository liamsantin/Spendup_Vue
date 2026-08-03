<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { useNotificationsStore } from '@/features/notifications';
import HorizontalItems, { type menu } from './horizontalItems';
import NavItem from './NavItem/Index.vue';
import NavCollapse from './NavCollapse/Index.vue';
import VerticalSidebar from '../vertical-sidebar/VerticalSidebar.vue';

const appSettings = useAppSettingsStore();
const notifications = useNotificationsStore();
const { mdAndUp } = useDisplay();

const sidebarMenu = computed<menu[]>(() =>
    HorizontalItems.map((item) => {
        if (item.to !== '/app/notifications') return item;
        const count = notifications.unreadCount;
        if (count <= 0) {
            return { ...item, chip: undefined };
        }
        return {
            ...item,
            chip: String(count),
            chipColor: item.chipColor ?? 'primary',
            chipVariant: item.chipVariant ?? 'flat'
        };
    })
);
</script>

<template>
    <template v-if="mdAndUp">
        <div class="horizontalMenu border-bottom">
            <div :class="appSettings.boxed ? 'maxWidth' : 'px-6'">
                <ul class="gap-1 horizontal-navbar mx-0">
                    <!---Menu Loop -->
                    <li v-for="(item, i) in sidebarMenu" :key="i" class="navItem">
                        <!---If Has Child -->
                        <NavCollapse :item="item" :level="0" v-if="item.children" />
                        <!---Single Item-->
                        <NavItem :item="item" v-else />
                        <!---End Single Item-->
                    </li>
                </ul>
            </div>
        </div>
    </template>
    <div v-else class="mobile-menu">
        <VerticalSidebar />
    </div>
</template>
<style lang="scss"></style>
