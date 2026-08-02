<script setup lang="ts">
import { computed, ref } from 'vue';
import { PaletteIcon } from 'vue-tabler-icons';
import { ThemeTab } from '@/features/applications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

type ThemeTabExpose = {
    saveSettings: () => void;
    resetSettings: () => void;
    loading: boolean;
};

const tab = ref('Theme');
const themeTabRef = ref<ThemeTabExpose | null>(null);
const themeDirty = ref(false);

const isThemeTab = computed(() => tab.value === 'Theme');
const saveLoading = computed(() => !!themeTabRef.value?.loading);
const saveDisabled = computed(() => !isThemeTab.value || saveLoading.value || !themeDirty.value);

function onSave() {
    if (!isThemeTab.value || !themeTabRef.value || saveLoading.value) return;
    themeTabRef.value.saveSettings();
}

function onCancel() {
    if (!isThemeTab.value || !themeTabRef.value || saveLoading.value) return;
    themeTabRef.value.resetSettings();
}
</script>

<template>
    <div class="settings-page">
        <v-card elevation="10" rounded="md" class="settings-page-card">
            <v-tabs v-model="tab" bg-color="grey100" density="comfortable" height="52" color="primary" class="settings-tabs flex-grow-0">
                <v-tab value="Theme" class="text-medium-emphasis">
                    <PaletteIcon class="mr-2" size="18" />
                    Thème
                </v-tab>
            </v-tabs>

            <v-divider class="flex-grow-0" />

            <perfect-scrollbar class="settings-tabs-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-card-text class="pa-sm-6 pa-3">
                    <v-window v-model="tab">
                        <v-window-item value="Theme">
                            <ThemeTab ref="themeTabRef" @dirty="themeDirty = $event" />
                        </v-window-item>
                    </v-window>
                </v-card-text>
            </perfect-scrollbar>

            <v-divider class="flex-grow-0" />

            <div class="settings-actions-bar">
                <v-btn color="primary" class="mr-3" flat :loading="saveLoading" :disabled="saveDisabled" @click="onSave">
                    Enregistrer
                </v-btn>
                <v-btn class="bg-lighterror text-error" flat :disabled="!isThemeTab || saveLoading || !themeDirty" @click="onCancel">
                    Annuler
                </v-btn>
            </div>
        </v-card>
    </div>
</template>

<style scoped>
.settings-page {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.settings-page-card {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

@media screen and (max-width: 767px) {
    .settings-page {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page-card {
        border-radius: 0 !important;
    }
}

.settings-tabs :deep(.v-tab) {
    min-height: 52px;
    font-size: 0.875rem;
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.settings-actions-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: rgb(var(--v-theme-surface));
}
</style>
