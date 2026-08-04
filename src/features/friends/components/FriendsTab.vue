<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';
import type { FriendItem } from '../types';

const { t, locale } = useI18n();
const store = useFriendsStore();

const removeOpen = ref(false);
const removeTarget = ref<FriendItem | null>(null);

const removeDisplayName = computed(() => {
    const user = removeTarget.value?.user;
    if (!user) return '';
    const fullName = [user.firstName, user.name].filter(Boolean).join(' ').trim();
    return fullName || user.username || user.publicId;
});

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

onMounted(() => {
    void store.loadFriends().catch(() => undefined);
});
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
                :subtitle="t('friendsPage.friends.since', { date: formatDate(friend.friendsSince) })"
            >
                <template #actions>
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

    <AppModalBase
        :model-value="removeOpen"
        :title="t('friendsPage.removeModal.title')"
        :subtitle="t('friendsPage.removeModal.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="onRemoveOpenChange"
    >
        <p class="text-body-1 mb-0">
            {{ t('friendsPage.removeModal.body', { name: removeDisplayName }) }}
        </p>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="error" flat :loading="store.acting" @click="confirmRemoveFriend">
                {{ t('friendsPage.removeModal.confirm') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
