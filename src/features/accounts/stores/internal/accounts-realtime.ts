import { useNotificationsStore } from '@/features/notifications';
import { getAccountPublicId, getAccountSharePublicId, parseAccountChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload, AppNotification, FriendshipChangedPayload } from '@/features/notifications';
import { KEY_ACCOUNTS, KEY_INCOMING, type AccountsState } from '@/features/accounts/stores/internal/accounts-state';
import type { AccountsCrud } from '@/features/accounts/stores/internal/accounts-crud';
import type { AccountsShares } from '@/features/accounts/stores/internal/accounts-shares';
import type { AccountsSnapshots } from '@/features/accounts/stores/internal/accounts-snapshots';
import type { AccountShare, ShareStatusRole } from '@/features/accounts/types';

type RealtimeDeps = Pick<AccountsCrud, 'loadAccounts' | 'loadAccountDetail'> &
    Pick<AccountsShares, 'loadIncoming' | 'loadShares' | 'refreshAll'> &
    Pick<AccountsSnapshots, 'loadBalanceSnapshots'>;

/**
 * Abonnements realtime (partages + amitiés + accountChanged) pour invalider / recharger le store.
 * @param state État partagé du store.
 * @param deps Actions de rechargement utilisées par les handlers.
 * @returns Les helpers de bridge realtime.
 */
