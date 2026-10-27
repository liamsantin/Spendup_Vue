import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { ListSnapshotsQuery, NetWorthOverview, NetWorthSnapshot, SnapshotsListResult } from '@/features/net-worth/types';

function snapshotsQueryString(query: ListSnapshotsQuery = {}): string {
    const params = new URLSearchParams();
    const from = query.from?.trim();
    const to = query.to?.trim();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const netWorthApi = {
    /** Calcul du jour. */
    get() {
        return fetchWrapper.get('/api/net-worth') as Promise<NetWorthOverview>;
    },

    /** Historique mensuel, du plus ancien au plus récent. */
    listSnapshots(query: ListSnapshotsQuery = {}) {
        return fetchWrapper.get(`/api/net-worth/snapshots${snapshotsQueryString(query)}`) as Promise<SnapshotsListResult>;
    },

    /** Écrit ou réécrit le snapshot du mois courant (400 sans compte, actif ni passif). */
    takeSnapshot() {
        return fetchWrapper.post('/api/net-worth/snapshots', {}) as Promise<NetWorthSnapshot | null>;
    }
};
