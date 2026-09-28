import { HubConnectionState } from '@microsoft/signalr';
import { getOrCreateDeviceId } from '@/features/auth/device';
import { i18n } from '@/plugins/i18n';
import {
    getNotificationsHubState,
    setNotificationsHubHandlers,
    startNotificationsHub,
    stopNotificationsHub
} from '@/features/notifications/hub';
import { isAccountShareNotificationType, isFriendNotificationType } from '@/features/notifications/link';
import {
    normalizeNotificationReceivedPayload,
    normalizePublicId,
    parseAccountChangedPayload,
    parseCategoryChangedPayload,
    parseTagChangedPayload,
    parseRecurringExpenseChangedPayload,
    parseRecurringIncomeChangedPayload,
    parseTierChangedPayload,
    parseBudgetChangedPayload,
    parseSavingsGoalChangedPayload,
    parseImportChangedPayload,
    parseImportTemplateChangedPayload
} from '@/features/notifications/normalize';
import type {
    AppNotification,
    AccountChangedPayload,
    CategoryChangedPayload,
    TagChangedPayload,
    FriendshipChangedPayload,
    InboxClearedPayload,
    NotificationReceivedPayload,
    RecurringExpenseChangedPayload,
    RecurringIncomeChangedPayload,
    SessionEndedPayload,
    TierChangedPayload,
    BudgetChangedPayload,
    SavingsGoalChangedPayload,
    ImportChangedPayload,
    ImportTemplateChangedPayload
} from '@/features/notifications/types';
import type { NotificationsState } from '@/features/notifications/stores/internal/notifications-state';
import type { NotificationsNative } from '@/features/notifications/stores/internal/notifications-native';
import type { NotificationsInbox } from '@/features/notifications/stores/internal/notifications-inbox';

function t(key: string) {
    return String(i18n.global.t(key));
}

type HubDeps = Pick<NotificationsNative, 'pushLiveFriendChip' | 'maybeShowNativeOsNotification'> &
    Pick<NotificationsInbox, 'applyInboxCleared' | 'fetchUnreadCount' | 'loadInbox'>;

/**
 * SignalR + listeners (amis / partage de compte / friendship changed / session ended).
 * @param state État partagé du store.
 * @param deps Helpers inbox / native utilisés par les handlers.
 * @returns Les actions hub et abonnements.
 */
