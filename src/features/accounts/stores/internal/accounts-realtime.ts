import { useNotificationsStore } from '@/features/notifications';
import { getAccountPublicId } from '@/features/notifications/normalize';
import type { AccountChangedPayload, AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { KEY_ACCOUNTS, KEY_INCOMING, type AccountsState } from '@/features/accounts/stores/internal/accounts-state';
import type { AccountsCrud } from '@/features/accounts/stores/internal/accounts-crud';
import type { AccountsShares } from '@/features/accounts/stores/internal/accounts-shares';

type RealtimeDeps = Pick<AccountsCrud, 'loadAccounts'> & Pick<AccountsShares, 'loadIncoming' | 'loadShares' | 'refreshAll'>;

/**
 * Abonnements realtime (partages + amitiés + archive/restore) pour invalider / recharger le store.
 * @param state État partagé du store.
 * @param deps Actions de rechargement utilisées par les handlers.
 * @returns Les helpers de bridge realtime.
 */
export function createAccountsRealtime(state: AccountsState, deps: RealtimeDeps) {
    const { accounts, selectedAccount, cache, removeAccountLocal, upsertAccount } = state;
    const { loadAccounts, loadIncoming, loadShares, refreshAll } = deps;

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;
    let unsubscribeAccountChanged: (() => void) | null = null;

    /**
     * Réagit aux notifs de partage (invitation, révocation, acceptation, refus).
     * @param notification Notification reçue.
     */
    function handleRealtime(notification: AppNotification) {
        const type = String(notification.type);
        if (type === 'accountShareRevoked') {
            // Soft-delete / revoke manuel : retirer tout de suite (UI), sync réseau en arrière-plan.
            const accountPublicId = getAccountPublicId(notification.metadata);
            if (accountPublicId) {
                removeAccountLocal(accountPublicId);
            }
            cache.invalidate(KEY_INCOMING);
            cache.invalidate(KEY_ACCOUNTS);
            void Promise.all([loadIncoming(true), loadAccounts(true)]).catch(() => undefined);
            return;
        }
        if (type === 'accountShareInvite') {
            cache.invalidate(KEY_INCOMING);
            cache.invalidate(KEY_ACCOUNTS);
            void Promise.all([loadIncoming(true), loadAccounts(true)]).catch(() => undefined);
            return;
        }
        if (type === 'accountShareAccepted' || type === 'accountShareRefused') {
            cache.invalidate(KEY_ACCOUNTS);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value && selectedAccount.value.isOwned) {
                cache.invalidate(`shares:${selectedAccount.value.publicId}`);
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
            return;
        }
        if (type === 'accountShareLeft') {
            // Un destinataire a quitté : owner rafraîchit la liste des shares.
            cache.invalidate(KEY_ACCOUNTS);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value?.isOwned) {
                cache.invalidate(`shares:${selectedAccount.value.publicId}`);
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
        }
    }

    /**
     * Réagit aux changements d’amitié (retrait / blocage → refresh complet).
     * @param payload Événement de changement d’amitié.
     */
    function handleFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change) return;
        if (payload.change === 'removed' || payload.change === 'blocked') {
            cache.invalidate('*');
            void refreshAll().catch(() => undefined);
            if (selectedAccount.value?.isOwned) {
                void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
            }
        }
    }

    /**
     * Archive / restore poussé par un autre utilisateur (owner ou editor).
     * Patch local immédiat + sync liste en arrière-plan.
     * @param payload Événement `accountChanged`.
     */
    function handleAccountChanged(payload: AccountChangedPayload) {
        if (!payload?.accountPublicId || !payload?.change) return;
        const id = payload.accountPublicId.trim();
        if (!id) return;

        const isActive = payload.change === 'restored';
        if (payload.change === 'archived' || payload.change === 'restored') {
            const current = accounts.value.find((a) => a.publicId === id);
            if (current) {
                upsertAccount({ ...current, isActive });
            }
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate(`detail:${id}`);
            void loadAccounts(true).catch(() => undefined);
        }
    }

    /** Branche les listeners notifications une seule fois. */
    function ensureRealtimeBridge() {
        if (unsubscribeNotifications && unsubscribeFriendshipChanged && unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeNotifications ??= notifications.subscribeToAccountShareNotifications(handleRealtime);
        unsubscribeFriendshipChanged ??= notifications.subscribeToFriendshipChanged(handleFriendshipChanged);
        unsubscribeAccountChanged ??= notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    /** À appeler dès qu’une session authentifiée est active. */
    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    /** Débranche les listeners realtime. */
    function teardownRealtimeBridge() {
        unsubscribeNotifications?.();
        unsubscribeFriendshipChanged?.();
        unsubscribeAccountChanged?.();
        unsubscribeNotifications = null;
        unsubscribeFriendshipChanged = null;
        unsubscribeAccountChanged = null;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge
    };
}

export type AccountsRealtime = ReturnType<typeof createAccountsRealtime>;
