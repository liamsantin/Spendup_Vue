<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CameraIcon } from 'vue-tabler-icons';
import FriendQrModal from '@/features/friends/components/FriendQrModal.vue';
import { useFriendsStore } from '@/features/friends/stores/friends-store';

const { t } = useI18n();
const store = useFriendsStore();
const qrOpen = ref(false);

async function onQrScanned(publicId: string) {
    try {
        await store.searchUsers(publicId);
    } catch {
        // erreur via store.error
    }
}
</script>

<template>
    <div class="discover-search d-flex align-start ga-2 mt-2 mb-1">
        <v-btn
            icon
            variant="tonal"
            color="primary"
            class="discover-search__camera flex-shrink-0"
            :aria-label="t('friendsPage.discover.openQr')"
            :title="t('friendsPage.discover.openQr')"
            @click="qrOpen = true"
        >
            <CameraIcon stroke-width="1.5" size="22" />
        </v-btn>
        <v-text-field
            v-model="store.searchQuery"
            class="flex-grow-1"
            :label="t('friendsPage.discover.searchLabel')"
            :hint="t('friendsPage.discover.searchHint')"
            persistent-hint
            prepend-inner-icon="mdi-magnify"
            clearable
            @update:model-value="store.searchUsers(String($event || ''))"
            @click:clear="store.clearSearch()"
        />
    </div>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>

<style scoped>
.discover-search__camera {
    margin-top: 4px;
}
</style>
