import type { NetWorthLoad } from '@/features/net-worth/stores/internal/net-worth-load';
import type { NetWorthRealtime } from '@/features/net-worth/stores/internal/net-worth-realtime';
import type { NetWorthState } from '@/features/net-worth/stores/internal/net-worth-state';

type LifecycleDeps = Pick<NetWorthLoad, 'load' | 'loadSnapshots' | 'cancelPendingLoads'> &
    Pick<NetWorthRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createNetWorthLifecycle(state: NetWorthState, deps: LifecycleDeps) {
    const { overview, snapshots, loading, loadingSnapshots, acting, initialized, error, lastLoadedAt, snapshotsQuery, cache } = state;
    const { load, loadSnapshots, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    /** Branche le temps réel puis charge le calcul du jour et l’historique. */
    async function bootstrap() {
        ensureRealtimeBridge();
        await Promise.all([load(), loadSnapshots()]);
    }

    function reset() {
        cancelPendingLoads();
        teardownRealtimeBridge();
        cache.reset();
        overview.value = null;
        snapshots.value = [];
        loading.value = false;
        loadingSnapshots.value = false;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        lastLoadedAt.value = null;
        snapshotsQuery.value = {};
    }

    return { bootstrap, reset };
}

export type NetWorthLifecycle = ReturnType<typeof createNetWorthLifecycle>;
