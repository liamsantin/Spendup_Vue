<script setup lang="ts">
/**
 * Modales avatar : lightbox photo + catalogue d’avatars prédéfinis.
 */
import { useI18n } from 'vue-i18n';
import { CATALOG_AVATARS, DEFAULT_AVATAR_SRC, catalogAvatarSrc } from '@/features/auth';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';

defineProps<{
    lightboxOpen: boolean;
    avatarOpen: boolean;
    avatarDraft: string | null;
    avatarSrc: string | undefined;
    pictureSaving: boolean;
}>();

const emit = defineEmits<{
    'update:lightboxOpen': [value: boolean];
    'update:avatarOpen': [value: boolean];
    'update:avatarDraft': [value: string | null];
    confirmCatalog: [];
}>();

const { t } = useI18n();
</script>

<template>
    <AppModalBase
        :model-value="lightboxOpen"
        :title="t('accounts.picture.lightbox.title')"
        :max-width="560"
        :scrollable="false"
        :show-footer="false"
        :persistent="false"
        @update:model-value="emit('update:lightboxOpen', $event)"
    >
        <div class="d-flex justify-center">
            <v-img
                :src="avatarSrc || DEFAULT_AVATAR_SRC"
                :alt="t('accounts.picture.alt')"
                max-width="100%"
                max-height="70vh"
                contain
                class="rounded-lg account-picture-lightbox-img"
            />
        </div>
    </AppModalBase>

    <AppModalBase
        :model-value="avatarOpen"
        :title="t('accounts.picture.catalogModal.title')"
        :subtitle="t('accounts.picture.catalogModal.subtitle')"
        :max-width="520"
        :scrollable="true"
        @update:model-value="emit('update:avatarOpen', $event)"
    >
        <div class="d-flex flex-wrap justify-center ga-3 py-2">
            <button
                v-for="path in CATALOG_AVATARS"
                :key="path"
                type="button"
                class="avatar-catalog-option"
                :class="{ 'avatar-catalog-option--selected': avatarDraft === path }"
                :aria-pressed="avatarDraft === path"
                @click="emit('update:avatarDraft', path)"
            >
                <v-avatar size="64" color="lightprimary">
                    <v-img :src="catalogAvatarSrc(path)" :alt="path" cover />
                </v-avatar>
            </button>
        </div>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="pictureSaving" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="pictureSaving" :disabled="!avatarDraft" @click="emit('confirmCatalog')">
                {{ t('accounts.picture.catalogModal.apply') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>

<style scoped>
.avatar-catalog-option {
    padding: 4px;
    border: 2px solid transparent;
    border-radius: 9999px;
    background: transparent;
    cursor: pointer;
    line-height: 0;
}

.avatar-catalog-option--selected {
    border-color: rgb(var(--v-theme-primary));
}

.account-picture-lightbox-img {
    width: min(100%, 480px);
}
</style>
