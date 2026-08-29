import { accountsApi } from '@/features/accounts/api';
import { canWriteBalanceSnapshots } from '@/features/accounts/rights';
import type { AccountBalanceSnapshot, CreateBalanceSnapshotPayload } from '@/features/accounts/types';
import { assertAccountAllowed, requireLocalAccount } from '@/features/accounts/stores/internal/accounts-authz';
import type { AccountsState } from '@/features/accounts/stores/internal/accounts-state';

/** Ordre UI / chip écart : plus récent `snapshotAt` d’abord, puis `createdAt`. */
function sortSnapshotsDesc(items: AccountBalanceSnapshot[]): AccountBalanceSnapshot[] {
    return [...items].sort((a, b) => {
        const byAt = b.snapshotAt.localeCompare(a.snapshotAt);
        if (byAt !== 0) return byAt;
        return b.createdAt.localeCompare(a.createdAt);
    });
}

/** Fusionne (déduplique par `publicId`) puis trie DESC — load page / append / create. */
function mergeSnapshotsDesc(
    existing: readonly AccountBalanceSnapshot[],
    incoming: readonly AccountBalanceSnapshot[]
): AccountBalanceSnapshot[] {
    const byId = new Map<string, AccountBalanceSnapshot>();
    for (const s of existing) byId.set(s.publicId, s);
    for (const s of incoming) byId.set(s.publicId, s);
    return sortSnapshotsDesc([...byId.values()]);
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
    /** Bumpé après create/delete local — ignore un GET démarré avant. */
    let snapshotsDataGen = 0;

    function bumpSnapshotsData(accountPublicId: string) {
        snapshotsDataGen += 1;
        cache.touch(`snapshots:${accountPublicId}`);
    }

    /**
     * Charge l’historique des snapshots de solde d’un compte (page 1).
     * @param accountPublicId Identifiant public du compte.
     * @param force Si `true`, ignore le TTL et refetch.
     */
    async function loadBalanceSnapshots(accountPublicId: string, force = false) {
        const requestId = ++snapshotsRequestSeq;
        const cacheKey = `snapshots:${accountPublicId}`;
        const needsFetch = force || !cache.isFresh(cacheKey);
        loadingSnapshots.value = true;
        clearError();

        async function fetchSnapshots(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            const genAtStart = snapshotsDataGen;
            await cache.ensure(
                cacheKey,
                async () => {
                    try {
                        const result = await accountsApi.listBalanceSnapshots(accountPublicId, { page: 1, pageSize: 50 });
                        if (requestId !== snapshotsRequestSeq) return;
                        if (genAtStart !== snapshotsDataGen) return;
                        const items = sortSnapshotsDesc(Array.isArray(result?.items) ? result.items : []);
                        setSnapshotsForAccount(accountPublicId, items, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? 50,
                            totalCount: result?.totalCount ?? items.length,
                            append: false
                        });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === snapshotsRequestSeq) {
                            error.value = e instanceof Error ? e.message : String(e);
                        }
                        throw e;
                    }
                },
                { force: ensureForce }
            );
            return applied;
        }

        try {
            const applied = await fetchSnapshots(force);
            if (requestId === snapshotsRequestSeq && needsFetch && !applied) {
                await fetchSnapshots(true);
            }
        } finally {
            if (requestId === snapshotsRequestSeq) {
                loadingSnapshots.value = false;
            }
        }
        if (requestId !== snapshotsRequestSeq) {
            cache.invalidate(cacheKey);
            return;
        }
        if (selectedAccount.value?.publicId === accountPublicId) {
            activateSnapshotsView(accountPublicId);
        }
    }

    /** Ignore les réponses relevés en vol (fermeture / changement de compte). */
    function cancelPendingSnapshotsLoads() {
        snapshotsRequestSeq += 1;
        loadingSnapshots.value = false;
        loadingMoreSnapshots.value = false;
    }

    /**
     * Charge la page suivante des relevés (append).
     * @param accountPublicId Identifiant public du compte.
     */
    async function loadMoreBalanceSnapshots(accountPublicId: string) {
        if (selectedAccount.value?.publicId !== accountPublicId) return;
        if (loadingSnapshots.value || loadingMoreSnapshots.value) return;
        if (balanceSnapshotsLength(accountPublicId) >= snapshotsTotalCount.value) return;

        const requestId = ++snapshotsRequestSeq;
        loadingMoreSnapshots.value = true;
        clearError();
        try {
            const nextPage = snapshotsPage.value + 1;
            const result = await accountsApi.listBalanceSnapshots(accountPublicId, {
                page: nextPage,
                pageSize: snapshotsPageSize.value || 50
            });
            if (requestId !== snapshotsRequestSeq) return;
            if (selectedAccount.value?.publicId !== accountPublicId) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = snapshotsByAccountId.get(accountPublicId)?.items ?? [];
            setSnapshotsForAccount(accountPublicId, mergeSnapshotsDesc(prev, incoming), {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? snapshotsPageSize.value,
                totalCount: result?.totalCount ?? snapshotsTotalCount.value,
                append: false
            });
            cache.touch(`snapshots:${accountPublicId}`);
        } catch (e: unknown) {
            if (requestId === snapshotsRequestSeq) {
                error.value = e instanceof Error ? e.message : String(e);
            }
            throw e;
        } finally {
            if (requestId === snapshotsRequestSeq) {
                loadingMoreSnapshots.value = false;
            }
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
            setSnapshotsForAccount(accountPublicId, mergeSnapshotsDesc(current, [snapshot]), {
                totalCount: nextTotal
            });
            bumpSnapshotsData(accountPublicId);
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
            bumpSnapshotsData(accountPublicId);
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
        cancelPendingSnapshotsLoads,
        createBalanceSnapshot,
        deleteBalanceSnapshot
    };
}

export type AccountsSnapshots = ReturnType<typeof createAccountsSnapshots>;
