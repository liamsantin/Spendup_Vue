<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
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
    <v-card elevation="10">
        <v-card-item>
            <input
                ref="fileInputRef"
                type="file"
                class="d-none"
                accept="image/jpeg,image/png,image/webp"
                @change="emit('upload', $event)"
            />

            <div class="d-flex align-center justify-space-between flex-wrap ga-4">
                <div class="d-flex align-center ga-4 min-w-0">
                    <v-avatar
                        size="72"
                        color="lightprimary"
                        class="flex-shrink-0 account-picture-avatar"
                        role="button"
                        tabindex="0"
                        :aria-label="t('accounts.picture.enlargeAria')"
                        @click="emit('openLightbox')"
                        @keydown.enter.prevent="emit('openLightbox')"
                        @keydown.space.prevent="emit('openLightbox')"
                    >
                        <v-img :src="avatarSrc || DEFAULT_AVATAR_SRC" :alt="t('accounts.picture.alt')" cover />
                    </v-avatar>
                    <div class="min-w-0">
                        <h4 class="text-h4 mb-0">{{ t('accounts.picture.title') }}</h4>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 mt-1">
                            {{ t('accounts.picture.subtitle') }}
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-wrap ga-2">
                    <v-btn color="primary" variant="tonal" flat :disabled="saving" @click="emit('chooseAvatar')">{{
                        t('accounts.picture.avatar')
                    }}</v-btn>
                    <v-btn color="primary" flat :loading="saving" @click="openFilePicker">{{ t('accounts.picture.upload') }}</v-btn>
                    <v-btn color="error" variant="outlined" flat :disabled="saving || !profilePicture" @click="emit('reset')">
                        {{ t('accounts.picture.reset') }}
                    </v-btn>
                </div>
            </div>

            <AppAlert v-if="error" type="warning" class="mt-4" closable @dismiss="emit('dismissError')">
                {{ error }}
            </AppAlert>
        </v-card-item>
    </v-card>
</template>

<style scoped>
.account-picture-avatar {
    cursor: zoom-in;
}
</style>
