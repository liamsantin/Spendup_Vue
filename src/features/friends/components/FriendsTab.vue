<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import FriendListItem from '@/features/friends/components/FriendListItem.vue';
import FriendNicknameModal from '@/features/friends/components/FriendNicknameModal.vue';
import { getFriendDisplayNameFromItem } from '@/features/friends/display-name';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import type { FriendItem } from '@/features/friends/types';

const { t, locale } = useI18n();
const store = useFriendsStore();

const removeOpen = ref(false);
const removeTarget = ref<FriendItem | null>(null);
const nicknameOpen = ref(false);
const nicknameTarget = ref<FriendItem | null>(null);

const removeDisplayName = computed(() => (removeTarget.value ? getFriendDisplayNameFromItem(removeTarget.value) : ''));

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function openRemoveFriend(friend: FriendItem) {
    removeTarget.value = friend;
    removeOpen.value = true;
}

function onRemoveOpenChange(open: boolean) {
    removeOpen.value = open;
    if (!open) removeTarget.value = null;
}

function openNicknameModal(friend: FriendItem) {
    nicknameTarget.value = friend;
    nicknameOpen.value = true;
}

function onNicknameOpenChange(open: boolean) {
    nicknameOpen.value = open;
    if (!open) nicknameTarget.value = null;
}

async function confirmRemoveFriend() {
    const friendshipPublicId = removeTarget.value?.friendshipPublicId;
    if (!friendshipPublicId) return;
    try {
        await store.removeFriend(friendshipPublicId);
        removeOpen.value = false;
        removeTarget.value = null;
    } catch {
        // erreur via store.error
    }
}
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loadingFriends && !store.friends.length" class="py-8 text-center">
        <v-progress-circular indeterminate color="primary" size="32" />
    </div>
    <div v-else-if="!store.friends.length" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.empty.friends') }}
    </div>
    <template v-else>
        <v-list class="py-0 theme-list" lines="two">
            <FriendListItem
                v-for="friend in store.friends"
                :key="friend.friendshipPublicId"
                :friendship-public-id="friend.friendshipPublicId"
                :user="friend.user"
                :nickname="friend.nickname"
                :subtitle="t('friendsPage.friends.since', { date: formatDate(friend.friendsSince) })"
            >
                <template #actions>
                    <v-btn size="small" variant="text" color="primary" :disabled="store.acting" @click.stop="openNicknameModal(friend)">
                        {{ t('friendsPage.actions.nickname') }}
                    </v-btn>
                    <v-btn size="small" variant="text" color="error" :disabled="store.acting" @click.stop="openRemoveFriend(friend)">
                        {{ t('friendsPage.actions.remove') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        color="warning"
                        :disabled="store.acting"
                        @click.stop="store.blockUser(friend.user.publicId)"
                    >
                        {{ t('friendsPage.actions.block') }}
                    </v-btn>
                </template>
            </FriendListItem>
        </v-list>
        <div v-if="store.hasMoreFriends" class="pt-4 text-center">
            <v-btn
                variant="text"
                color="primary"
                :loading="store.loadingMoreFriends"
                :disabled="store.loadingMoreFriends"
                @click="store.loadMoreFriends()"
            >
                {{ t('friendsPage.loadMore') }}
            </v-btn>
        </div>
    </template>

    <FriendNicknameModal v-model="nicknameOpen" :friend="nicknameTarget" @update:model-value="onNicknameOpenChange" />

    <AppConfirmationModal
        :model-value="removeOpen"
        :title="t('friendsPage.removeModal.title')"
        :message="t('friendsPage.removeModal.body', { name: removeDisplayName })"
        :confirm-label="t('friendsPage.removeModal.confirm')"
        confirm-color="error"
        :loading="store.acting"
        @update:model-value="onRemoveOpenChange"
        @confirm="confirmRemoveFriend"
    />
</template>
