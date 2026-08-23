<script setup lang="ts">
defineOptions({ name: 'ShareInviteFriendList' });

import { useI18n } from 'vue-i18n';
import { CircleCheckIcon } from 'vue-tabler-icons';
import { FriendListItem } from '@/features/friends';
import type { FriendItem } from '@/features/friends';

defineProps<{
    loading: boolean;
    hasAvailable: boolean;
    friends: FriendItem[];
    selectedUserPublicId: string | null;
}>();

const emit = defineEmits<{
    select: [userPublicId: string];
}>();

const { t } = useI18n();
</script>

<template>
    <div v-if="loading" class="share-invite-friend-list__placeholder">
        <v-progress-circular indeterminate color="primary" size="28" />
    </div>
    <div v-else-if="!hasAvailable" class="share-invite-friend-list__placeholder text-medium-emphasis text-body-2">
        {{ t('comptesPage.share.emptyFriends') }}
    </div>
    <div v-else-if="!friends.length" class="share-invite-friend-list__placeholder text-medium-emphasis text-body-2">
        {{ t('comptesPage.share.noMatchingFriends') }}
    </div>
    <v-list v-else class="py-0 theme-list">
        <FriendListItem
            v-for="friend in friends"
            :key="friend.user.publicId"
            :user="friend.user"
            :highlight="selectedUserPublicId === friend.user.publicId"
            @click="emit('select', friend.user.publicId)"
        >
            <template #actions>
                <CircleCheckIcon v-if="selectedUserPublicId === friend.user.publicId" class="text-primary" :size="22" stroke-width="1.8" />
            </template>
        </FriendListItem>
    </v-list>
</template>

<style scoped>
.share-invite-friend-list__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 96px;
    height: 100%;
    padding: 16px;
    text-align: center;
}
</style>
