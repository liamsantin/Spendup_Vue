import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SidebarThemeId } from './sidebarItem';

export const useSidebarNavStore = defineStore('sidebar-nav', () => {
    const activeThemeId = ref<SidebarThemeId>('spendup');

    function reset() {
        activeThemeId.value = 'spendup';
    }

    return { activeThemeId, reset };
});
