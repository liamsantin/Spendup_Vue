<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CameraIcon, SearchIcon, XIcon } from 'vue-tabler-icons';
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
    <!-- Recherche Swiss : simple ligne 1 px noire, caméra et effacement en boutons-icônes carrés. -->
    <div class="discover-search">
        <div class="su-search su-search--center">
            <button
                class="su-search__orb"
                type="button"
                :aria-label="t('friendsPage.discover.openQr')"
                :title="t('friendsPage.discover.openQr')"
                @click="qrOpen = true"
            >
                <CameraIcon :size="20" stroke-width="1.5" />
            </button>
            <SearchIcon :size="18" stroke-width="1.5" class="su-search__icon" />
            <input
                class="su-search__input"
                type="search"
                :value="store.searchQuery"
                :placeholder="t('friendsPage.discover.searchLabel')"
                :aria-label="t('friendsPage.discover.searchLabel')"
                @input="store.searchUsers(String(($event.target as HTMLInputElement).value || ''))"
            />
            <button
                v-if="store.searchQuery"
                class="su-search__orb"
                type="button"
                :aria-label="t('header.search.clear')"
                @click="store.clearSearch()"
            >
                <XIcon :size="16" stroke-width="1.5" />
            </button>
        </div>
        <p class="discover-search__hint">{{ t('friendsPage.discover.searchHint') }}</p>
    </div>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>

<style scoped>
.discover-search {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.discover-search__hint {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    text-align: center;
}
</style>
