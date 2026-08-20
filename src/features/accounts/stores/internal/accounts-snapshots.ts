import { accountsApi } from '../../api';
import type { CreateBalanceSnapshotPayload } from '../../types';
import type { AccountsState } from './accounts-state';

export function createAccountsSnapshots(state: AccountsState) {
    const { balanceSnapshots, snapshotsByAccountId, loadingSnapshots, acting, error, cache, clearError, setSnapshotsForAccount } = state;

    async function loadBalanceSnapshots(accountPublicId: string, force = false) {
        await cache.ensure(
            `snapshots:${accountPublicId}`,
            async () => {
                loadingSnapshots.value = true;
                clearError();
                try {
                    const result = await accountsApi.listBalanceSnapshots(accountPublicId);
                    setSnapshotsForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
                } catch (e: unknown) {
                    error.value = e instanceof Error ? e.message : String(e);
                    throw e;
                } finally {
                    loadingSnapshots.value = false;
                }
            },
            { force }
        );
        balanceSnapshots.value = snapshotsByAccountId.get(accountPublicId) ?? [];
    }

    async function createBalanceSnapshot(accountPublicId: string, payload: CreateBalanceSnapshotPayload) {
        acting.value = true;
        clearError();
        try {
            const snapshot = await accountsApi.createBalanceSnapshot(accountPublicId, payload);
            const current = snapshotsByAccountId.get(accountPublicId) ?? balanceSnapshots.value;
            setSnapshotsForAccount(accountPublicId, [snapshot, ...current]);
            cache.touch(`snapshots:${accountPublicId}`);
            return snapshot;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    async function deleteBalanceSnapshot(accountPublicId: string, snapshotPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.deleteBalanceSnapshot(accountPublicId, snapshotPublicId);
            const current = snapshotsByAccountId.get(accountPublicId) ?? balanceSnapshots.value;
            setSnapshotsForAccount(
                accountPublicId,
                current.filter((s) => s.publicId !== snapshotPublicId)
            );
            cache.touch(`snapshots:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            acting.value = false;
        }
    }

    return {
        loadBalanceSnapshots,
        createBalanceSnapshot,
        deleteBalanceSnapshot
    };
}

export type AccountsSnapshots = ReturnType<typeof createAccountsSnapshots>;
