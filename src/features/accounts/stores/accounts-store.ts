import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createAccountsState,
    createAccountsCrud,
    createAccountsShares,
    createAccountsSnapshots,
    createAccountsRealtime,
    createAccountsLifecycle,
    ACCOUNTS_LIST_MAX_AGE_MS,
    ACCOUNTS_DETAIL_MAX_AGE_MS
} from '@/features/accounts/stores/internal';

export { ACCOUNTS_LIST_MAX_AGE_MS, ACCOUNTS_DETAIL_MAX_AGE_MS };

/**
 * Fetch budget (TTL 60s list / 30s detail, hors invalidation realtime / refresh manuel) :
 * - 1ère visite onglet actif : 1 list
 * - switch onglet frais : 0
 * - open détail avec snapshot liste : 0–1 selon TTL
 *
 * `ensure` par défaut ; `force` seulement refresh user, mutation qui a besoin du serveur, ou realtime.
 */
export const useAccountsStore = defineStore('accounts', () => {
    const state = createAccountsState();
    const crud = createAccountsCrud(state);
    const shares = createAccountsShares(state, crud);
    const snapshots = createAccountsSnapshots(state);

    state.setCancelPendingLoads(() => {
        crud.cancelPendingDetailLoads();
        shares.cancelPendingSharesLoads();
        snapshots.cancelPendingSnapshotsLoads();
    });

    const realtime = createAccountsRealtime(state, {
        loadAccounts: crud.loadAccounts,
        loadAccountDetail: crud.loadAccountDetail,
        loadIncoming: shares.loadIncoming,
        loadShares: shares.loadShares,
        loadBalanceSnapshots: snapshots.loadBalanceSnapshots,
        refreshAll: shares.refreshAll
    });
    const lifecycle = createAccountsLifecycle(state, {
        loadAccounts: crud.loadAccounts,
        loadIncoming: shares.loadIncoming,
        cancelPendingDetailLoads: crud.cancelPendingDetailLoads,
        cancelPendingSharesLoads: shares.cancelPendingSharesLoads,
        cancelPendingSnapshotsLoads: snapshots.cancelPendingSnapshotsLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    /**
     * Normalise une erreur inconnue en `AppError`.
     * @param e Erreur brute (API, réseau, etc.).
     * @returns Une instance `AppError`.
     */
    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        accounts: state.accounts,
        incomingShares: state.incomingShares,
        selectedAccount: state.selectedAccount,
        shares: state.shares,
        balanceSnapshots: state.balanceSnapshots,
        snapshotsTotalCount: state.snapshotsTotalCount,
        hasMoreSnapshots: state.hasMoreSnapshots,
        loadingAccounts: state.loadingAccounts,
        loadingIncoming: state.loadingIncoming,
        loadingDetail: state.loadingDetail,
        loadingShares: state.loadingShares,
        loadingSnapshots: state.loadingSnapshots,
        loadingMoreSnapshots: state.loadingMoreSnapshots,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        focusAccountPublicId: state.focusAccountPublicId,
        focusSharePublicId: state.focusSharePublicId,
        promotedAccountPublicId: state.promotedAccountPublicId,
        ownedAccounts: state.ownedAccounts,
        sharedAccounts: state.sharedAccounts,
        activeOwnedAccounts: state.activeOwnedAccounts,
        archivedOwnedAccounts: state.archivedOwnedAccounts,
        incomingCount: state.incomingCount,
        hasAccounts: state.hasAccounts,
        clearError: state.clearError,
        setFocusAccount: state.setFocusAccount,
        setFocusShare: state.setFocusShare,
        isFocusedAccount: state.isFocusedAccount,
        isFocusedShare: state.isFocusedShare,
        isPromotedAccount: state.isPromotedAccount,
        clearSelected: state.clearSelected,
        loadAccounts: crud.loadAccounts,
        loadAccountDetail: crud.loadAccountDetail,
        createAccount: crud.createAccount,
        updateAccount: crud.updateAccount,
        setPrimary: crud.setPrimary,
        archiveAccount: crud.archiveAccount,
        restoreAccount: crud.restoreAccount,
        deleteAccount: crud.deleteAccount,
        loadIncoming: shares.loadIncoming,
        loadShares: shares.loadShares,
        inviteShare: shares.inviteShare,
        updateShareRole: shares.updateShareRole,
        revokeShare: shares.revokeShare,
        leaveShare: shares.leaveShare,
        acceptShare: shares.acceptShare,
        refuseShare: shares.refuseShare,
        refreshAll: shares.refreshAll,
        loadBalanceSnapshots: snapshots.loadBalanceSnapshots,
        loadMoreBalanceSnapshots: snapshots.loadMoreBalanceSnapshots,
        createBalanceSnapshot: snapshots.createBalanceSnapshot,
        deleteBalanceSnapshot: snapshots.deleteBalanceSnapshot,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        openTab: lifecycle.openTab,
        reset: lifecycle.reset,
        toAppError
    };
});
