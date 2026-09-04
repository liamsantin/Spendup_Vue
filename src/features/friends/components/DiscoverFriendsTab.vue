<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserHeartIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import FriendListItem from '@/features/friends/components/FriendListItem.vue';
import { getFriendDisplayName } from '@/features/friends/display-name';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import type { FriendSearchItem } from '@/features/friends/types';

const { t } = useI18n();
const store = useFriendsStore();

const requestOpen = ref(false);
const requestTarget = ref<FriendSearchItem | null>(null);
const requestMessage = ref('');

const requestDisplayName = computed(() => (requestTarget.value ? getFriendDisplayName(requestTarget.value) : ''));

function outgoingPendingId(user: FriendSearchItem): string | undefined {
    if (user.friendshipStatus !== 'pending') return undefined;
    return store.outgoingRequestFor(user.publicId)?.friendshipPublicId;
}

function openRequestModal(user: FriendSearchItem) {
    requestTarget.value = user;
    requestMessage.value = '';
    requestOpen.value = true;
}

function onRequestOpenChange(open: boolean) {
    requestOpen.value = open;
    if (!open) {
        requestTarget.value = null;
        requestMessage.value = '';
    }
}

async function confirmSendRequest() {
    const publicId = requestTarget.value?.publicId;
    if (!publicId) return;
    try {
        await store.sendRequest(publicId, requestMessage.value);
        requestOpen.value = false;
        requestTarget.value = null;
        requestMessage.value = '';
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

        <div v-if="store.searching && !store.searchResults.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="store.searchQuery.trim().length >= 2 && !store.searchResults.length" class="su-empty">
            <span class="su-empty__mark"><UserHeartIcon :size="24" stroke-width="1.5" /></span>
            {{ t('friendsPage.empty.search') }}
        </div>
        <div v-else-if="store.searchQuery.trim().length < 2" class="su-empty">
            <span class="su-empty__mark"><UserHeartIcon :size="24" stroke-width="1.5" /></span>
            {{ t('friendsPage.discover.startTyping') }}
        </div>
        <div v-else class="su-surface">
            <FriendListItem
                v-for="(user, i) in store.searchResults"
                :key="user.publicId"
                variant="glass"
                :index="i"
                :user="user"
                :subtitle="user.username || user.publicId"
            >
                <template #actions>
                    <template v-if="outgoingPendingId(user)">
                        <span class="su-chip">{{ t('friendsPage.status.pending') }}</span>
                        <button
                            class="su-btn su-btn--danger"
                            type="button"
                            :disabled="store.acting"
                            @click.stop="store.cancelRequest(outgoingPendingId(user)!)"
                        >
                            {{ t('friendsPage.actions.cancel') }}
                        </button>
                    </template>
                    <span v-else-if="user.friendshipStatus" class="su-chip">
                        {{ t(`friendsPage.status.${user.friendshipStatus}`) }}
                    </span>
                    <button v-else class="su-btn su-btn--ink" type="button" :disabled="store.acting" @click.stop="openRequestModal(user)">
                        {{ t('friendsPage.actions.add') }}
                    </button>
                </template>
            </FriendListItem>
            <div v-if="store.hasMoreSearch" class="su-more">
                <button class="su-btn su-btn--ghost" type="button" :disabled="store.loadingMoreSearch" @click="store.loadMoreSearch()">
                    {{ t('friendsPage.loadMore') }}
                </button>
            </div>
        </div>

        <AppModalBase
            :model-value="requestOpen"
            :title="t('friendsPage.addModal.title')"
            :subtitle="t('friendsPage.addModal.subtitle', { name: requestDisplayName })"
            :max-width="480"
            :scrollable="false"
            @update:model-value="onRequestOpenChange"
        >
            <v-textarea
                v-model="requestMessage"
                :label="t('friendsPage.discover.messagePlaceholder')"
                :placeholder="t('friendsPage.discover.messagePlaceholder')"
                variant="outlined"
                rows="3"
                auto-grow
                hide-details="auto"
                maxlength="300"
                counter
            />

            <template #footer="{ close }">
                <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                    {{ t('common.cancel') }}
                </button>
                <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="confirmSendRequest">
                    {{ t('friendsPage.addModal.confirm') }}
                </button>
            </template>
        </AppModalBase>
    </div>
</template>
