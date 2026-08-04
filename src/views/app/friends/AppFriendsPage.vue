<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellPlusIcon, ShieldLockIcon, UserHeartIcon, UsersIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/AppTabsShell.vue';
import { BlockedUsersTab, DiscoverFriendsTab, FriendsTab, RequestsTab, useFriendsStore } from '@/features/friends';

const { t } = useI18n();
const store = useFriendsStore();
const tab = ref('Friends');

const tabs = computed(() => [
    { value: 'Friends', label: t('friendsPage.tabs.friends'), icon: UsersIcon },
    { value: 'Requests', label: t('friendsPage.tabs.requests'), icon: BellPlusIcon },
    { value: 'Discover', label: t('friendsPage.tabs.discover'), icon: UserHeartIcon },
    { value: 'Blocked', label: t('friendsPage.tabs.blocked'), icon: ShieldLockIcon }
]);

onMounted(() => {
    void store.bootstrap().catch(() => undefined);
});
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" align-tabs="center" hide-actions>
        <v-window v-model="tab">
            <v-window-item value="Friends">
                <FriendsTab />
            </v-window-item>
            <v-window-item value="Requests">
                <RequestsTab />
            </v-window-item>
            <v-window-item value="Discover">
                <DiscoverFriendsTab />
            </v-window-item>
            <v-window-item value="Blocked">
                <BlockedUsersTab />
            </v-window-item>
        </v-window>
    </AppTabsShell>
</template>
