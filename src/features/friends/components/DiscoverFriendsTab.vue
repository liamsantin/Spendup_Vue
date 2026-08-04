<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';
import type { FriendSearchItem } from '../types';

const { t } = useI18n();
const store = useFriendsStore();
const requestMessages = ref<Record<string, string>>({});

function outgoingPendingId(user: FriendSearchItem): string | undefined {
    if (user.friendshipStatus !== 'pending') return undefined;
    return store.outgoingRequestFor(user.publicId)?.friendshipPublicId;
}
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.searching" class="py-8 text-center">
        <v-progress-circular indeterminate color="primary" size="32" />
    </div>
    <div v-else-if="store.searchQuery.trim().length >= 2 && !store.searchResults.length" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.empty.search') }}
    </div>
    <div v-else-if="store.searchQuery.trim().length < 2" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.discover.startTyping') }}
    </div>
    <v-list v-else class="py-0 theme-list">
        <FriendListItem v-for="user in store.searchResults" :key="user.publicId" :user="user" :subtitle="user.username || user.publicId">
            <template #actions>
                <template v-if="outgoingPendingId(user)">
                    <v-chip size="small" color="primary" variant="tonal">
                        {{ t('friendsPage.status.pending') }}
                    </v-chip>
                    <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        :disabled="store.acting"
                        @click.stop="store.cancelRequest(outgoingPendingId(user)!)"
                    >
                        {{ t('friendsPage.actions.cancel') }}
                    </v-btn>
                </template>
                <v-chip v-else-if="user.friendshipStatus" size="small" color="primary" variant="tonal">
                    {{ t(`friendsPage.status.${user.friendshipStatus}`) }}
                </v-chip>
                <template v-else>
                    <v-text-field
                        v-model="requestMessages[user.publicId]"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="friends-message-field"
                        :placeholder="t('friendsPage.discover.messagePlaceholder')"
                    />
                    <v-btn
                        size="small"
                        color="primary"
                        :disabled="store.acting"
                        @click.stop="store.sendRequest(user.publicId, requestMessages[user.publicId])"
                    >
                        {{ t('friendsPage.actions.add') }}
                    </v-btn>
                </template>
            </template>
        </FriendListItem>
    </v-list>
</template>

<style scoped>
.friends-message-field {
    min-width: 180px;
}
</style>
