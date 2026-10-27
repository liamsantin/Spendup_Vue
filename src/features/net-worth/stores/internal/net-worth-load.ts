import { AppError } from '@/utils/errors/app-error';
import { netWorthApi } from '@/features/net-worth/api';
import { normalizeOverview, normalizeSnapshotsResult } from '@/features/net-worth/format';
import type { ListSnapshotsQuery } from '@/features/net-worth/types';
import { NET_WORTH_OVERVIEW_KEY, snapshotsCacheKey, type NetWorthState } from '@/features/net-worth/stores/internal/net-worth-state';

export type LoadSnapshotsOptions = ListSnapshotsQuery & { force?: boolean };

export function createNetWorthLoad(state: NetWorthState) {
    const { overview, snapshots, loading, loadingSnapshots, acting, initialized, error, lastLoadedAt, snapshotsQuery, cache, clearError } =
        state;

    let overviewSeq = 0;
    let snapshotsSeq = 0;

    /** Calcul du jour, cache 30 s ; `force` après une mutation, un « Actualiser » ou un événement temps réel. */
    async function load(force = false): Promise<void> {
        const requestId = ++overviewSeq;
        loading.value = true;
        clearError();
        try {
            await cache.ensure(
                NET_WORTH_OVERVIEW_KEY,
                async () => {
                    const result = await netWorthApi.get();
                    if (requestId !== overviewSeq) return;
                    overview.value = normalizeOverview(result);
                    lastLoadedAt.value = Date.now();
                },
                { force }
            );
        } catch (e: unknown) {
            if (requestId === overviewSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === overviewSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
    }

    /** Historique mensuel (12 derniers mois par défaut), cache 30 s par plage. */
    async function loadSnapshots(options: LoadSnapshotsOptions = {}): Promise<void> {
        const { force = false, ...query } = options;
        const normalized: ListSnapshotsQuery = {};
        if (query.from?.trim()) normalized.from = query.from.trim();
        if (query.to?.trim()) normalized.to = query.to.trim();
        snapshotsQuery.value = normalized;
        const key = snapshotsCacheKey(normalized);
        const requestId = ++snapshotsSeq;
        loadingSnapshots.value = true;
        try {
            await cache.ensure(
                key,
                async () => {
                    const result = await netWorthApi.listSnapshots(normalized);
                    if (requestId !== snapshotsSeq) return;
                    snapshots.value = normalizeSnapshotsResult(result);
                },
                { force }
            );
        } catch (e: unknown) {
            if (requestId === snapshotsSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === snapshotsSeq) loadingSnapshots.value = false;
        }
    }

    /** « Photographier maintenant » : POST puis recharge du calcul et de l’historique. */
    async function takeSnapshot(): Promise<void> {
        if (acting.value) return;
        acting.value = true;
        clearError();
        try {
            await netWorthApi.takeSnapshot();
        } catch (e: unknown) {
            error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            acting.value = false;
        }
        await Promise.all([load(true), loadSnapshots({ ...snapshotsQuery.value, force: true })]);
    }

    async function refresh(): Promise<void> {
        await Promise.all([load(true), loadSnapshots({ ...snapshotsQuery.value, force: true })]);
    }

    function cancelPendingLoads() {
        overviewSeq += 1;
        snapshotsSeq += 1;
    }

    return { load, loadSnapshots, takeSnapshot, refresh, cancelPendingLoads };
}

export type NetWorthLoad = ReturnType<typeof createNetWorthLoad>;
