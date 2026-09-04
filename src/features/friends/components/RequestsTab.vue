<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { InboxIcon, SendIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import FriendListItem from '@/features/friends/components/FriendListItem.vue';
import { useFriendsStore } from '@/features/friends/stores/friends-store';

const { t, locale } = useI18n();
const store = useFriendsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
</script>

<template>
    <div>
        <AppAlert v-if="store.error" type="error" density="default" class="su-alert" closable @dismiss="store.error = null">
            {{ store.error }}
        </AppAlert>

        <div class="su-split">
            <section class="su-surface">
                <header class="su-panel__head">
                    <span class="su-panel__icon"><InboxIcon :size="20" stroke-width="1.5" /></span>
                    <div>
                        <h2>{{ t('friendsPage.requests.incomingTitle') }}</h2>
                        <p>{{ t('friendsPage.requests.incomingSubtitle') }}</p>
                    </div>
                    <span v-if="store.incomingCount > 0" class="su-panel__chip">{{ store.incomingCount }}</span>
                </header>

                <div v-if="store.loadingIncoming && !store.incomingRequests.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.incomingRequests.length" class="su-empty">
                    {{ t('friendsPage.empty.incoming') }}
                </div>
                <template v-else>
                    <FriendListItem
                        v-for="(request, i) in store.incomingRequests"
                        :key="request.friendshipPublicId"
                        variant="glass"
                        :index="i"
                        :friendship-public-id="request.friendshipPublicId"
                        :user="request.otherUser"
                        :subtitle="request.message || formatDate(request.requestedAt)"
                    >
                        <template #actions>
                            <button
                                class="su-btn su-btn--ink"
                                type="button"
                                :disabled="store.acting"
                                @click.stop="store.acceptRequest(request.friendshipPublicId)"
                            >
                                {{ t('friendsPage.actions.accept') }}
                            </button>
                            <button
                                class="su-btn su-btn--danger"
                                type="button"
                                :disabled="store.acting"
                                @click.stop="store.refuseRequest(request.friendshipPublicId)"
                            >
                                {{ t('friendsPage.actions.refuse') }}
                            </button>
                            <button
                                class="su-btn su-btn--warn"
                                type="button"
                                :disabled="store.acting"
                                @click.stop="store.blockUser(request.otherUser.publicId)"
                            >
                                {{ t('friendsPage.actions.block') }}
                            </button>
                        </template>
                    </FriendListItem>
                    <div v-if="store.hasMoreIncoming" class="su-more">
                        <button
                            class="su-btn su-btn--ghost"
                            type="button"
                            :disabled="store.loadingMoreIncoming"
                            @click="store.loadMoreIncoming()"
                        >
                            {{ t('friendsPage.loadMore') }}
                        </button>
                    </div>
                </template>
            </section>

            <section class="su-surface">
                <header class="su-panel__head">
                    <span class="su-panel__icon"><SendIcon :size="20" stroke-width="1.5" /></span>
                    <div>
                        <h2>{{ t('friendsPage.requests.outgoingTitle') }}</h2>
                        <p>{{ t('friendsPage.requests.outgoingSubtitle') }}</p>
                    </div>
                    <span v-if="store.outgoingCount > 0" class="su-panel__chip">{{ store.outgoingCount }}</span>
                </header>

                <div v-if="store.loadingOutgoing && !store.outgoingRequests.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.outgoingRequests.length" class="su-empty">
                    {{ t('friendsPage.empty.outgoing') }}
                </div>
                <template v-else>
                    <FriendListItem
                        v-for="(request, i) in store.outgoingRequests"
                        :key="request.friendshipPublicId"
                        variant="glass"
                        :index="i"
                        :friendship-public-id="request.friendshipPublicId"
                        :user="request.otherUser"
                        :subtitle="request.message || formatDate(request.requestedAt)"
                    >
                        <template #actions>
                            <button
                                class="su-btn su-btn--danger"
                                type="button"
                                :disabled="store.acting"
                                @click.stop="store.cancelRequest(request.friendshipPublicId)"
                            >
                                {{ t('friendsPage.actions.cancel') }}
                            </button>
                        </template>
                    </FriendListItem>
                    <div v-if="store.hasMoreOutgoing" class="su-more">
                        <button
                            class="su-btn su-btn--ghost"
                            type="button"
                            :disabled="store.loadingMoreOutgoing"
                            @click="store.loadMoreOutgoing()"
                        >
                            {{ t('friendsPage.loadMore') }}
                        </button>
                    </div>
                </template>
            </section>
        </div>
    </div>
</template>
