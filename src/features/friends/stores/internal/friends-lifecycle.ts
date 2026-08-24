import type { FriendsState } from '@/features/friends/stores/internal/friends-state';
import type { FriendsLists } from '@/features/friends/stores/internal/friends-lists';
import type { FriendsRealtime } from '@/features/friends/stores/internal/friends-realtime';

export type FriendsTab = 'Friends' | 'Requests' | 'Blocked' | 'Discover';

/**
 * Cycle de vie du store amis : onglets, bootstrap, prefetch idle, reset.
 * @param state État partagé du store.
 * @param lists Actions de chargement.
 * @param realtime Bridge realtime.
 * @returns Les actions de cycle de vie.
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

    /** Annule le prefetch planifié en idle. */
    function cancelIdlePrefetch() {
        if (prefetchTimer == null) return;
        if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(prefetchTimer as number);
        }
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
    }

    /**
     * Précharge en idle les demandes si l’onglet actif n’est pas `Requests`.
     * @param tab Onglet actuellement ouvert.
     */
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

    /**
     * Ouvre un onglet et charge les données associées.
     * @param tab Onglet à ouvrir.
     */
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

    /**
     * Premier chargement de la page amis + prefetch idle.
     * @param tab Onglet initial (défaut : `Friends`).
     */
    async function bootstrap(tab: FriendsTab = 'Friends') {
        ensureRealtimeBridge();
        await openTab(tab);
        if (!initialized.value) {
            initialized.value = true;
            scheduleIdlePrefetch(tab);
        }
    }

    /** Remet le store à zéro (logout / reset session). */
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
