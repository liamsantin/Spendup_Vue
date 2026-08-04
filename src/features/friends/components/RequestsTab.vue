<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';

const { t, locale } = useI18n();
const store = useFriendsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

onMounted(() => {
    void Promise.all([store.loadIncoming(), store.loadOutgoing()]).catch(() => undefined);
});
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <v-row>
        <v-col cols="12" md="6">
            <h5 class="text-h5 mb-3">{{ t('friendsPage.requests.incomingTitle') }}</h5>
            <div v-if="store.loadingIncoming" class="py-6 text-center">
                <v-progress-circular indeterminate color="primary" size="28" />
            </div>
            <div v-else-if="!store.incomingRequests.length" class="py-6 text-medium-emphasis">
                {{ t('friendsPage.empty.incoming') }}
            </div>
            <v-list v-else class="py-0">
                <FriendListItem
                    v-for="request in store.incomingRequests"
                    :key="request.friendshipPublicId"
                    :user="request.otherUser"
                    :subtitle="request.message || formatDate(request.requestedAt)"
                    highlight
                >
                    <template #actions>
                        <v-btn
                            size="small"
                            variant="text"
                            color="primary"
                            :disabled="store.acting"
                            @click.stop="store.acceptRequest(request.friendshipPublicId)"
                        >
                            {{ t('friendsPage.actions.accept') }}
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            color="error"
                            :disabled="store.acting"
                            @click.stop="store.refuseRequest(request.friendshipPublicId)"
                        >
                            {{ t('friendsPage.actions.refuse') }}
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            color="warning"
                            :disabled="store.acting"
                            @click.stop="store.blockUser(request.otherUser.publicId)"
                        >
                            {{ t('friendsPage.actions.block') }}
                        </v-btn>
                    </template>
                </FriendListItem>
            </v-list>
        </v-col>

        <v-col cols="12" md="6">
            <h5 class="text-h5 mb-3">{{ t('friendsPage.requests.outgoingTitle') }}</h5>
            <div v-if="store.loadingOutgoing" class="py-6 text-center">
                <v-progress-circular indeterminate color="primary" size="28" />
            </div>
            <div v-else-if="!store.outgoingRequests.length" class="py-6 text-medium-emphasis">
                {{ t('friendsPage.empty.outgoing') }}
            </div>
            <v-list v-else class="py-0">
                <FriendListItem
                    v-for="request in store.outgoingRequests"
                    :key="request.friendshipPublicId"
                    :user="request.otherUser"
                    :subtitle="request.message || formatDate(request.requestedAt)"
                >
                    <template #actions>
                        <v-btn
                            size="small"
                            variant="text"
                            color="error"
                            :disabled="store.acting"
                            @click.stop="store.cancelRequest(request.friendshipPublicId)"
                        >
                            {{ t('friendsPage.actions.cancel') }}
                        </v-btn>
                    </template>
                </FriendListItem>
            </v-list>
        </v-col>
    </v-row>
</template>
