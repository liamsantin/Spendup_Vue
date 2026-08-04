<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { BellPlusIcon, ShieldLockIcon, UserHeartIcon, UsersIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/AppTabsShell.vue';
import { BlockedUsersTab, DiscoverFriendsTab, DiscoverSearchBar, FriendsTab, RequestsTab, useFriendsStore } from '@/features/friends';

const FRIEND_TABS = ['Friends', 'Requests', 'Discover', 'Blocked'] as const;
type FriendTab = (typeof FRIEND_TABS)[number];

const { t } = useI18n();
const route = useRoute();
const store = useFriendsStore();

function tabFromQuery(): FriendTab {
    const raw = route.query.tab;
    if (typeof raw === 'string' && (FRIEND_TABS as readonly string[]).includes(raw)) {
        return raw as FriendTab;
    }
    return 'Friends';
}

const tab = ref<FriendTab>(tabFromQuery());

const tabs = computed(() => [
    { value: 'Friends', label: t('friendsPage.tabs.friends'), icon: UsersIcon },
    {
        value: 'Requests',
        label: t('friendsPage.tabs.requests'),
        icon: BellPlusIcon,
        chip: store.incomingCount > 0 ? store.incomingCount : undefined
    },
    { value: 'Discover', label: t('friendsPage.tabs.discover'), icon: UserHeartIcon },
    { value: 'Blocked', label: t('friendsPage.tabs.blocked'), icon: ShieldLockIcon }
]);

onMounted(() => {
    void store.bootstrap().catch(() => undefined);
});

watch(
    () => route.query.tab,
    () => {
        tab.value = tabFromQuery();
    }
);

watch(tab, (value) => {
    if (value === 'Friends' || value === 'Requests' || value === 'Blocked' || value === 'Discover') {
        void store.openTab(value).catch(() => undefined);
    }
});
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" align-tabs="center" hide-actions>
        <template v-if="tab === 'Discover'" #toolbar>
            <DiscoverSearchBar />
        </template>

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
