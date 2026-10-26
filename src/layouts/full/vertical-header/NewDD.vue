<script setup lang="ts">
defineOptions({ name: 'NewDD' });

import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ArrowsExchangeIcon, FilesIcon, UserPlusIcon } from 'vue-tabler-icons';
import { FriendQrModal, useFriendsStore } from '@/features/friends';
import { useHeaderMenuOverlay } from './useHeaderMenuOverlay';

const { t } = useI18n();
const router = useRouter();
const friends = useFriendsStore();
const { scrim, opacity } = useHeaderMenuOverlay();

const menuOpen = ref(false);
const qrOpen = ref(false);

function closeMenu() {
    menuOpen.value = false;
}

function goTo(path: string, query?: Record<string, string>) {
    closeMenu();
    void router.push({ path, query });
}

async function openAddFriend() {
    closeMenu();
    await nextTick();
    qrOpen.value = true;
}

async function onQrScanned(publicId: string) {
    try {
        await router.push({ path: '/app/friends', query: { tab: 'Discover' } });
        await friends.searchUsers(publicId);
    } catch {
        // erreur via store.error
    }
}
</script>

<template>
    <v-menu v-model="menuOpen" :close-on-content-click="false" :scrim="scrim" :opacity="opacity" :offset="12">
        <template #activator="{ props }">
            <button type="button" class="su-btn" v-bind="props" :aria-label="t('header.new.open')">+ {{ t('header.new.label') }}</button>
        </template>

        <v-sheet rounded="0" width="300" elevation="0" class="su-menu">
            <button
                type="button"
                class="su-menu-item"
                :aria-label="t('nav.items.transactions')"
                @click="goTo('/app/finances/transactions', { create: '1' })"
            >
                <span class="su-menu-item__icon"><ArrowsExchangeIcon :size="18" stroke-width="1.6" /></span>
                <span class="min-width-0">
                    <p class="su-menu-item__title">{{ t('nav.items.transactions') }}</p>
                    <p class="su-menu-item__desc">{{ t('nav.quickAdd.transaction') }}</p>
                </span>
            </button>
            <button
                type="button"
                class="su-menu-item"
                :aria-label="t('nav.items.files')"
                @click="goTo('/app/gestion/files', { upload: '1' })"
            >
                <span class="su-menu-item__icon su-menu-item__icon--amber"><FilesIcon :size="18" stroke-width="1.6" /></span>
                <span class="min-width-0">
                    <p class="su-menu-item__title">{{ t('nav.items.files') }}</p>
                    <p class="su-menu-item__desc">{{ t('nav.quickAdd.file') }}</p>
                </span>
            </button>
            <button type="button" class="su-menu-item" :aria-label="t('header.friends.openQr')" @click="openAddFriend">
                <span class="su-menu-item__icon su-menu-item__icon--teal"><UserPlusIcon :size="18" stroke-width="1.6" /></span>
                <span class="min-width-0">
                    <p class="su-menu-item__title">{{ t('header.friends.label') }}</p>
                    <p class="su-menu-item__desc">{{ t('header.friends.openQr') }}</p>
                </span>
            </button>
        </v-sheet>
    </v-menu>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>

<style scoped>
.su-menu-item__icon--amber {
    background: var(--t-amber-bg);
    color: var(--t-amber-ink);
}

.su-menu-item__icon--teal {
    background: var(--t-teal-bg);
    color: var(--t-teal-ink);
}
</style>
