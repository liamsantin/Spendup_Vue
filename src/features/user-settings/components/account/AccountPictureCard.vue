<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { DEFAULT_AVATAR_SRC } from '@/features/auth';

defineProps<{
    avatarSrc?: string;
    profilePicture: string | null;
    saving: boolean;
    error: string | null;
}>();

const emit = defineEmits<{
    upload: [event: Event];
    chooseAvatar: [];
    reset: [];
    openLightbox: [];
    dismissError: [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const { t } = useI18n();

function openFilePicker() {
    fileInputRef.value?.click();
}
</script>

<template>
    <AppGlassCard :title="t('accounts.picture.title')" :subtitle="t('accounts.picture.subtitle')" icon-photo>
        <template #icon>
            <img
                :src="avatarSrc || DEFAULT_AVATAR_SRC"
                :alt="t('accounts.picture.alt')"
                role="button"
                tabindex="0"
                :aria-label="t('accounts.picture.enlargeAria')"
                class="account-picture-avatar"
                @click="emit('openLightbox')"
                @keydown.enter.prevent="emit('openLightbox')"
                @keydown.space.prevent="emit('openLightbox')"
            />
        </template>
        <template #actions>
            <input
                ref="fileInputRef"
                type="file"
                class="d-none"
                accept="image/jpeg,image/png,image/webp"
                @change="emit('upload', $event)"
            />
            <button type="button" class="su-btn" :disabled="saving" @click="emit('chooseAvatar')">
                {{ t('accounts.picture.avatar') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="openFilePicker">
                {{ t('accounts.picture.upload') }}
            </button>
            <button type="button" class="su-btn su-btn--danger" :disabled="saving || !profilePicture" @click="emit('reset')">
                {{ t('accounts.picture.reset') }}
            </button>
        </template>
        <AppAlert v-if="error" type="warning" class="su-alert" closable @dismiss="emit('dismissError')">
            {{ error }}
        </AppAlert>
    </AppGlassCard>
</template>

<style scoped>
.account-picture-avatar {
    cursor: zoom-in;
}
</style>
