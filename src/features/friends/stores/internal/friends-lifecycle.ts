import type { FriendsState } from './friends-state';
import type { FriendsLists } from './friends-lists';
import type { FriendsRealtime } from './friends-realtime';

export type FriendsTab = 'Friends' | 'Requests' | 'Blocked' | 'Discover';

/**
 * Bootstrap / openTab / idle prefetch / reset du store amis.
 */
export function createFriendsLifecycle(
    state: FriendsState,
    lists: FriendsLists,
    realtime: FriendsRealtime
) {
    const { initialized, cache, resetListState } = state;
    const { loadFriends, loadIncoming, loadOutgoing, loadBlocked, refreshSearchIfNeeded } = lists;
    const { ensureRealtimeBridge, teardownRealtimeBridge } = realtime;

    let prefetchTimer: ReturnType<typeof setTimeout> | number | null = null;

    function cancelIdlePrefetch() {
        if (prefetchTimer == null) return;
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(prefetchTimer as number);
        }
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
    }

    function scheduleIdlePrefetch(tab: FriendsTab) {
        if (import.meta.env.VITEST) return;
        cancelIdlePrefetch();
        const run = () => {
            prefetchTimer = null;
            if (tab !== 'Requests') void loadIncoming().catch(() => undefined);
        };
        if (typeof requestIdleCallback === 'function') {
            prefetchTimer = requestIdleCallback(run, { timeout: 2000 });
            return;
        }
        prefetchTimer = setTimeout(run, 2000);
    }

    async function openTab(tab: FriendsTab) {
        ensureRealtimeBridge();
        if (tab === 'Friends') {
            await loadFriends();
            return;
        }
        if (tab === 'Requests') {
            await Promise.all([loadIncoming(), loadOutgoing()]);
            return;
        }
        if (tab === 'Blocked') {
            await loadBlocked();
            return;
        }
        if (tab === 'Discover') {
            await loadOutgoing();
            refreshSearchIfNeeded();
        }
    }

    async function bootstrap(tab: FriendsTab = 'Friends') {
        ensureRealtimeBridge();
        await openTab(tab);
        if (!initialized.value) {
            initialized.value = true;
            scheduleIdlePrefetch(tab);
        }
    }

    function reset() {
        cancelIdlePrefetch();
        cache.reset();
        resetListState();
        teardownRealtimeBridge();
    }

    return {
        bootstrap,
        openTab,
        reset
    };
}
