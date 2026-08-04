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
    void store.loadBlocked().catch(() => undefined);
});
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.error = null">
        {{ store.error }}
    </AppAlert>

    <div v-if="store.loadingBlocked" class="py-8 text-center">
        <v-progress-circular indeterminate color="primary" size="32" />
    </div>
    <div v-else-if="!store.blockedUsers.length" class="py-8 text-center text-medium-emphasis">
        {{ t('friendsPage.empty.blocked') }}
    </div>
    <v-list v-else class="py-0 theme-list">
        <FriendListItem
            v-for="item in store.blockedUsers"
            :key="item.friendshipPublicId"
            :user="item.user"
            :subtitle="t('friendsPage.blocked.blockedAt', { date: formatDate(item.blockedAt) })"
        >
            <template #actions>
                <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    :disabled="store.acting"
                    @click.stop="store.unblockUser(item.user.publicId)"
                >
                    {{ t('friendsPage.actions.unblock') }}
                </v-btn>
            </template>
        </FriendListItem>
    </v-list>
</template>
