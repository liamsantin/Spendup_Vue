<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
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
    <section class="su-settings account-picture">
        <div class="su-settings__lead">
            <h2>{{ t('accounts.picture.title') }}</h2>
            <p>{{ t('accounts.picture.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="error" type="warning" class="is-full su-alert" closable @dismiss="emit('dismissError')">
                {{ error }}
            </AppAlert>
            <div class="is-full account-picture__row">
                <img
                    :src="avatarSrc || DEFAULT_AVATAR_SRC"
                    :alt="t('accounts.picture.alt')"
                    role="button"
                    tabindex="0"
                    :aria-label="t('accounts.picture.enlargeAria')"
                    class="account-picture__avatar"
                    @click="emit('openLightbox')"
                    @keydown.enter.prevent="emit('openLightbox')"
                    @keydown.space.prevent="emit('openLightbox')"
                />
                <input
                    ref="fileInputRef"
                    type="file"
                    class="d-none"
                    accept="image/jpeg,image/png,image/webp"
                    @change="emit('upload', $event)"
                />
                <div class="account-picture__actions">
                    <button type="button" class="su-btn" :disabled="saving" @click="emit('chooseAvatar')">
                        {{ t('accounts.picture.avatar') }}
                    </button>
                    <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="openFilePicker">
                        {{ t('accounts.picture.upload') }}
                    </button>
                    <button type="button" class="su-btn su-btn--danger" :disabled="saving || !profilePicture" @click="emit('reset')">
                        {{ t('accounts.picture.reset') }}
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Photo ronde 100 px (seul rond autorisé) + trois boutons carrés sur la même ligne. */
.account-picture__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px 24px;
}

.account-picture__avatar {
    flex: none;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--soft);
    cursor: zoom-in;
}

.account-picture__avatar:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
}

.account-picture__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
