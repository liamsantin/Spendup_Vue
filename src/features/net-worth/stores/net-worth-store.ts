import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createNetWorthState,
    createNetWorthLoad,
    createNetWorthRealtime,
    createNetWorthLifecycle,
    NET_WORTH_MAX_AGE_MS,
    NET_WORTH_REFETCH_DEBOUNCE_MS
} from '@/features/net-worth/stores/internal';

export { NET_WORTH_MAX_AGE_MS, NET_WORTH_REFETCH_DEBOUNCE_MS };

export const useNetWorthStore = defineStore('net-worth', () => {
    const state = createNetWorthState();
    const load = createNetWorthLoad(state);
    const realtime = createNetWorthRealtime(state, { load: load.load });
    const lifecycle = createNetWorthLifecycle(state, {
        load: load.load,
        loadSnapshots: load.loadSnapshots,
        cancelPendingLoads: load.cancelPendingLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        overview: state.overview,
        snapshots: state.snapshots,
        loading: state.loading,
        loadingSnapshots: state.loadingSnapshots,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        lastLoadedAt: state.lastLoadedAt,
        clearError: state.clearError,
        load: load.load,
        loadSnapshots: load.loadSnapshots,
        takeSnapshot: load.takeSnapshot,
        refresh: load.refresh,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