export function createNotificationsHub(state: NotificationsState, deps: HubDeps) {
    const {
        items,
        totalCount,
        hubConnected,
        friendListeners,
        accountShareListeners,
        friendshipChangeListeners,
        accountChangeListeners,
        categoryChangeListeners,
        tagChangeListeners,
        tierChangeListeners,
        recurringExpenseChangeListeners,
        recurringIncomeChangeListeners,
        budgetChangeListeners,
        savingsGoalChangeListeners,
        importChangeListeners,
        importTemplateChangeListeners,
        applyUnreadCount,
        upsertItem
    } = state;

    const { pushLiveFriendChip, maybeShowNativeOsNotification, applyInboxCleared, fetchUnreadCount, loadInbox } = deps;

    let handlingSessionEnded = false;

    /** Handler SignalR : notification reçue (badge, inbox, chips, OS). */
    function onNotificationReceived(payload: NotificationReceivedPayload) {
        const normalized = normalizeNotificationReceivedPayload(payload) ?? payload;
        if (normalized?.unreadCount != null) {
            applyUnreadCount(normalized.unreadCount);
        }
        const notification = normalized?.notification;
        if (!notification?.id) return;

        // Listes amis + inbox : friendRequest / friendAccepted uniquement.
        if (isFriendNotificationType(String(notification.type))) {
            friendListeners.forEach((listener) => listener(notification));
        }
        if (isAccountShareNotificationType(String(notification.type))) {
            accountShareListeners.forEach((listener) => listener(notification));
        }
        const inserted = upsertItem(notification, true);
        if (inserted) {
            totalCount.value = Math.max(items.value.length, totalCount.value + 1);
        }
        pushLiveFriendChip(notification);
        maybeShowNativeOsNotification(notification);
    }

    /** Live sans inbox : ne touche pas au badge unread. */
    function onFriendshipChanged(payload: FriendshipChangedPayload) {
        if (!payload?.change) return;
        if (!normalizePublicId(payload.friendshipPublicId)) return;
        friendshipChangeListeners.forEach((listener) => listener(payload));
    }

    /** Live sans inbox : archive / restore d’un compte partagé. */
    function onAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed) return;
        accountChangeListeners.forEach((listener) => listener(parsed));
    }

    /** Live sans inbox : arbre de catégories perso (acteur inclus). */
    function onCategoryChanged(payload: CategoryChangedPayload) {
        const parsed = parseCategoryChangedPayload(payload);
        if (!parsed) return;
        categoryChangeListeners.forEach((listener) => listener(parsed));
    }

    /** Live sans inbox : vocabulaire de tags perso (acteur inclus). */
    function onTagChanged(payload: TagChangedPayload) {
        const parsed = parseTagChangedPayload(payload);
        if (!parsed) return;
        tagChangeListeners.forEach((listener) => listener(parsed));
    }

    /** Live sans inbox : annuaire de tiers perso (acteur inclus). */
    function onTierChanged(payload: TierChangedPayload) {
        const parsed = parseTierChangedPayload(payload);
        if (!parsed) return;
        tierChangeListeners.forEach((listener) => listener(parsed));
    }

    function onRecurringExpenseChanged(payload: RecurringExpenseChangedPayload) {
        const parsed = parseRecurringExpenseChangedPayload(payload);
        if (!parsed) return;
        recurringExpenseChangeListeners.forEach((listener) => listener(parsed));
    }

    function onRecurringIncomeChanged(payload: RecurringIncomeChangedPayload) {
        const parsed = parseRecurringIncomeChangedPayload(payload);
        if (!parsed) return;
        recurringIncomeChangeListeners.forEach((listener) => listener(parsed));
    }

    function onBudgetChanged(payload: BudgetChangedPayload) {
        const parsed = parseBudgetChangedPayload(payload);
        if (!parsed) return;
        budgetChangeListeners.forEach((listener) => listener(parsed));
    }

    function onSavingsGoalChanged(payload: SavingsGoalChangedPayload) {
        const parsed = parseSavingsGoalChangedPayload(payload);
        if (!parsed) return;
        savingsGoalChangeListeners.forEach((listener) => listener(parsed));
    }

    /** Live sans inbox : imports du créateur, session acteur incluse. */
    function onImportChanged(payload: ImportChangedPayload) {
        const parsed = parseImportChangedPayload(payload);
        if (!parsed) return;
        importChangeListeners.forEach((listener) => listener(parsed));
    }

    /** Live sans inbox : modèles d’import perso (acteur inclus). */
    function onImportTemplateChanged(payload: ImportTemplateChangedPayload) {
        const parsed = parseImportTemplateChangedPayload(payload);
        if (!parsed) return;
        importTemplateChangeListeners.forEach((listener) => listener(parsed));
    }

    /**
     * Rejoue un `accountChanged` pour la session courante : l’API ne l’envoie qu’aux **autres**
     * co-détenteurs (commit / revert d’import). Même fan-out que l’événement SignalR.
     */
    function dispatchLocalAccountChanged(payload: AccountChangedPayload) {
        onAccountChanged(payload);
    }

    /** SignalR multi-appareils après DELETE /api/notifications. */
    function onInboxCleared(payload: InboxClearedPayload) {
        applyInboxCleared(payload?.unreadCount ?? 0);
    }

    /**
     * Reconnexion SignalR : les événements émis pendant la coupure sont perdus.
     * Refetch du badge et, si l’inbox était chargée, de la page 1 (erreurs ignorées).
     */
    async function onReconnected() {
        hubConnected.value = true;
        const tasks: Promise<unknown>[] = [fetchUnreadCount().catch(() => undefined)];
        if (state.inboxLoaded.value) {
            tasks.push(loadInbox({ page: 1, append: false }).catch(() => undefined));
        }
        await Promise.all(tasks);
    }

    /**
     * Indique si le payload `sessionEnded` cible cet appareil.
     * @param payload Payload SignalR.
     */
    function targetsThisDevice(payload: SessionEndedPayload): boolean {
        const target = payload?.deviceIdentifier;
        if (target == null || target === '') return true;
        return target === getOrCreateDeviceId();
    }

    /**
     * Session invalidée (logout / stamp MDP-email / révocation appareil).
     * Coupe le hub ; force le re-login si cet appareil est concerné.
     * @param payload Payload SignalR.
     */
    async function onSessionEnded(payload: SessionEndedPayload) {
        if (handlingSessionEnded) return;
        if (!targetsThisDevice(payload)) return;

        handlingSessionEnded = true;
        try {
            await stopHub();
            const { useAuthStore } = await import('@/features/auth/stores/auth-store');
            const messageKey =
                payload?.deviceIdentifier == null || payload.deviceIdentifier === ''
                    ? 'auth.notices.allSessionsRevoked'
                    : 'auth.notices.sessionEnded';
            await useAuthStore().forceReLogin(t(messageKey));
        } finally {
            handlingSessionEnded = false;
        }
    }

    /**
     * Abonne un listener aux notifs amis.
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToFriendNotifications(listener: (notification: AppNotification) => void) {
        friendListeners.add(listener);
        return () => {
            friendListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux notifs de partage de compte.
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToAccountShareNotifications(listener: (notification: AppNotification) => void) {
        accountShareListeners.add(listener);
        return () => {
            accountShareListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements d’amitié (hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToFriendshipChanged(listener: (payload: FriendshipChangedPayload) => void) {
        friendshipChangeListeners.add(listener);
        return () => {
            friendshipChangeListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements de compte (archive/restore, hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToAccountChanged(listener: (payload: AccountChangedPayload) => void) {
        accountChangeListeners.add(listener);
        return () => {
            accountChangeListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements de catégories (hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToCategoryChanged(listener: (payload: CategoryChangedPayload) => void) {
        categoryChangeListeners.add(listener);
        return () => {
            categoryChangeListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements de tags (hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToTagChanged(listener: (payload: TagChangedPayload) => void) {
        tagChangeListeners.add(listener);
        return () => {
            tagChangeListeners.delete(listener);
        };
    }

    /**
     * Abonne un listener aux changements de tiers (hors inbox).
     * @param listener Callback.
     * @returns Fonction de désabonnement.
     */
    function subscribeToTierChanged(listener: (payload: TierChangedPayload) => void) {
        tierChangeListeners.add(listener);
        return () => {
            tierChangeListeners.delete(listener);
        };
    }

    function subscribeToRecurringExpenseChanged(listener: (payload: RecurringExpenseChangedPayload) => void) {
        recurringExpenseChangeListeners.add(listener);
        return () => {
            recurringExpenseChangeListeners.delete(listener);
        };
    }

    function subscribeToRecurringIncomeChanged(listener: (payload: RecurringIncomeChangedPayload) => void) {
        recurringIncomeChangeListeners.add(listener);
        return () => {
            recurringIncomeChangeListeners.delete(listener);
        };
    }

    function subscribeToBudgetChanged(listener: (payload: BudgetChangedPayload) => void) {
        budgetChangeListeners.add(listener);
        return () => {
            budgetChangeListeners.delete(listener);
        };
    }

    function subscribeToSavingsGoalChanged(listener: (payload: SavingsGoalChangedPayload) => void) {
        savingsGoalChangeListeners.add(listener);
        return () => {
            savingsGoalChangeListeners.delete(listener);
        };
    }

    function subscribeToImportChanged(listener: (payload: ImportChangedPayload) => void) {
        importChangeListeners.add(listener);
        return () => {
            importChangeListeners.delete(listener);
        };
    }

    function subscribeToImportTemplateChanged(listener: (payload: ImportTemplateChangedPayload) => void) {
        importTemplateChangeListeners.add(listener);
        return () => {
            importTemplateChangeListeners.delete(listener);
        };
    }

    /** Branche les handlers SignalR sur le hub partagé. */
    function wireHubHandlers() {
        setNotificationsHubHandlers({
            onConnected: () => {
                hubConnected.value = true;
            },
            onNotificationReceived,
            onFriendshipChanged,
            onAccountChanged,
            onCategoryChanged,
            onTagChanged,
            onTierChanged,
            onRecurringExpenseChanged,
            onRecurringIncomeChanged,
            onBudgetChanged,
            onSavingsGoalChanged,
            onImportChanged,
            onImportTemplateChanged,
            onInboxCleared,
            onSessionEnded: (payload) => onSessionEnded(payload),
            onReconnected
        });
    }

    /** Démarre la connexion SignalR. */
    async function startHub() {
        wireHubHandlers();
        await startNotificationsHub();
        hubConnected.value = getNotificationsHubState() === HubConnectionState.Connected;
    }

    /** Arrête la connexion SignalR. */
    async function stopHub() {
        await stopNotificationsHub();
        hubConnected.value = false;
    }

    /** Remet les flags internes (ex. garde anti-réentrance `sessionEnded`). */
    function resetHubFlags() {
        handlingSessionEnded = false;
    }

    return {
        wireHubHandlers,
        startHub,
        stopHub,
        resetHubFlags,
        subscribeToFriendNotifications,
        subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged,
        subscribeToAccountChanged,
        subscribeToCategoryChanged,
        subscribeToTagChanged,
        subscribeToTierChanged,
        subscribeToRecurringExpenseChanged,
        subscribeToRecurringIncomeChanged,
        subscribeToBudgetChanged,
        subscribeToSavingsGoalChanged,
        subscribeToImportChanged,
        subscribeToImportTemplateChanged,
        dispatchLocalAccountChanged
    };
}

export type NotificationsHub = ReturnType<typeof createNotificationsHub>;
