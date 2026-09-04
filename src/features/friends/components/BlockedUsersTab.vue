<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ShieldLockIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import FriendListItem from '@/features/friends/components/FriendListItem.vue';
import { useFriendsStore } from '@/features/friends/stores/friends-store';

const { t, locale } = useI18n();
const store = useFriendsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium' }).format(new Date(value));
}
</script>

<template>
    <div>
        <AppAlert v-if="store.error" type="error" density="default" class="su-alert" closable @dismiss="store.error = null">
            {{ store.error }}
        </AppAlert>

        <div v-if="store.loadingBlocked && !store.blockedUsers.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!store.blockedUsers.length" class="su-empty">
            <span class="su-empty__mark"><ShieldLockIcon :size="24" stroke-width="1.5" /></span>
            {{ t('friendsPage.empty.blocked') }}
        </div>
        <div v-else class="su-surface">
            <FriendListItem
                v-for="(item, i) in store.blockedUsers"
                :key="item.friendshipPublicId"
                variant="glass"
                :index="i"
                :friendship-public-id="item.friendshipPublicId"
                :user="item.user"
                :subtitle="t('friendsPage.blocked.blockedAt', { date: formatDate(item.blockedAt) })"
            >
                <template #actions>
                    <button
                        class="su-btn su-btn--ink"
                        type="button"
                        :disabled="store.acting"
                        @click.stop="store.unblockUser(item.user.publicId)"
                    >
                        {{ t('friendsPage.actions.unblock') }}
                    </button>
                </template>
            </FriendListItem>
            <div v-if="store.hasMoreBlocked" class="su-more">
                <button class="su-btn su-btn--ghost" type="button" :disabled="store.loadingMoreBlocked" @click="store.loadMoreBlocked()">
                    {{ t('friendsPage.loadMore') }}
                </button>
            </div>
        </div>
    </div>
</template>
