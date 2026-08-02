<script setup lang="ts">
defineOptions({ name: 'SidebarProfile' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, useProfileAvatarUrl } from '@/features/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const { avatarSrc } = useProfileAvatarUrl();
const displayName = computed(() => authStore.displayName || t('header.profile.fallbackName'));
</script>

<template>
    <v-sheet rounded="md" color="lightsecondary" class="px-4 py-3 ExtraBox">
        <div class="d-flex align-center hide-menu">
            <v-avatar size="40">
                <img :src="avatarSrc" alt="user" height="40" width="40" class="obj-cover" />
            </v-avatar>
            <div class="ml-4">
                <h4 class="mb-n1 text-h6 textPrimary">{{ displayName }}</h4>
                <span class="text-subtitle-2 textSecondary">{{ authStore.user?.email ?? '' }}</span>
            </div>
            <div class="ml-auto">
                <v-btn variant="text" icon rounded="md" color="primary" @click="authStore.logout()">
                    <PowerIcon />

                    <v-tooltip activator="parent" location="top">{{ t('common.logout') }}</v-tooltip>
                </v-btn>
            </div>
        </div>
    </v-sheet>
</template>
<style lang="scss">
.ExtraBox {
    position: relative;
    overflow: hidden;
}
.line-height-none {
    line-height: normal;
}
</style>
