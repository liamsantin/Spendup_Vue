<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';

const { t, locale } = useI18n();
const store = useFriendsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium' }).format(new Date(value));
}

onMounted(() => {
    void store.loadFriends().catch(() => undefined);
});
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loadingFriends" class="py-8 text-center">
        <v-progress-circular indeterminate color="primary" size="32" />
    </div>
    <div v-else-if="!store.friends.length" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.empty.friends') }}
    </div>
    <v-list v-else class="py-0" lines="two">
        <FriendListItem
            v-for="friend in store.friends"
            :key="friend.friendshipPublicId"
            :user="friend.user"
            :subtitle="t('friendsPage.friends.since', { date: formatDate(friend.friendsSince) })"
        >
            <template #actions>
                <v-btn
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="store.acting"
                    @click.stop="store.removeFriend(friend.friendshipPublicId)"
                >
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
</template>
