<script setup lang="ts">
defineOptions({ name: 'SidebarProfile' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PowerIcon } from 'vue-tabler-icons';
import { useAuthStore, useProfileAvatarUrl } from '@/features/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const { avatarSrc } = useProfileAvatarUrl();
const displayName = computed(() => authStore.displayName || t('header.profile.fallbackName'));
</script>

<template>
    <v-sheet rounded="md" color="lightsecondary" class="px-3 py-3 ExtraBox">
        <div class="d-flex align-center hide-menu ExtraBox__row">
            <v-avatar size="40" class="flex-shrink-0">
                <img :src="avatarSrc" alt="user" height="40" width="40" class="obj-cover" />
            </v-avatar>
            <div class="ExtraBox__name ml-3">
                <h4 class="mb-0 text-h6 textPrimary ExtraBox__name-text">{{ displayName }}</h4>
            </div>
            <v-btn class="flex-shrink-0" variant="text" icon rounded="md" color="primary" @click="authStore.logout()">
                <PowerIcon />
                <v-tooltip activator="parent" location="top">{{ t('common.logout') }}</v-tooltip>
            </v-btn>
        </div>
    </v-sheet>
</template>
<style lang="scss" scoped>
.ExtraBox {
    position: relative;
    overflow: hidden;
}

.ExtraBox__row {
    min-width: 0;
    gap: 0;
}

.ExtraBox__name {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
}

.ExtraBox__name-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    word-break: break-word;
}
</style>
