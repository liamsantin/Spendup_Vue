<script setup lang="ts">
defineOptions({ name: 'AppSearchbar' });

import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
    BellIcon,
    HomeIcon,
    InfoCircleIcon,
    LayoutDashboardIcon,
    SearchIcon,
    SparklesIcon,
    UserCircleIcon,
    UsersIcon,
    XIcon
} from 'vue-tabler-icons';
import { searchSugg } from '@/data/admin/headerData';
import { friendsApi, getFriendDisplayName, UserPhotoAvatar, useFriendsStore } from '@/features/friends';
import type { FriendSearchItem } from '@/features/friends';
import type { searchType } from '@/types/HeaderTypes';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { useHeaderMenuOverlay } from './useHeaderMenuOverlay';

const SEARCH_ICONS = {
    dashboard: LayoutDashboardIcon,
    notifications: BellIcon,
    friends: UsersIcon,
    account: UserCircleIcon,
    home: HomeIcon,
    features: SparklesIcon,
    about: InfoCircleIcon
} as const;

const FRIEND_SEARCH_MIN = 2;
const FRIEND_SEARCH_PAGE_SIZE = 5;
const FRIEND_SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const router = useRouter();
const friendsStore = useFriendsStore();
const { scrim, opacity } = useHeaderMenuOverlay();

const menuOpen = ref(false);
const query = ref('');
const searchInput = ref<{ focus: () => void } | null>(null);

const friendResults = ref<FriendSearchItem[]>([]);
const friendsLoading = ref(false);
const friendsError = ref<string | null>(null);
let friendsSearchTimer: ReturnType<typeof setTimeout> | null = null;
let friendsSearchRequestId = 0;

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase());
const trimmedQuery = computed(() => query.value.trim());
const canSearchFriends = computed(() => trimmedQuery.value.length >= FRIEND_SEARCH_MIN);

const filteredItems = computed(() => {
    const q = normalizedQuery.value;
    if (!q) return searchSugg;
    return searchSugg.filter((item) => {
        const title = String(t(item.titleKey)).toLocaleLowerCase();
        const subtitle = String(t(item.subtitleKey)).toLocaleLowerCase();
        return title.includes(q) || subtitle.includes(q) || item.href.toLocaleLowerCase().includes(q);
    });
});

const appItems = computed(() => filteredItems.value.filter((item) => item.group === 'app'));
const siteItems = computed(() => filteredItems.value.filter((item) => item.group === 'site'));
const hasPageResults = computed(() => filteredItems.value.length > 0);
const hasFriendResults = computed(() => friendResults.value.length > 0);
const hasResults = computed(() => hasPageResults.value || hasFriendResults.value || (canSearchFriends.value && friendsLoading.value));

function friendLabel(user: FriendSearchItem): string {
    return getFriendDisplayName(user);
}

function friendSubtitle(user: FriendSearchItem): string {
    const handle = user.username ? `@${user.username}` : user.publicId;
    if (!user.friendshipStatus) return handle;
    return `${handle} · ${t(`friendsPage.status.${user.friendshipStatus}`)}`;
}

function closeMenu() {
    menuOpen.value = false;
}

function clearFriendResults() {
    friendsSearchRequestId += 1;
    friendResults.value = [];
    friendsLoading.value = false;
    friendsError.value = null;
}

function clearQuery() {
    query.value = '';
    clearFriendResults();
    void nextTick(() => searchInput.value?.focus());
}

function iconFor(item: searchType) {
    return SEARCH_ICONS[item.icon];
}

async function runFriendsSearch(q: string) {
    const requestId = ++friendsSearchRequestId;
    friendsLoading.value = true;
    friendsError.value = null;
    try {
        const result = await friendsApi.search({ q, page: 1, pageSize: FRIEND_SEARCH_PAGE_SIZE });
        if (requestId !== friendsSearchRequestId) return;
        friendResults.value = Array.isArray(result?.items) ? result.items : [];
    } catch (e: unknown) {
        if (requestId !== friendsSearchRequestId) return;
        friendResults.value = [];
        friendsError.value = e instanceof Error ? e.message : String(e);
    } finally {
        if (requestId === friendsSearchRequestId) {
            friendsLoading.value = false;
        }
    }
}

function scheduleFriendsSearch(q: string) {
    if (friendsSearchTimer) clearTimeout(friendsSearchTimer);
    if (q.trim().length < FRIEND_SEARCH_MIN) {
        clearFriendResults();
        return;
    }
    friendsLoading.value = true;
    friendsSearchTimer = setTimeout(() => {
        void runFriendsSearch(q.trim());
    }, FRIEND_SEARCH_DEBOUNCE_MS);
}

async function goTo(item: searchType) {
    closeMenu();
    await router.push(item.href);
}

async function goToFriend(user: FriendSearchItem) {
    closeMenu();
    const q = user.username?.trim() || user.publicId;
    await router.push({ path: '/app/friends', query: { tab: 'Discover' } });
    try {
        await friendsStore.searchUsers(q);
    } catch {
        // erreur via store.error
    }
}

async function onEnter() {
    const firstPage = filteredItems.value[0];
    if (firstPage) {
        await goTo(firstPage);
        return;
    }
    const firstFriend = friendResults.value[0];
    if (firstFriend) {
        await goToFriend(firstFriend);
    }
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        void onEnter();
    }
}

watch(query, (value) => {
    scheduleFriendsSearch(value);
});

