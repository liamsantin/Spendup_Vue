<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CheckIcon, PaletteIcon } from 'vue-tabler-icons';
import type { UserSettings } from '@/features/user-settings/types';
import { DAY_THEME_COLORS, NIGHT_THEME_COLORS, normalizeHex } from '@/features/user-settings/themeColorOptions';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <PaletteIcon class="text-primary" size="25" />
                </v-avatar>
                <div>
                    <h4 class="text-h4 mb-0">{{ t('userSettings.themeColors.title') }}</h4>
                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                        {{ t('userSettings.themeColors.subtitle') }}
                    </div>
                </div>
            </div>

            <h6 class="text-h6 mt-4 mb-5">{{ t('userSettings.themeColors.day') }}</h6>
            <v-item-group
                :model-value="normalizeHex(draft.themeColor)"
                mandatory
                class="ml-n2 v-row"
                @update:model-value="draft.themeColor = String($event)"
            >
                <v-col v-for="color in DAY_THEME_COLORS" :key="color.id" cols="4" sm="2" class="pa-2">
                    <v-item v-slot="{ isSelected, toggle }" :value="normalizeHex(color.hex)">
                        <v-sheet
                            rounded="md"
                            class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                            elevation="9"
                            @click="toggle"
                        >
                            <v-avatar :class="color.bg" size="25">
                                <CheckIcon v-if="isSelected" color="white" size="18" />
                            </v-avatar>
                        </v-sheet>
                    </v-item>
                </v-col>
            </v-item-group>

            <h6 class="text-h6 mt-8 mb-5">{{ t('userSettings.themeColors.night') }}</h6>
            <v-item-group
                :model-value="normalizeHex(draft.themeDarkColor)"
                mandatory
                class="ml-n2 v-row"
                @update:model-value="draft.themeDarkColor = String($event)"
            >
                <v-col v-for="color in NIGHT_THEME_COLORS" :key="color.id" cols="4" sm="2" class="pa-2">
                    <v-item v-slot="{ isSelected, toggle }" :value="normalizeHex(color.hex)">
                        <v-sheet
                            rounded="md"
                            class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                            elevation="9"
                            @click="toggle"
                        >
                            <v-avatar :class="color.bg" size="25">
                                <CheckIcon v-if="isSelected" color="white" size="18" />
                            </v-avatar>
                        </v-sheet>
                    </v-item>
                </v-col>
            </v-item-group>
        </v-card-item>
    </v-card>
</template>
