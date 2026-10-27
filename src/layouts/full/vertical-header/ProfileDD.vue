<script setup lang="ts">
/**
 * Menu du profil : photo, nom, identifiant, pseudo, e-mail et téléphone, puis les raccourcis.
 */
import { computed, ref } from 'vue';
import { AtIcon, HashIcon, LogoutIcon, MailIcon, PhoneIcon, SettingsIcon, UsersIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
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

const links = computed(() => [
    {
        key: 'account',
        title: t('header.profile.menu.preferences.title'),
        subtitle: t('header.profile.menu.preferences.subtitle'),
        href: SETTINGS_PATHS.account,
        icon: SettingsIcon
    },
    {
        key: 'friends',
        title: t('header.profile.menu.friends.title'),
        subtitle: t('header.profile.menu.friends.subtitle'),
        href: '/app/friends',
        icon: UsersIcon
    }
]);

function closeMenu() {
    menuOpen.value = false;
}

async function onLogout() {
    closeMenu();
    await authStore.logout();
}
</script>

<template>
    <v-menu v-model="menuOpen" location="bottom end" :offset="12" :close-on-content-click="false" :scrim="scrim" :opacity="opacity">
        <template #activator="{ props }">
            <button type="button" class="su-orb profile-dd__trigger" v-bind="props" :aria-label="t('header.profile.title')">
                <img :src="avatarSrc" width="40" height="40" alt="" class="profile-dd__orb-photo" />
            </button>
        </template>

        <v-sheet rounded="0" width="340" elevation="0" class="su-menu profile-dd">
            <div class="profile-dd__identity">
                <img :src="avatarSrc" width="64" height="64" alt="" class="profile-dd__photo" />
                <div class="profile-dd__who">
                    <p class="profile-dd__name">{{ displayName }}</p>
                    <p v-for="detail in profileDetails" :key="detail.key" class="profile-dd__line">
                        <component :is="detail.icon" :size="16" stroke-width="1.6" />
                        <span>{{ detail.value }}</span>
                    </p>
                </div>
            </div>

            <router-link v-for="item in links" :key="item.key" class="su-menu-item" :to="item.href" @click="closeMenu">
                <span class="su-menu-item__icon"><component :is="item.icon" :size="18" stroke-width="1.6" /></span>
                <span class="profile-dd__meta">
                    <p class="su-menu-item__title">{{ item.title }}</p>
                    <p class="su-menu-item__desc">{{ item.subtitle }}</p>
                </span>
            </router-link>

            <button type="button" class="su-menu-item profile-dd__logout" @click="onLogout">
                <span class="su-menu-item__icon"><LogoutIcon :size="18" stroke-width="1.6" /></span>
                <span class="su-menu-item__title">{{ t('header.profile.logout') }}</span>
            </button>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.profile-dd__trigger {
    width: 48px;
    height: 48px;
    overflow: hidden;
}

.profile-dd__orb-photo,
.profile-dd__photo {
    display: block;
    object-fit: cover;
    border-radius: 50%;
}

.profile-dd__orb-photo {
    width: 48px;
    height: 48px;
}

.profile-dd__identity {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 10px 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--line);
}

.profile-dd__photo {
    flex: none;
    width: 64px;
    height: 64px;
}

.profile-dd__who {
    min-width: 0;
}

.profile-dd__name {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile-dd__line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.3;
}

.profile-dd__line svg {
    flex: none;
}

.profile-dd__line span {
    min-width: 0;
    overflow-wrap: anywhere;
}

.profile-dd__meta {
    min-width: 0;
}

.profile-dd__logout {
    color: var(--danger);
}

.profile-dd__logout .su-menu-item__icon {
    background: var(--danger-soft);
    color: var(--danger);
}
</style>
