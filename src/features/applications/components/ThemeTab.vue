<script setup lang="ts">
import { ref } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import {
    CheckIcon,
    LayoutColumnsIcon,
    LayoutDistributeHorizontalIcon,
    LayoutDistributeVerticalIcon,
    LayoutNavbarIcon,
    LayoutSidebarIcon,
    LayoutSidebarLeftCollapseIcon
} from 'vue-tabler-icons';

const appSettings = useAppSettingsStore();

const themeColors = ref([
    { name: 'BLUE_THEME', bg: 'themeBlue' },
    { name: 'AQUA_THEME', bg: 'themeAqua' },
    { name: 'PURPLE_THEME', bg: 'themePurple' },
    { name: 'GREEN_THEME', bg: 'themeGreen' },
    { name: 'CYAN_THEME', bg: 'themeCyan' },
    { name: 'ORANGE_THEME', bg: 'themeOrange' }
]);

const DarkthemeColors = ref([
    { name: 'DARK_BLUE_THEME', bg: 'themeDarkBlue' },
    { name: 'DARK_AQUA_THEME', bg: 'themeDarkAqua' },
    { name: 'DARK_PURPLE_THEME', bg: 'themeDarkPurple' },
    { name: 'DARK_GREEN_THEME', bg: 'themeDarkGreen' },
    { name: 'DARK_CYAN_THEME', bg: 'themeDarkCyan' },
    { name: 'DARK_ORANGE_THEME', bg: 'themeDarkOrange' }
]);
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <h5 class="text-h5">Apparence</h5>
            <div class="text-subtitle-1 text-medium-emphasis mt-2">Personnalisez le thème et la mise en page de l’application.</div>

            <h6 class="text-h6 mt-8 mb-2">Disposition de la barre latérale</h6>
            <v-btn-toggle v-model="appSettings.setHorizontalLayout" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                    <LayoutColumnsIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Verticale
                </v-btn>
                <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                    <LayoutNavbarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Horizontale
                </v-btn>
            </v-btn-toggle>

            <h6 class="text-h6 mt-8 mb-5">Couleur du thème</h6>
            <v-item-group mandatory v-model="appSettings.actTheme" class="ml-n2 v-row">
                <v-col cols="4" sm="2" v-for="theme in themeColors" :key="theme.name" class="pa-2">
                    <v-item v-slot="{ isSelected, toggle }" :value="theme.name">
                        <v-sheet
                            rounded="md"
                            class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                            elevation="9"
                            @click="toggle"
                        >
                            <v-avatar :class="theme.bg" size="25">
                                <CheckIcon color="white" size="18" v-if="isSelected" />
                            </v-avatar>
                        </v-sheet>
                    </v-item>
                </v-col>
            </v-item-group>

            <h6 class="text-h6 mt-8 mb-5">Couleur du thème sombre</h6>
            <v-item-group mandatory v-model="appSettings.actTheme" class="ml-n2 v-row">
                <v-col cols="4" sm="2" v-for="theme in DarkthemeColors" :key="theme.name" class="pa-2">
                    <v-item v-slot="{ isSelected, toggle }" :value="theme.name">
                        <v-sheet
                            rounded="md"
                            class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                            elevation="9"
                            @click="toggle"
                        >
                            <v-avatar :class="theme.bg" size="25">
                                <CheckIcon color="white" size="18" v-if="isSelected" />
                            </v-avatar>
                        </v-sheet>
                    </v-item>
                </v-col>
            </v-item-group>

            <h6 class="text-h6 mt-8 mb-2">Conteneur</h6>
            <v-btn-toggle v-model="appSettings.boxed" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                <v-btn :value="true" variant="text" elevation="9" class="rounded-md">
                    <LayoutDistributeVerticalIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Encadré
                </v-btn>
                <v-btn :value="false" variant="text" elevation="9" class="rounded-md ml-4">
                    <LayoutDistributeHorizontalIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Plein
                </v-btn>
            </v-btn-toggle>

            <h6 class="text-h6 mt-8 mb-2">Type de barre latérale</h6>
            <v-btn-toggle v-model="appSettings.mini_sidebar" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                    <LayoutSidebarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Complète
                </v-btn>
                <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                    <LayoutSidebarLeftCollapseIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Réduite
                </v-btn>
            </v-btn-toggle>

            <h6 class="text-h6 mt-8 mb-2">Cartes</h6>
            <v-btn-toggle v-model="appSettings.setBorderCard" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                    <LayoutSidebarLeftCollapseIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Ombre
                </v-btn>
                <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                    <LayoutSidebarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                    Bordure
                </v-btn>
            </v-btn-toggle>
        </v-card-item>
    </v-card>
</template>
