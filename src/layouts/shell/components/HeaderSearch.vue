<script setup lang="ts">
defineOptions({ name: 'HeaderSearch' });

import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
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

/**
 * Recherche du header, façon Swiss : icône + champ sans bordure dans la barre,
 * résultats dans un panneau carré à bordure noire sous le champ.
 */
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

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const panelOpen = ref(false);
const query = ref('');

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

function clearFriendResults() {
    friendsSearchRequestId += 1;
    friendResults.value = [];
    friendsLoading.value = false;
    friendsError.value = null;
}

function closePanel() {
    panelOpen.value = false;
}

function clearQuery() {
    query.value = '';
    clearFriendResults();
    void nextTick(() => input.value?.focus());
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
    closePanel();
    input.value?.blur();
    await router.push(item.href);
}

async function goToFriend(user: FriendSearchItem) {
    closePanel();
    input.value?.blur();
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
        closePanel();
        input.value?.blur();
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        void onEnter();
    }
}

function onPointerDown(event: PointerEvent) {
    if (!panelOpen.value) return;
    const target = event.target as Node | null;
    if (target && root.value?.contains(target)) return;
    closePanel();
}

watch(query, (value) => {
    scheduleFriendsSearch(value);
});

watch(panelOpen, (open) => {
    if (open) return;
    query.value = '';
    clearFriendResults();
    if (friendsSearchTimer) {
        clearTimeout(friendsSearchTimer);
        friendsSearchTimer = null;
    }
});

onMounted(() => document.addEventListener('pointerdown', onPointerDown, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true));
onUnmounted(() => {
    if (friendsSearchTimer) clearTimeout(friendsSearchTimer);
    friendsSearchRequestId += 1;
});
</script>

<template>
    <div ref="root" class="hsearch" :class="{ 'is-open': panelOpen }" @keydown="onKeydown">
        <label class="hsearch__field">
            <SearchIcon class="hsearch__icon" :size="18" stroke-width="1.7" aria-hidden="true" />
            <input
                ref="input"
                v-model="query"
                class="hsearch__input"
                type="search"
                :placeholder="t('header.search.placeholder')"
                :aria-label="t('header.search.placeholder')"
                autocomplete="off"
                aria-haspopup="listbox"
                :aria-expanded="panelOpen"
                @focus="panelOpen = true"
            />
            <button v-if="query" type="button" class="su-orb hsearch__clear" :aria-label="t('header.search.clear')" @click="clearQuery">
                <XIcon :size="16" stroke-width="1.8" />
            </button>
        </label>

        <div v-show="panelOpen" class="hsearch__panel">
            <div v-if="!hasResults" class="hsearch__empty">
                <template v-if="trimmedQuery.length > 0 && trimmedQuery.length < FRIEND_SEARCH_MIN">
                    {{ t('header.search.friendsHint') }}
                </template>
                <template v-else>
                    {{ t('header.search.empty') }}
                </template>
            </div>

            <div v-else class="hsearch__scroll">
                <section v-if="appItems.length" class="hsearch__group">
                    <p class="hsearch__title">{{ t('header.search.sectionApp') }}</p>
                    <button v-for="item in appItems" :key="item.href" type="button" class="su-menu-item" @click="goTo(item)">
                        <span class="su-menu-item__icon">
                            <component :is="iconFor(item)" :size="18" stroke-width="1.6" />
                        </span>
                        <span class="min-width-0">
                            <p class="su-menu-item__title">{{ t(item.titleKey) }}</p>
                            <p class="su-menu-item__desc">{{ t(item.subtitleKey) }}</p>
                        </span>
                    </button>
                </section>

                <section v-if="siteItems.length" class="hsearch__group">
                    <p class="hsearch__title">{{ t('header.search.sectionSite') }}</p>
                    <button v-for="item in siteItems" :key="item.href" type="button" class="su-menu-item" @click="goTo(item)">
                        <span class="su-menu-item__icon">
                            <component :is="iconFor(item)" :size="18" stroke-width="1.6" />
                        </span>
                        <span class="min-width-0">
                            <p class="su-menu-item__title">{{ t(item.titleKey) }}</p>
                            <p class="su-menu-item__desc">{{ t(item.subtitleKey) }}</p>
                        </span>
                    </button>
                </section>

                <section v-if="canSearchFriends" class="hsearch__group">
                    <p class="hsearch__title">{{ t('header.search.sectionFriends') }}</p>
                    <p v-if="friendsError" class="hsearch__note hsearch__note--error">{{ friendsError }}</p>
                    <p v-else-if="friendsLoading && !hasFriendResults" class="hsearch__note">{{ t('header.search.friendsLoading') }}</p>
                    <p v-else-if="!hasFriendResults" class="hsearch__note">{{ t('header.search.friendsEmpty') }}</p>
                    <template v-else>
                        <button
                            v-for="user in friendResults"
                            :key="user.publicId"
                            type="button"
                            class="su-menu-item"
                            @click="goToFriend(user)"
                        >
                            <UserPhotoAvatar :photo-url="user.profilePicture" :fallback-label="friendLabel(user)" :size="36" />
                            <span class="min-width-0">
                                <p class="su-menu-item__title">{{ friendLabel(user) }}</p>
                                <p class="su-menu-item__desc">{{ friendSubtitle(user) }}</p>
                            </span>
                        </button>
                    </template>
                </section>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hsearch {
    position: relative;
    flex: 1 1 320px;
    min-width: 0;
    max-width: 440px;
}

.hsearch__field {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 40px;
    cursor: text;
}

.hsearch__icon {
    flex: none;
    color: var(--ink);
}

.hsearch__input {
    flex: 1;
    min-width: 0;
    height: 40px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
}

.hsearch__input:focus,
.hsearch__input:focus-visible {
    outline: none;
    box-shadow: none;
}

.hsearch__input::placeholder {
    color: var(--gray);
}

.hsearch__input::-webkit-search-cancel-button {
    display: none;
}

.hsearch__clear {
    width: 32px;
    height: 32px;
}

.hsearch__panel {
    position: absolute;
    top: calc(100% + 16px);
    left: -12px;
    z-index: 20;
    width: min(420px, calc(100vw - 32px));
    max-height: min(480px, 70vh);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--raise);
    border: 1px solid var(--ink);
    box-shadow: var(--shadow-offset);
}

.hsearch__scroll {
    overflow-y: auto;
    padding: 8px;
}

.hsearch__group + .hsearch__group {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
}

.hsearch__title {
    margin: 4px 10px 4px;
    color: var(--gray);
    font-size: 12px;
}

.hsearch__empty,
.hsearch__note {
    margin: 0;
    padding: 20px 16px;
    color: var(--gray);
    font-size: 13.5px;
    text-align: center;
}

.hsearch__note {
    padding: 12px 10px;
    text-align: left;
}

.hsearch__note--error {
    color: var(--danger);
}

@media (max-width: 767px) {
    .hsearch {
        flex: 1 1 auto;
        max-width: none;
    }
    .hsearch__panel {
        left: -8px;
        width: calc(100vw - 16px);
    }
}
</style>
