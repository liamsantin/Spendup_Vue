<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import FriendListItem from './FriendListItem.vue';
import { useFriendsStore } from '../stores/friends-store';
import type { FriendSearchItem } from '../types';

const { t } = useI18n();
const store = useFriendsStore();

const requestOpen = ref(false);
const requestTarget = ref<FriendSearchItem | null>(null);
const requestMessage = ref('');

const requestDisplayName = computed(() => {
    const user = requestTarget.value;
    if (!user) return '';
    const fullName = [user.firstName, user.name].filter(Boolean).join(' ').trim();
    return fullName || user.username || user.publicId;
});

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
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.searching && !store.searchResults.length" class="py-8 text-center">
        <v-progress-circular indeterminate color="primary" size="32" />
    </div>
    <div v-else-if="store.searchQuery.trim().length >= 2 && !store.searchResults.length" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.empty.search') }}
    </div>
    <div v-else-if="store.searchQuery.trim().length < 2" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.discover.startTyping') }}
    </div>
    <template v-else>
        <v-list class="py-0 theme-list">
            <FriendListItem
                v-for="user in store.searchResults"
                :key="user.publicId"
                :user="user"
                :subtitle="user.username || user.publicId"
            >
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
                    <v-btn v-else size="small" color="primary" :disabled="store.acting" @click.stop="openRequestModal(user)">
                        {{ t('friendsPage.actions.add') }}
                    </v-btn>
                </template>
            </FriendListItem>
        </v-list>
        <div v-if="store.hasMoreSearch" class="pt-4 text-center">
            <v-btn
                variant="text"
                color="primary"
                :loading="store.loadingMoreSearch"
                :disabled="store.loadingMoreSearch"
                @click="store.loadMoreSearch()"
            >
                {{ t('friendsPage.loadMore') }}
            </v-btn>
        </div>
    </template>

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
            <v-btn variant="text" flat :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" @click="confirmSendRequest">
                {{ t('friendsPage.addModal.confirm') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
