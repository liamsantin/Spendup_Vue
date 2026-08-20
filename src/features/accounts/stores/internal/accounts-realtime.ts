import { useNotificationsStore } from '@/features/notifications';
import type { AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { KEY_ACCOUNTS, KEY_INCOMING, type AccountsState } from './accounts-state';
import type { AccountsCrud } from './accounts-crud';
import type { AccountsShares } from './accounts-shares';

type RealtimeDeps = Pick<AccountsCrud, 'loadAccounts'> & Pick<AccountsShares, 'loadIncoming' | 'loadShares' | 'refreshAll'>;

export function createAccountsRealtime(state: AccountsState, deps: RealtimeDeps) {
    const { selectedAccount, cache } = state;
    const { loadAccounts, loadIncoming, loadShares, refreshAll } = deps;

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;

    function handleRealtime(notification: AppNotification) {
        const type = String(notification.type);
        if (type === 'accountShareInvite' || type === 'accountShareRevoked') {
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
        }
    }

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

    function ensureRealtimeBridge() {
        if (unsubscribeNotifications && unsubscribeFriendshipChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeNotifications ??= notifications.subscribeToAccountShareNotifications(handleRealtime);
        unsubscribeFriendshipChanged ??= notifications.subscribeToFriendshipChanged(handleFriendshipChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeNotifications?.();
        unsubscribeFriendshipChanged?.();
        unsubscribeNotifications = null;
        unsubscribeFriendshipChanged = null;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge
    };
}

export type AccountsRealtime = ReturnType<typeof createAccountsRealtime>;
