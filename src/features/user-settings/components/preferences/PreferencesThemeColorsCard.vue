<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CheckIcon, PaletteIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import type { UserSettings } from '@/features/user-settings/types';
import { DAY_THEME_COLORS, NIGHT_THEME_COLORS, normalizeHex } from '@/features/user-settings/themeColorOptions';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();
</script>

<template>
    <AppGlassCard :title="t('userSettings.themeColors.title')" :subtitle="t('userSettings.themeColors.subtitle')">
        <template #icon>
            <PaletteIcon :size="20" stroke-width="1.5" />
        </template>
        <h6 class="text-h6 mt-1 mb-5">{{ t('userSettings.themeColors.day') }}</h6>
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
                        elevation="0"
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
                        elevation="0"
                        @click="toggle"
                    >
                        <v-avatar :class="color.bg" size="25">
                            <CheckIcon v-if="isSelected" color="white" size="18" />
                        </v-avatar>
                    </v-sheet>
                </v-item>
            </v-col>
        </v-item-group>
    </AppGlassCard>
</template>
