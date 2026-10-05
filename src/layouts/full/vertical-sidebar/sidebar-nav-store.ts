import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SidebarThemeId } from './sidebarItem';

export const useSidebarNavStore = defineStore('sidebar-nav', () => {
    const activeThemeId = ref<SidebarThemeId>('general');

    function reset() {
        activeThemeId.value = 'general';
    }

    return { activeThemeId, reset };
});
