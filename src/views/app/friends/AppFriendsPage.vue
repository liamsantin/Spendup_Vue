<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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

function friendshipFromQuery(): string | null {
    const raw = route.query.friendship;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
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

async function scrollToFocusedFriendship() {
    const id = store.focusFriendshipPublicId;
    if (!id) return;
    await nextTick();
    const el = document.querySelector(`[data-friendship-id="${CSS.escape(id)}"]`);
    if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

onMounted(() => {
    store.setFocusFriendship(friendshipFromQuery());
    void store
        .bootstrap()
        .then(() => scrollToFocusedFriendship())
        .catch(() => undefined);
});

watch(
    () => route.query.tab,
    () => {
        tab.value = tabFromQuery();
    }
);

watch(
    () => route.query.friendship,
    (value) => {
        store.setFocusFriendship(typeof value === 'string' ? value : null);
        void scrollToFocusedFriendship();
    }
);

watch(tab, (value) => {
    if (value === 'Friends' || value === 'Requests' || value === 'Blocked' || value === 'Discover') {
        void store
            .openTab(value)
            .then(() => scrollToFocusedFriendship())
            .catch(() => undefined);
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