watch(menuOpen, async (open) => {
    if (!open) {
        query.value = '';
        clearFriendResults();
        if (friendsSearchTimer) {
            clearTimeout(friendsSearchTimer);
            friendsSearchTimer = null;
        }
        return;
    }
    await nextTick();
    searchInput.value?.focus();
});

onUnmounted(() => {
    if (friendsSearchTimer) clearTimeout(friendsSearchTimer);
    friendsSearchRequestId += 1;
});
</script>

<template>
    <v-menu v-model="menuOpen" :close-on-content-click="false" :scrim="scrim" :opacity="opacity">
        <template #activator="{ props }">
            <button type="button" class="su-orb" v-bind="props" :aria-label="t('header.search.placeholder')">
                <SearchIcon stroke-width="1.5" :size="20" />
            </button>
        </template>
        <v-sheet width="360" elevation="0" rounded="md" class="su-menu" @keydown="onKeydown">
            <div class="pa-5 pb-4">
                <v-text-field
                    ref="searchInput"
                    v-model="query"
                    :placeholder="t('header.search.placeholder')"
                    color="primary"
                    density="compact"
                    variant="outlined"
                    hide-details
                    autofocus
                    clearable
                    :clear-icon="XIcon"
                    :loading="friendsLoading"
                    @click:clear="clearQuery"
                >
                    <template #prepend-inner>
                        <SearchIcon stroke-width="1.5" size="18" class="text-medium-emphasis" />
                    </template>
                </v-text-field>
            </div>
            <v-divider />

            <div v-if="!hasResults" class="px-8 py-8 text-center text-medium-emphasis text-body-2">
                <template v-if="trimmedQuery.length > 0 && trimmedQuery.length < FRIEND_SEARCH_MIN">
                    {{ t('header.search.friendsHint') }}
                </template>
                <template v-else>
                    {{ t('header.search.empty') }}
                </template>
            </div>

            <perfect-scrollbar v-else style="max-height: 360px" :options="PERFECT_SCROLLBAR_OPTIONS">
                <div v-if="appItems.length" class="pt-4">
                    <h6 class="text-subtitle-2 text-medium-emphasis px-5 mb-1">{{ t('header.search.sectionApp') }}</h6>
                    <v-list class="py-0" lines="two">
                        <v-list-item
                            v-for="item in appItems"
                            :key="item.href"
                            :value="item.href"
                            color="primary"
                            class="px-5 py-2"
                            @click="goTo(item)"
                        >
                            <template #prepend>
                                <v-avatar size="40" color="lightprimary" rounded="md" class="mr-3">
                                    <component :is="iconFor(item)" size="20" stroke-width="1.5" class="text-primary" />
                                </v-avatar>
                            </template>
                            <v-list-item-title class="text-subtitle-1 font-weight-bold">
                                {{ t(item.titleKey) }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-body-2">
                                {{ t(item.subtitleKey) }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </div>

                <div v-if="siteItems.length" :class="appItems.length ? 'pt-2' : 'pt-4'">
                    <h6 class="text-subtitle-2 text-medium-emphasis px-5 mb-1">{{ t('header.search.sectionSite') }}</h6>
                    <v-list class="py-0" lines="two">
                        <v-list-item
                            v-for="item in siteItems"
                            :key="item.href"
                            :value="item.href"
                            color="primary"
                            class="px-5 py-2"
                            @click="goTo(item)"
                        >
                            <template #prepend>
                                <v-avatar size="40" color="lightprimary" rounded="md" class="mr-3">
                                    <component :is="iconFor(item)" size="20" stroke-width="1.5" class="text-primary" />
                                </v-avatar>
                            </template>
                            <v-list-item-title class="text-subtitle-1 font-weight-bold">
                                {{ t(item.titleKey) }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-body-2">
                                {{ t(item.subtitleKey) }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </div>

                <div v-if="canSearchFriends" :class="hasPageResults ? 'pt-2 pb-3' : 'pt-4 pb-3'">
                    <h6 class="text-subtitle-2 text-medium-emphasis px-5 mb-1">{{ t('header.search.sectionFriends') }}</h6>
                    <div v-if="friendsError" class="px-5 py-3 text-error text-body-2">{{ friendsError }}</div>
                    <div v-else-if="friendsLoading && !hasFriendResults" class="px-5 py-4 text-medium-emphasis text-body-2">
                        {{ t('header.search.friendsLoading') }}
                    </div>
                    <div v-else-if="!hasFriendResults" class="px-5 py-4 text-medium-emphasis text-body-2">
                        {{ t('header.search.friendsEmpty') }}
                    </div>
                    <v-list v-else class="py-0" lines="two">
                        <v-list-item
                            v-for="user in friendResults"
                            :key="user.publicId"
                            :value="user.publicId"
                            color="primary"
                            class="px-5 py-2"
                            @click="goToFriend(user)"
                        >
                            <template #prepend>
                                <UserPhotoAvatar
                                    class="mr-3"
                                    :photo-url="user.profilePicture"
                                    :fallback-label="friendLabel(user)"
                                    :size="40"
                                />
                            </template>
                            <v-list-item-title class="text-subtitle-1 font-weight-bold">
                                {{ friendLabel(user) }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-body-2">
                                {{ friendSubtitle(user) }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </div>
            </perfect-scrollbar>
        </v-sheet>
    </v-menu>
</template>
