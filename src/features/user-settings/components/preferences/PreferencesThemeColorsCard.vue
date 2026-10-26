<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { UserSettings } from '@/features/user-settings/types';
import { DAY_THEME_COLORS, NIGHT_THEME_COLORS, normalizeHex } from '@/features/user-settings/themeColorOptions';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

function isDaySelected(hex: string): boolean {
    return normalizeHex(draft.value.themeColor) === normalizeHex(hex);
}

function isNightSelected(hex: string): boolean {
    return normalizeHex(draft.value.themeDarkColor) === normalizeHex(hex);
}
</script>

<template>
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('userSettings.themeColors.title') }}</h2>
            <p>{{ t('userSettings.themeColors.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <!-- Carrés 32 px ; sélection = cadre 2 px noir (plus de rond ni de carte). -->
            <div class="su-field" role="group" :aria-label="t('userSettings.themeColors.day')">
                <span class="su-field__label">{{ t('userSettings.themeColors.day') }}</span>
                <div class="theme-swatches">
                    <button
                        v-for="color in DAY_THEME_COLORS"
                        :key="color.id"
                        type="button"
                        class="theme-swatch"
                        :class="{ 'is-selected': isDaySelected(color.hex) }"
                        :style="{ '--swatch': color.hex }"
                        :aria-label="color.id"
                        :aria-pressed="isDaySelected(color.hex)"
                        @click="draft.themeColor = normalizeHex(color.hex)"
                    >
                        <span class="theme-swatch__color" />
                    </button>
                </div>
            </div>
            <div class="su-field" role="group" :aria-label="t('userSettings.themeColors.night')">
                <span class="su-field__label">{{ t('userSettings.themeColors.night') }}</span>
                <div class="theme-swatches">
                    <button
                        v-for="color in NIGHT_THEME_COLORS"
                        :key="color.id"
                        type="button"
                        class="theme-swatch"
                        :class="{ 'is-selected': isNightSelected(color.hex) }"
                        :style="{ '--swatch': color.hex }"
                        :aria-label="color.id"
                        :aria-pressed="isNightSelected(color.hex)"
                        @click="draft.themeDarkColor = normalizeHex(color.hex)"
                    >
                        <span class="theme-swatch__color" />
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.theme-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

/* cible 40 px, pastille carrée 32 px à l’intérieur */
.theme-swatch {
    appearance: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s var(--ease);
}

.theme-swatch__color {
    display: block;
    width: 32px;
    height: 32px;
    /* couleur du thème : donnée du catalogue, pas une couleur de décor */
    background: var(--swatch);
}

.theme-swatch:hover {
    border-color: var(--line);
}

.theme-swatch.is-selected {
    border-color: var(--ink);
}

.theme-swatch:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}
</style>
