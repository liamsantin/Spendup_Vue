<script setup lang="ts">
defineOptions({ name: 'NewDD' });

import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { PlusIcon, UserPlusIcon } from 'vue-tabler-icons';
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
    <v-menu v-model="menuOpen" :close-on-content-click="false" :scrim="scrim" :opacity="opacity">
        <template #activator="{ props }">
            <v-btn
                color="lightprimary"
                variant="flat"
                class="text-none text-primary ps-2 pe-3"
                v-bind="props"
                :aria-label="t('header.new.open')"
            >
                <PlusIcon stroke-width="1.5" size="20" class="mr-1" />
                {{ t('header.new.label') }}
            </v-btn>
        </template>

        <v-sheet rounded="md" width="216" elevation="10">
            <v-list class="py-2" density="comfortable">
                <v-list-item class="px-4" :aria-label="t('header.friends.openQr')" @click="openAddFriend">
                    <template #prepend>
                        <UserPlusIcon stroke-width="1.5" size="20" class="mr-3" />
                    </template>
                    <v-list-item-title class="text-subtitle-1 font-weight-medium"> + {{ t('header.friends.label') }} </v-list-item-title>
                </v-list-item>
            </v-list>
        </v-sheet>
    </v-menu>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>
