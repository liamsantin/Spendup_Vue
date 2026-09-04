<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BanIcon, DotsVerticalIcon, PencilIcon, UserMinusIcon, UsersIcon } from 'vue-tabler-icons';
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
    <div>
        <AppAlert v-if="store.error" type="error" density="default" class="su-alert" closable @dismiss="store.error = null">
            {{ store.error }}
        </AppAlert>

        <div v-if="store.loadingFriends && !store.friends.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.friends.length" class="su-empty">
            <span class="su-empty__mark"><UsersIcon :size="24" stroke-width="1.5" /></span>
            {{ t('friendsPage.empty.friends') }}
        </div>
        <div v-else class="su-surface">
            <FriendListItem
                v-for="(friend, i) in store.friends"
                :key="friend.friendshipPublicId"
                variant="glass"
                :index="i"
                :friendship-public-id="friend.friendshipPublicId"
                :user="friend.user"
                :nickname="friend.nickname"
                :subtitle="t('friendsPage.friends.since', { date: formatDate(friend.friendsSince) })"
            >
                <template #actions>
                    <v-menu location="bottom end">
                        <template #activator="{ props: menuProps }">
                            <button v-bind="menuProps" class="su-orb" type="button" :disabled="store.acting" :aria-label="t('common.more')">
                                <DotsVerticalIcon size="18" stroke-width="1.75" />
                            </button>
                        </template>
                        <v-list density="compact" min-width="200">
                            <v-list-item :title="t('friendsPage.actions.nickname')" @click="openNicknameModal(friend)">
                                <template #prepend>
                                    <PencilIcon size="18" stroke-width="1.75" class="text-primary mr-2" />
                                </template>
                            </v-list-item>
                            <v-list-item class="text-error" :title="t('friendsPage.actions.remove')" @click="openRemoveFriend(friend)">
                                <template #prepend>
                                    <UserMinusIcon size="18" stroke-width="1.75" class="mr-2" />
                                </template>
                            </v-list-item>
                            <v-list-item
                                class="text-warning"
                                :title="t('friendsPage.actions.block')"
                                @click="store.blockUser(friend.user.publicId)"
                            >
                                <template #prepend>
                                    <BanIcon size="18" stroke-width="1.75" class="mr-2" />
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>
            </FriendListItem>
            <div v-if="store.hasMoreFriends" class="su-more">
                <button class="su-btn su-btn--ghost" type="button" :disabled="store.loadingMoreFriends" @click="store.loadMoreFriends()">
                    {{ t('friendsPage.loadMore') }}
                </button>
            </div>
        </div>

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
    </div>
</template>
