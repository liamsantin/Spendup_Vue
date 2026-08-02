<script setup lang="ts">
import { computed } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { MoonIcon, SunIcon } from 'vue-tabler-icons';

const appSettings = useAppSettingsStore();

/** Famille de couleur courante (BLUE, AQUA, …) d’après actTheme. */
const colorFamily = computed(() => appSettings.actTheme.replace(/^DARK_/, '').replace(/_THEME$/, '') || 'BLUE');

const lightTheme = computed(() => `${colorFamily.value}_THEME`);
const darkTheme = computed(() => `DARK_${colorFamily.value}_THEME`);

const themeColors = computed(() => [
    { name: lightTheme.value, bg: 'togglethemeBlue', icon: 'sun' as const },
    { name: darkTheme.value, bg: 'togglethemeDarkBlue', icon: 'moon' as const }
]);

function selectTheme(name: string) {
    appSettings.SET_THEME(name);
}
</script>

<template>
    <div class="position-relative">
        <div class="d-flex">
            <div v-for="theme in themeColors" :key="theme.name">
                <v-sheet rounded="circle" class="cursor-pointer text-center hover-btns" elevation="0" @click="selectTheme(theme.name)">
                    <v-btn
                        icon
                        :class="[theme.bg, appSettings.actTheme === theme.name ? 'text-primary' : '']"
                        class="custom-hover-primary"
                        size="small"
                        variant="text"
                        color="primary"
                    >
                        <SunIcon v-if="theme.icon === 'sun'" :class="theme.bg" height="22" />
                        <MoonIcon v-else :class="theme.bg" height="22" />
                    </v-btn>
                </v-sheet>
            </div>
        </div>
    </div>
</template>
