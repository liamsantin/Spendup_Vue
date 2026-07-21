<script setup lang="ts">
defineOptions({ name: 'AppLogo' });

import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';

withDefaults(defineProps<{ homeTo?: string }>(), { homeTo: '/' });

const appSettings = useAppSettingsStore();

const isDarkTheme = computed(() =>
    ['DARK_BLUE_THEME', 'DARK_AQUA_THEME', 'DARK_ORANGE_THEME', 'DARK_PURPLE_THEME', 'DARK_GREEN_THEME', 'DARK_CYAN_THEME'].includes(
        appSettings.actTheme
    )
);
</script>

<template>
    <div class="logo">
        <RouterLink :to="homeTo" class="spendup-logo d-flex align-center ga-2 text-decoration-none">
            <img src="/Spendup-icon-fusee.svg" alt="Spend.Up" class="spendup-logo__icon flex-shrink-0" width="32" height="32" />
            <span class="spendup-logo__text text-h3 font-weight-bold" :class="isDarkTheme ? 'text-white' : 'textPrimary'">Spend.Up</span>
        </RouterLink>
    </div>
</template>

<style scoped lang="scss">
.spendup-logo__icon {
    display: block;
    object-fit: contain;
}

.spendup-logo__text {
    letter-spacing: -0.02em;
    line-height: 1;
    white-space: nowrap;
}
</style>
