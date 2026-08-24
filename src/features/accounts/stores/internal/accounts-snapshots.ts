import { accountsApi } from '@/features/accounts/api';
import type { CreateBalanceSnapshotPayload } from '@/features/accounts/types';
import type { AccountsState } from '@/features/accounts/stores/internal/accounts-state';

/**
 * Actions liées aux snapshots de solde.
 * @param state État partagé du store.
 * @returns Les actions snapshots.
 */
export function createAccountsSnapshots(state: AccountsState) {
    const {
        snapshotsByAccountId,
        selectedAccount,
        loadingSnapshots,
        acting,
        error,
        cache,
        clearError,
        setSnapshotsForAccount,
        activateSnapshotsView
    } = state;

    /** Incrémente à chaque `loadBalanceSnapshots` — ignore les réponses tardives d’un autre compte. */
    let snapshotsRequestSeq = 0;

    /**
     * Charge l’historique des snapshots de solde d’un compte.
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
                    const result = await accountsApi.listBalanceSnapshots(accountPublicId);
                    setSnapshotsForAccount(accountPublicId, Array.isArray(result?.items) ? result.items : []);
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
     * Crée un snapshot de solde et l’ajoute en tête de liste.
     * @param accountPublicId Identifiant public du compte.
     * @param payload Données du snapshot (solde, date, note…).
     * @returns Le snapshot créé.
     */
    async function createBalanceSnapshot(accountPublicId: string, payload: CreateBalanceSnapshotPayload) {
        acting.value = true;
        clearError();
        try {
            const snapshot = await accountsApi.createBalanceSnapshot(accountPublicId, payload);
            const current = snapshotsByAccountId.get(accountPublicId) ?? [];
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

    /**
     * Supprime un snapshot de solde.
     * @param accountPublicId Identifiant public du compte.
     * @param snapshotPublicId Identifiant public du snapshot à supprimer.
     */
    async function deleteBalanceSnapshot(accountPublicId: string, snapshotPublicId: string) {
        acting.value = true;
        clearError();
        try {
            await accountsApi.deleteBalanceSnapshot(accountPublicId, snapshotPublicId);
            const current = snapshotsByAccountId.get(accountPublicId) ?? [];
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
