import { accountsApi } from '@/features/accounts/api';
import { canWriteBalanceSnapshots } from '@/features/accounts/rights';
import type { AccountBalanceSnapshot, CreateBalanceSnapshotPayload } from '@/features/accounts/types';
import {
    assertAccountAllowed,
    requireLocalAccount
} from '@/features/accounts/stores/internal/accounts-authz';
import type { AccountsState } from '@/features/accounts/stores/internal/accounts-state';

/** Ordre UI / chip écart : plus récent `snapshotAt` d’abord, puis `createdAt`. */
function sortSnapshotsDesc(items: AccountBalanceSnapshot[]): AccountBalanceSnapshot[] {
    return [...items].sort((a, b) => {
        const byAt = b.snapshotAt.localeCompare(a.snapshotAt);
        if (byAt !== 0) return byAt;
        return b.createdAt.localeCompare(a.createdAt);
    });
}

/**
 * Actions liées aux snapshots de solde.
 * @param state État partagé du store.
 * @returns Les actions snapshots.
 */
export function createAccountsSnapshots(state: AccountsState) {
    const {
        accounts,
        snapshotsByAccountId,
        selectedAccount,
        loadingSnapshots,
        loadingMoreSnapshots,
        snapshotsPage,
        snapshotsPageSize,
        snapshotsTotalCount,
        error,
        cache,
        clearError,
        beginActing,
        endActing,
        setSnapshotsForAccount,
        activateSnapshotsView
    } = state;

    /** Incrémente à chaque `loadBalanceSnapshots` — ignore les réponses tardives d’un autre compte. */
    let snapshotsRequestSeq = 0;

    /**
     * Charge l’historique des snapshots de solde d’un compte (page 1).
     * @param accountPublicId Identifiant public du compte.
     * @param force Si `true`, ignore le TTL et refetch.
     */
    async function loadBalanceSnapshots(accountPublicId: string, force = false) {
        const requestId = ++snapshotsRequestSeq;
        await cache.ensure(
            `snapshots:${accountPublicId}`,
            async () => {
                if (requestId === snapshotsRequestSeq) {
                    loadingSnapshots.value = true;
                    clearError();
                }
                try {
                    const result = await accountsApi.listBalanceSnapshots(accountPublicId, { page: 1, pageSize: 50 });
                    const items = Array.isArray(result?.items) ? result.items : [];
                    setSnapshotsForAccount(accountPublicId, items, {
                        page: result?.page ?? 1,
                        pageSize: result?.pageSize ?? 50,
                        totalCount: result?.totalCount ?? items.length,
                        append: false
                    });
                } catch (e: unknown) {
                    if (requestId === snapshotsRequestSeq) {
                        error.value = e instanceof Error ? e.message : String(e);
                    }
                    throw e;
                } finally {
                    if (requestId === snapshotsRequestSeq) {
                        loadingSnapshots.value = false;
                    }
                }
            },
            { force }
        );
        if (requestId === snapshotsRequestSeq && selectedAccount.value?.publicId === accountPublicId) {
            activateSnapshotsView(accountPublicId);
        }
    }

    /**
     * Charge la page suivante des relevés (append).
     * @param accountPublicId Identifiant public du compte.
     */
    async function loadMoreBalanceSnapshots(accountPublicId: string) {
        if (selectedAccount.value?.publicId !== accountPublicId) return;
        if (loadingSnapshots.value || loadingMoreSnapshots.value) return;
        if (balanceSnapshotsLength(accountPublicId) >= snapshotsTotalCount.value) return;

        loadingMoreSnapshots.value = true;
        clearError();
        try {
            const nextPage = snapshotsPage.value + 1;
            const result = await accountsApi.listBalanceSnapshots(accountPublicId, {
                page: nextPage,
                pageSize: snapshotsPageSize.value || 50
            });
            const items = Array.isArray(result?.items) ? result.items : [];
            setSnapshotsForAccount(accountPublicId, items, {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? snapshotsPageSize.value,
                totalCount: result?.totalCount ?? snapshotsTotalCount.value,
                append: true
            });
            cache.touch(`snapshots:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            loadingMoreSnapshots.value = false;
        }
    }

    function balanceSnapshotsLength(accountPublicId: string) {
        return snapshotsByAccountId.get(accountPublicId)?.items.length ?? 0;
    }

    /**
     * Crée un snapshot de solde et l’insère dans la liste (triée par date).
     * @param accountPublicId Identifiant public du compte.
     * @param payload Données du snapshot (solde, date, note…).
     * @returns Le snapshot créé.
     */
    async function createBalanceSnapshot(accountPublicId: string, payload: CreateBalanceSnapshotPayload) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canWriteBalanceSnapshots(local));
            const snapshot = await accountsApi.createBalanceSnapshot(accountPublicId, payload);
            const prev = snapshotsByAccountId.get(accountPublicId);
            const current = prev?.items ?? [];
            const nextTotal = (prev?.totalCount ?? current.length) + 1;
            setSnapshotsForAccount(accountPublicId, sortSnapshotsDesc([snapshot, ...current]), {
                totalCount: nextTotal
            });
            cache.touch(`snapshots:${accountPublicId}`);
            return snapshot;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    /**
     * Supprime un snapshot de solde.
     * @param accountPublicId Identifiant public du compte.
     * @param snapshotPublicId Identifiant public du snapshot à supprimer.
     */
    async function deleteBalanceSnapshot(accountPublicId: string, snapshotPublicId: string) {
        beginActing();
        clearError();
        try {
            const local = requireLocalAccount(accounts.value, selectedAccount.value, accountPublicId);
            assertAccountAllowed(canWriteBalanceSnapshots(local));
            await accountsApi.deleteBalanceSnapshot(accountPublicId, snapshotPublicId);
            const prev = snapshotsByAccountId.get(accountPublicId);
            const current = prev?.items ?? [];
            const nextTotal = Math.max(0, (prev?.totalCount ?? current.length) - 1);
            setSnapshotsForAccount(
                accountPublicId,
                current.filter((s) => s.publicId !== snapshotPublicId),
                { totalCount: nextTotal }
            );
            cache.touch(`snapshots:${accountPublicId}`);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            endActing();
        }
    }

    return {
        loadBalanceSnapshots,
        loadMoreBalanceSnapshots,
        createBalanceSnapshot,
        deleteBalanceSnapshot
    };
}

export type AccountsSnapshots = ReturnType<typeof createAccountsSnapshots>;
