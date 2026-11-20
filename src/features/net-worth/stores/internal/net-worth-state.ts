import { ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import type { ListSnapshotsQuery, NetWorthOverview, NetWorthSnapshot } from '@/features/net-worth/types';

export const NET_WORTH_MAX_AGE_MS = 30_000;
export const NET_WORTH_OVERVIEW_KEY = 'overview';

export function snapshotsCacheKey(query: ListSnapshotsQuery = {}): string {
    return `snapshots:${query.from?.trim() || 'default'}:${query.to?.trim() || 'default'}`;
}

export function createNetWorthState() {
    const overview = ref<NetWorthOverview | null>(null);
    const snapshots = ref<NetWorthSnapshot[]>([]);
    const loading = ref(false);
    const loadingSnapshots = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);
    const lastLoadedAt = ref<number | null>(null);
    /** Dernière requête d’historique, rejouée après un snapshot ou un « Actualiser ». */
    const snapshotsQuery = ref<ListSnapshotsQuery>({});

    const cache = createResourceCache({ defaultMaxAgeMs: NET_WORTH_MAX_AGE_MS });

    function clearError() {
        error.value = null;
    }

    return {
        overview,
        snapshots,
        loading,
        loadingSnapshots,
        acting,
        initialized,
        error,
        lastLoadedAt,
        snapshotsQuery,
        cache,
        clearError
    };
}

export type NetWorthState = ReturnType<typeof createNetWorthState>;
