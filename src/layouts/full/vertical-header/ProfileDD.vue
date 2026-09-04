<script setup lang="ts">
import { computed, ref } from 'vue';
import { AtIcon, HashIcon, MailIcon, PhoneIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import { profileDD } from '@/data/admin/headerData';
import { useAuthStore, useProfileAvatarUrl } from '@/features/auth';
import { useHeaderMenuOverlay } from './useHeaderMenuOverlay';

const { t } = useI18n();
const authStore = useAuthStore();
const { avatarSrc } = useProfileAvatarUrl();
const { scrim, opacity } = useHeaderMenuOverlay();
const menuOpen = ref(false);

const displayName = computed(() => authStore.displayName || t('header.profile.fallbackName'));

const profileDetails = computed(() => {
    const user = authStore.user;
    if (!user) return [];

    const entries: { key: string; value: string; icon: typeof HashIcon }[] = [];

    const publicId = user.userPublicId?.trim();
    if (publicId) entries.push({ key: 'id', value: publicId.replace(/^#/, ''), icon: HashIcon });

    const username = user.username?.trim();
    if (username) entries.push({ key: 'username', value: username, icon: AtIcon });

    const email = user.email?.trim();
    if (email) entries.push({ key: 'email', value: email, icon: MailIcon });

    const phone = user.phone?.trim();
    if (phone) entries.push({ key: 'phone', value: phone, icon: PhoneIcon });

    return entries;
});

function closeMenu() {
    menuOpen.value = false;
}

async function onLogout() {
    closeMenu();
    await authStore.logout();
}
</script>

<template>
    <v-menu v-model="menuOpen" :close-on-content-click="false" :scrim="scrim" :opacity="opacity">
        <template v-slot:activator="{ props }">
            <button type="button" class="su-orb" v-bind="props" :aria-label="t('header.profile.title')">
                <img :src="avatarSrc" width="32" height="32" alt="" class="obj-cover profile-dd__orb-photo" />
            </button>
        </template>
        <v-sheet rounded="md" width="360" elevation="0" class="su-menu">
            <div class="px-8 pt-6">
                <h6 class="text-h5 font-weight-medium">{{ t('header.profile.title') }}</h6>
                <div class="d-flex align-center mt-4 pb-6">
                    <img :src="avatarSrc" width="80" height="80" alt="" class="obj-cover profile-dd__photo" />
                    <div class="ml-3 min-w-0">
                        <h6 class="text-h6 mb-n1">{{ displayName }}</h6>
                        <div v-for="detail in profileDetails" :key="detail.key" class="d-flex align-center mt-1">
                            <component :is="detail.icon" size="18" stroke-width="1.5" class="flex-shrink-0" />
                            <span class="text-subtitle-1 font-weight-regular textSecondary ml-2 text-truncate">{{ detail.value }}</span>
                        </div>
                    </div>
                </div>
                <v-divider></v-divider>
            </div>
            <div class="px-2 py-2">
                <router-link v-for="item in profileDD" :key="item.titleKey" class="su-person" :to="item.href" @click="closeMenu">
                    <span class="su-person__avatar profile-dd__icon">
                        <img :src="item.avatar" width="24" height="24" :alt="t(item.titleKey)" />
                    </span>
                    <div class="su-person__meta">
                        <p class="su-person__name">{{ t(item.titleKey) }}</p>
                        <p class="su-person__sub">{{ t(item.subtitleKey) }}</p>
                    </div>
                </router-link>
            </div>
            <div class="pt-4 pb-6 px-8 text-center">
                <button type="button" class="su-btn su-btn--ink" style="width: 100%" @click="onLogout">
                    {{ t('header.profile.logout') }}
                </button>
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.profile-dd__orb-photo,
.profile-dd__photo {
    display: block;
    border-radius: 50%;
}

.profile-dd__icon {
    display: grid;
    place-items: center;
    background: var(--hair);
}
</style>
