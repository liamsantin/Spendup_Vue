<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { InboxIcon, SendIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';

const { t, locale } = useI18n();
const store = useFriendsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div class="requests-tab-content">
        <v-row>
            <v-col cols="12" md="6" class="pa-3">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                            <div class="d-flex align-center ga-3 min-width-0">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <InboxIcon class="text-primary" size="25" />
                                </v-avatar>
                                <div class="min-width-0">
                                    <h4 class="text-h4 mb-0">{{ t('friendsPage.requests.incomingTitle') }}</h4>
                                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                                        {{ t('friendsPage.requests.incomingSubtitle') }}
                                    </div>
                                </div>
                            </div>
                            <v-chip v-if="store.incomingCount > 0" color="primary" size="small" variant="flat">
                                {{ store.incomingCount }}
                            </v-chip>
                        </div>

                        <div class="mt-4">
                            <div v-if="store.loadingIncoming && !store.incomingRequests.length" class="py-6 text-center">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>
                            <div v-else-if="!store.incomingRequests.length" class="py-6 text-center text-medium-emphasis">
                                {{ t('friendsPage.empty.incoming') }}
                            </div>
                            <template v-else>
                                <v-list class="py-0 theme-list">
                                    <FriendListItem
                                        v-for="request in store.incomingRequests"
                                        :key="request.friendshipPublicId"
                                        :friendship-public-id="request.friendshipPublicId"
                                        :user="request.otherUser"
                                        :subtitle="request.message || formatDate(request.requestedAt)"
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
                                <div v-if="store.hasMoreIncoming" class="pt-3 text-center">
                                    <v-btn
                                        variant="text"
                                        color="primary"
                                        :loading="store.loadingMoreIncoming"
                                        :disabled="store.loadingMoreIncoming"
                                        @click="store.loadMoreIncoming()"
                                    >
                                        {{ t('friendsPage.loadMore') }}
                                    </v-btn>
                                </div>
                            </template>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="6" class="pa-3">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                            <div class="d-flex align-center ga-3 min-width-0">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <SendIcon class="text-primary" size="25" />
                                </v-avatar>
                                <div class="min-width-0">
                                    <h4 class="text-h4 mb-0">{{ t('friendsPage.requests.outgoingTitle') }}</h4>
                                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                                        {{ t('friendsPage.requests.outgoingSubtitle') }}
                                    </div>
                                </div>
                            </div>
                            <v-chip v-if="store.outgoingCount > 0" color="primary" size="small" variant="tonal">
                                {{ store.outgoingCount }}
                            </v-chip>
                        </div>

                        <div class="mt-4">
                            <div v-if="store.loadingOutgoing && !store.outgoingRequests.length" class="py-6 text-center">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>
                            <div v-else-if="!store.outgoingRequests.length" class="py-6 text-center text-medium-emphasis">
                                {{ t('friendsPage.empty.outgoing') }}
                            </div>
                            <template v-else>
                                <v-list class="py-0 theme-list">
                                    <FriendListItem
                                        v-for="request in store.outgoingRequests"
                                        :key="request.friendshipPublicId"
                                        :friendship-public-id="request.friendshipPublicId"
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
                                <div v-if="store.hasMoreOutgoing" class="pt-3 text-center">
                                    <v-btn
                                        variant="text"
                                        color="primary"
                                        :loading="store.loadingMoreOutgoing"
                                        :disabled="store.loadingMoreOutgoing"
                                        @click="store.loadMoreOutgoing()"
                                    >
                                        {{ t('friendsPage.loadMore') }}
                                    </v-btn>
                                </div>
                            </template>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.requests-tab-content {
    padding: 4px 2px 12px;
}
</style>
