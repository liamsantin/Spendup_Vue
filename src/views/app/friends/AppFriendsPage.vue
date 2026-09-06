<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { BellPlusIcon, CameraIcon, SearchIcon, ShieldLockIcon, UserHeartIcon, UsersIcon, XIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/tabs/AppTabsShell.vue';
import { BlockedUsersTab, DiscoverFriendsTab, FriendQrModal, FriendsTab, RequestsTab, useFriendsStore } from '@/features/friends';

const FRIEND_TABS = ['Friends', 'Requests', 'Discover', 'Blocked'] as const;
type FriendTab = (typeof FRIEND_TABS)[number];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFriendsStore();
const qrOpen = ref(false);

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
const syncingTabFromRoute = ref(false);
const discoverSearching = computed(() => tab.value === 'Discover' && store.searchQuery.trim().length > 0);

const tabs = computed(() => [
    { value: 'Friends' as const, label: t('friendsPage.tabs.friends'), icon: UsersIcon },
    {
        value: 'Requests' as const,
        label: t('friendsPage.tabs.requests'),
        icon: BellPlusIcon,
        chip: store.incomingCount > 0 ? store.incomingCount : undefined
    },
    { value: 'Discover' as const, label: t('friendsPage.tabs.discover'), icon: UserHeartIcon },
    { value: 'Blocked' as const, label: t('friendsPage.tabs.blocked'), icon: ShieldLockIcon }
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

function syncTabQuery(value: FriendTab) {
    const nextQuery: Record<string, string | string[] | undefined> = {
        ...route.query,
        tab: value
    };
    if (value !== 'Friends' && value !== 'Requests') {
        delete nextQuery.friendship;
    }
    if (route.query.tab === value && String(route.query.friendship ?? '') === String(nextQuery.friendship ?? '')) {
        return;
    }
    void router.replace({ query: nextQuery });
}

async function onQrScanned(publicId: string) {
    tab.value = 'Discover';
    try {
        await store.searchUsers(publicId);
    } catch {
        // erreur via store.error
    }
}

onMounted(() => {
    store.setFocusFriendship(friendshipFromQuery());
    syncTabQuery(tab.value);
    void store
        .bootstrap(tab.value)
        .then(() => scrollToFocusedFriendship())
        .catch(() => undefined);
});

watch(
    () => route.query.tab,
    () => {
        const next = tabFromQuery();
        if (next === tab.value) return;
        syncingTabFromRoute.value = true;
        tab.value = next;
        void nextTick(() => {
            syncingTabFromRoute.value = false;
        });
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
    if (!syncingTabFromRoute.value) {
        syncTabQuery(value);
    }
    void store
        .openTab(value)
        .then(() => scrollToFocusedFriendship())
        .catch(() => undefined);
});
</script>

<template>
    <AppTabsShell
        v-model="tab"
        :tabs="tabs"
        :title="t('friendsPage.title')"
        :subtitle="discoverSearching ? undefined : t('friendsPage.subtitle')"
        hide-actions
        :class="{ 'su-page--discover-idle': tab === 'Discover' && !discoverSearching }"
        :hero-class="{ 'su-hero--searching': discoverSearching }"
    >
        <template v-if="tab === 'Discover'" #toolbar>
            <div class="su-search su-search--discover">
                <button
                    class="su-search__orb"
                    type="button"
                    :aria-label="t('friendsPage.discover.openQr')"
                    :title="t('friendsPage.discover.openQr')"
                    @click="qrOpen = true"
                >
                    <CameraIcon :size="20" stroke-width="1.5" />
                </button>
                <SearchIcon :size="18" stroke-width="1.5" class="su-search__icon" />
                <input
                    class="su-search__input"
                    type="search"
                    :value="store.searchQuery"
                    :placeholder="t('friendsPage.discover.searchLabel')"
                    :aria-label="t('friendsPage.discover.searchLabel')"
                    @input="store.searchUsers(String(($event.target as HTMLInputElement).value || ''))"
                />
                <button
                    v-if="store.searchQuery"
                    class="su-search__orb"
                    type="button"
                    :aria-label="t('header.search.clear')"
                    @click="store.clearSearch()"
                >
                    <XIcon :size="16" stroke-width="1.5" />
                </button>
            </div>
        </template>

        <Transition name="su-pane" mode="out-in">
            <FriendsTab v-if="tab === 'Friends'" key="Friends" />
            <RequestsTab v-else-if="tab === 'Requests'" key="Requests" />
            <DiscoverFriendsTab v-else-if="tab === 'Discover'" key="Discover" />
            <BlockedUsersTab v-else key="Blocked" />
        </Transition>
    </AppTabsShell>

    <FriendQrModal v-model="qrOpen" @scanned="onQrScanned" />
</template>
