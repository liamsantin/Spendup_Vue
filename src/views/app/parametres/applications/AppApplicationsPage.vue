<script setup lang="ts">
import { ref } from 'vue';
import { PaletteIcon } from 'vue-tabler-icons';
import { ThemeTab } from '@/features/applications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const tab = ref('Theme');
</script>

<template>
    <div class="applications-page">
        <v-card elevation="10" rounded="md" class="applications-page-card">
            <v-tabs
                v-model="tab"
                bg-color="grey100"
                density="comfortable"
                height="52"
                color="primary"
                class="applications-tabs flex-grow-0"
            >
                <v-tab value="Theme" class="text-medium-emphasis">
                    <PaletteIcon class="mr-2" size="18" />
                    Thème
                </v-tab>
            </v-tabs>

            <v-divider class="flex-grow-0" />

            <perfect-scrollbar class="applications-tabs-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-card-text class="pa-sm-6 pa-3">
                    <v-window v-model="tab">
                        <v-window-item value="Theme">
                            <ThemeTab />
                        </v-window-item>
                    </v-window>
                </v-card-text>
            </perfect-scrollbar>

            <v-divider class="flex-grow-0" />

            <div class="applications-actions-bar">
                <v-btn color="primary" class="mr-3" flat>Enregistrer</v-btn>
                <v-btn class="bg-lighterror text-error" flat>Annuler</v-btn>
            </div>
        </v-card>
    </div>
</template>

<style scoped>
.applications-page {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.applications-page-card {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

@media screen and (max-width: 767px) {
    .applications-page {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .applications-page-card {
        border-radius: 0 !important;
    }
}

.applications-tabs :deep(.v-tab) {
    min-height: 52px;
    font-size: 0.875rem;
}

.applications-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.applications-actions-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: rgb(var(--v-theme-surface));
}
</style>
