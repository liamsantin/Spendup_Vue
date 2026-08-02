<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppSettingsStore, type PersistedSettings } from '@/app/stores/app-settings-store';
import { DARK_THEME_OPTIONS, LIGHT_THEME_OPTIONS } from '@/features/applications/themeOptions';
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

type ThemeSnapshot = PersistedSettings;

const { t } = useI18n();
const appSettings = useAppSettingsStore();

const themeColors = LIGHT_THEME_OPTIONS;
const DarkthemeColors = DARK_THEME_OPTIONS;

const baseline = ref<ThemeSnapshot | null>(null);
const saving = ref(false);

function takeSnapshot(): ThemeSnapshot {
    return appSettings.snapshot();
}

function snapshotsEqual(a: ThemeSnapshot, b: ThemeSnapshot) {
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
                            <h4 class="text-h4 mb-0">{{ t('applications.theme.title') }}</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            {{ t('applications.theme.subtitle') }}
                        </div>

                        <h6 class="text-h6 mt-2 mb-5">{{ t('applications.theme.lightColors') }}</h6>
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

                        <h6 class="text-h6 mt-8 mb-5">{{ t('applications.theme.darkColors') }}</h6>
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
                            <h4 class="text-h4 mb-0">{{ t('applications.layout.title') }}</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            {{ t('applications.layout.subtitle') }}
                        </div>

                        <h6 class="text-h6 mt-2 mb-2">{{ t('applications.layout.sidebarOrientation') }}</h6>
                        <v-btn-toggle
                            v-model="appSettings.setHorizontalLayout"
                            color="primary"
                            class="my-2 btn-group-custom"
                            rounded="0"
                            group
                        >
                            <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                                <LayoutColumnsIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.vertical') }}
                            </v-btn>
                            <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                                <LayoutNavbarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.horizontal') }}
                            </v-btn>
                        </v-btn-toggle>

                        <h6 class="text-h6 mt-8 mb-2">{{ t('applications.layout.container') }}</h6>
                        <v-btn-toggle v-model="appSettings.boxed" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                            <v-btn :value="true" variant="text" elevation="9" class="rounded-md">
                                <LayoutDistributeVerticalIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.boxed') }}
                            </v-btn>
                            <v-btn :value="false" variant="text" elevation="9" class="rounded-md ml-4">
                                <LayoutDistributeHorizontalIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.full') }}
                            </v-btn>
                        </v-btn-toggle>

                        <h6 class="text-h6 mt-8 mb-2">{{ t('applications.layout.sidebarType') }}</h6>
                        <v-btn-toggle v-model="appSettings.mini_sidebar" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                            <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                                <LayoutSidebarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.fullSidebar') }}
                            </v-btn>
                            <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                                <LayoutSidebarLeftCollapseIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.miniSidebar') }}
                            </v-btn>
                        </v-btn-toggle>

                        <h6 class="text-h6 mt-8 mb-2">{{ t('applications.layout.cards') }}</h6>
                        <v-btn-toggle v-model="appSettings.setBorderCard" color="primary" class="my-2 btn-group-custom" rounded="0" group>
                            <v-btn :value="false" variant="text" elevation="9" class="rounded-md">
                                <LayoutSidebarLeftCollapseIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.shadow') }}
                            </v-btn>
                            <v-btn :value="true" variant="text" elevation="9" class="rounded-md ml-4">
                                <LayoutSidebarIcon stroke-width="1.5" size="21" class="mr-2 icon" />
                                {{ t('applications.layout.border') }}
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
