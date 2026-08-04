<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { UserPlusIcon } from 'vue-tabler-icons';
import { FriendQrModal, useFriendsStore } from '@/features/friends';

const { t } = useI18n();
const router = useRouter();
const friends = useFriendsStore();
const qrOpen = ref(false);

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
    <v-btn
        variant="text"
        color="primary"
        class="custom-hover-primary text-none"
        :aria-label="t('header.friends.openQr')"
        @click="qrOpen = true"
    >
        <UserPlusIcon stroke-width="1.5" size="20" class="mr-2" />
        {{ t('header.friends.label') }}
    </v-btn>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>
