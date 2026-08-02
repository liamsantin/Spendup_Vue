<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import {
    CheckIcon,
    LayoutColumnsIcon,
    LayoutDistributeHorizontalIcon,
    LayoutDistributeVerticalIcon,
    LayoutNavbarIcon,
    LayoutSidebarIcon,
    LayoutSidebarLeftCollapseIcon,
    PaletteIcon,
    LayoutIcon
} from 'vue-tabler-icons';

type SettingsSnapshot = {
    actTheme: string;
    boxed: boolean;
    mini_sidebar: boolean;
    setHorizontalLayout: boolean;
    setBorderCard: boolean;
};

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

const baseline = ref<SettingsSnapshot | null>(null);
const saving = ref(false);

function takeSnapshot(): SettingsSnapshot {
    return appSettings.snapshot();
}

function snapshotsEqual(a: SettingsSnapshot, b: SettingsSnapshot) {
    return (
        a.actTheme === b.actTheme &&
        a.boxed === b.boxed &&
        a.mini_sidebar === b.mini_sidebar &&
        a.setHorizontalLayout === b.setHorizontalLayout &&
        a.setBorderCard === b.setBorderCard
    );
}

const isDirty = computed(() => {
    if (!baseline.value) return false;
    return !snapshotsEqual(takeSnapshot(), baseline.value);
});

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

onMounted(() => {
    baseline.value = takeSnapshot();
});

function saveSettings() {
    if (saving.value || !isDirty.value) return;
    saving.value = true;
    try {
        appSettings.persist();
        baseline.value = takeSnapshot();
    } finally {
        saving.value = false;
    }
}

function resetSettings() {
    if (!baseline.value || saving.value) return;
    appSettings.applySnapshot(baseline.value);
}

defineExpose({
    saveSettings,
    resetSettings,
    get loading() {
        return saving.value;
    },
    get isDirty() {
        return isDirty.value;
    }
});
</script>

<template>
    <div class="theme-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <PaletteIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Thème</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Choisissez la couleur principale de l’interface (clair ou sombre).
                        </div>

                        <h6 class="text-h6 mt-2 mb-5">Couleur du thème</h6>
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
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <LayoutIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">Mise en page</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            Personnalisez la disposition de la barre latérale, du conteneur et des cartes.
                        </div>

                        <h6 class="text-h6 mt-2 mb-2">Disposition de la barre latérale</h6>
                        <v-btn-toggle
                            v-model="appSettings.setHorizontalLayout"
                            color="primary"
                            class="my-2 btn-group-custom"
                            rounded="0"
                            group
                        >
                            <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                                <LayoutColumnsIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                Verticale
                            </v-btn>
                            <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                                <LayoutNavbarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                Horizontale
                            </v-btn>
                        </v-btn-toggle>

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
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.theme-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