export function createAccountsRealtime(state: AccountsState, deps: RealtimeDeps) {
    const {
        accounts,
        selectedAccount,
        shares,
        sharesByAccountId,
        cache,
        removeAccountLocal,
        upsertAccount,
        setSharesForAccount
    } = state;
    const { loadAccounts, loadAccountDetail, loadIncoming, loadShares, loadBalanceSnapshots, refreshAll } = deps;

    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeFriendshipChanged: (() => void) | null = null;
    let unsubscribeAccountChanged: (() => void) | null = null;

    function readSharesSnapshot(accountPublicId: string): AccountShare[] {
        return (
            sharesByAccountId.get(accountPublicId) ??
            (selectedAccount.value?.publicId === accountPublicId ? [...shares.value] : [])
        );
    }

    /** Pending → rôle invité (UI immédiate côté owner) — uniquement si le share cible est connu. */
    function promoteAcceptedShare(accountPublicId: string, sharePublicId: string | null, current: AccountShare[]) {
        if (!current.length) return;
        let next = current;
        if (sharePublicId) {
            const target = current.find((s) => s.publicId === sharePublicId);
            if (!target || target.role !== 'pending') return;
            next = current.map((s) => {
                if (s.publicId !== sharePublicId || s.role !== 'pending') return s;
                const role = (s.invitedRole ?? 'viewer') as Exclude<ShareStatusRole, 'pending'>;
                return { ...s, role, invitedRole: null };
            });
        } else {
            const pending = current.filter((s) => s.role === 'pending');
            if (pending.length !== 1) return;
            next = current.map((s) => {
                if (s.role !== 'pending') return s;
                const role = (s.invitedRole ?? 'viewer') as Exclude<ShareStatusRole, 'pending'>;
                return { ...s, role, invitedRole: null };
            });
        }
        setSharesForAccount(accountPublicId, next);
    }

    /**
     * Réagit aux notifs de partage (invitation, révocation, acceptation, refus).
     * @param notification Notification reçue.
     */
    function handleRealtime(notification: AppNotification) {
        const type = String(notification.type);
        if (type === 'accountShareRevoked') {
            // Inbox (historique/badge) — le sync live passe par accountChanged.revoked.
            // Destinataire seulement : ne jamais retirer un compte owned (flash owner).
            // ID inconnu / invalide : pas de patch optimiste, refetch seulement.
            const accountPublicId = getAccountPublicId(notification.metadata);
            if (accountPublicId) {
                const current = accounts.value.find((a) => a.publicId === accountPublicId);
                if (current && !current.isOwned) {
                    removeAccountLocal(accountPublicId);
                }
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
            // Owner : invalider TOUS les caches shares.
            // Patch optimiste uniquement si metadata porte des IDs fiables et connus localement.
            const accountPublicId = getAccountPublicId(notification.metadata);
            const sharePublicId = getAccountSharePublicId(notification.metadata);
            const current = accountPublicId ? readSharesSnapshot(accountPublicId) : [];

            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate('shares:*');

            if (accountPublicId) {
                sharesByAccountId.delete(accountPublicId);
                if (type === 'accountShareAccepted') {
                    promoteAcceptedShare(accountPublicId, sharePublicId, current);
                } else if (sharePublicId && current.some((s) => s.publicId === sharePublicId)) {
                    setSharesForAccount(
                        accountPublicId,
                        current.filter((s) => s.publicId !== sharePublicId)
                    );
                }
                void loadShares(accountPublicId, true).catch(() => undefined);
            } else {
                sharesByAccountId.clear();
                if (selectedAccount.value?.isOwned) {
                    void loadShares(selectedAccount.value.publicId, true).catch(() => undefined);
                }
            }
            void loadAccounts(true).catch(() => undefined);
            return;
        }
        if (type === 'accountShareLeft') {
            // Destinataire a quitté : invalider le cache shares même si la modale est fermée
            // (sinon réouverture TTL-frais réaffiche l’ancien partage).
            const accountPublicId = getAccountPublicId(notification.metadata);
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate('shares:*');
            if (accountPublicId) {
                sharesByAccountId.delete(accountPublicId);
                if (selectedAccount.value?.publicId === accountPublicId) {
                    setSharesForAccount(accountPublicId, []);
                    void loadShares(accountPublicId, true).catch(() => undefined);
                }
            } else if (selectedAccount.value?.isOwned) {
                const id = selectedAccount.value.publicId;
                sharesByAccountId.delete(id);
                void loadShares(id, true).catch(() => undefined);
            } else {
                sharesByAccountId.clear();
            }
            void loadAccounts(true).catch(() => undefined);
            return;
        }
        if (type === 'accountShareRoleChanged') {
            // Inbox (historique/badge) — le sync live passe par accountChanged.roleChanged.
            cache.invalidate(KEY_ACCOUNTS);
            const accountPublicId = getAccountPublicId(notification.metadata);
            if (accountPublicId) {
                cache.invalidate(`detail:${accountPublicId}`);
                cache.invalidate(`shares:${accountPublicId}`);
            }
            void loadAccounts(true).catch(() => undefined);
            if (accountPublicId && selectedAccount.value?.publicId === accountPublicId) {
                void loadAccountDetail(accountPublicId, true).catch(() => undefined);
                void loadShares(accountPublicId, true).catch(() => undefined);
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
     * Sync live via SignalR `accountChanged` (y compris pushNotifications off).
     * Patch local immédiat quand possible + sync liste / détail en arrière-plan.
     * @param payload Événement `accountChanged`.
     */
    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed) return;
        const { change, accountPublicId: id } = parsed;

        if (change === 'revoked') {
            // Destinataire : revoke manuel ou soft-delete owner.
            // Ne pas retirer un compte owned ; ID inconnu → refetch seulement.
            const current = accounts.value.find((a) => a.publicId === id);
            if (current && !current.isOwned) {
                removeAccountLocal(id);
            }
            cache.invalidate(KEY_INCOMING);
            cache.invalidate(KEY_ACCOUNTS);
            void Promise.all([loadIncoming(true), loadAccounts(true)]).catch(() => undefined);
            return;
        }

        if (change === 'roleChanged') {
            // Destinataire : owner a basculé viewer ↔ editor — refetch myRole / actions UI.
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate(`detail:${id}`);
            cache.invalidate(`shares:${id}`);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value?.publicId === id) {
                void loadAccountDetail(id, true).catch(() => undefined);
                void loadShares(id, true).catch(() => undefined);
            }
            return;
        }

        if (change === 'archived' || change === 'restored') {
            const isActive = change === 'restored';
            const current = accounts.value.find((a) => a.publicId === id);
            if (current) {
                upsertAccount({ ...current, isActive });
            }
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate(`detail:${id}`);
            void loadAccounts(true).catch(() => undefined);
            return;
        }

        if (change === 'visibility') {
            // Destinataire : hiddenFields seuls ont changé — refetch liste (+ détail si ouvert).
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate(`detail:${id}`);
            cache.invalidate(`snapshots:${id}`);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value?.publicId === id) {
                void loadAccountDetail(id, true).catch(() => undefined);
            }
            return;
        }

        if (change === 'updated') {
            // Co-détenteur (sauf acteur) : PUT compte — refetch liste (+ détail si modale ouverte).
            cache.invalidate(KEY_ACCOUNTS);
            cache.invalidate(`detail:${id}`);
            void loadAccounts(true).catch(() => undefined);
            if (selectedAccount.value?.publicId === id) {
                void loadAccountDetail(id, true).catch(() => undefined);
            }
            return;
        }

        if (change === 'balanceSnapshotCreated' || change === 'balanceSnapshotDeleted') {
            // Co-détenteur (sauf acteur) : invalider le cache relevés même si la modale est fermée.
            cache.invalidate(`snapshots:${id}`);
            if (selectedAccount.value?.publicId === id) {
                void loadBalanceSnapshots(id, true).catch(() => undefined);
            }
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
