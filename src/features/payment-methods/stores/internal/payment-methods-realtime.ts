import { useNotificationsStore } from '@/features/notifications';
import { parseAccountChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload } from '@/features/notifications';
import type { PaymentMethodsCrud } from '@/features/payment-methods/stores/internal/payment-methods-crud';
import { KEY_GLOBAL, type PaymentMethodsState } from '@/features/payment-methods/stores/internal/payment-methods-state';

type RealtimeDeps = Pick<PaymentMethodsCrud, 'loadList' | 'refetchAccount'>;

/**
 * Abonnement SignalR `accountChanged` pour invalider les moyens de paiement.
 */
export function createPaymentMethodsRealtime(state: PaymentMethodsState, deps: RealtimeDeps) {
    const { cache, removeByAccount, initialized } = state;
    const { loadList, refetchAccount } = deps;

    let unsubscribeAccountChanged: (() => void) | null = null;

    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed) return;
        const { change, accountPublicId } = parsed;

        if (change === 'revoked') {
            removeByAccount(accountPublicId);
            cache.invalidate(KEY_GLOBAL);
            if (initialized.value && state.activeListKey.value === KEY_GLOBAL) {
                void loadList({ force: true }).catch(() => undefined);
            }
            return;
        }

        if (change === 'archived' || change === 'restored') {
            void refetchAccount(accountPublicId);
            return;
        }

        if (change === 'paymentMethodCreated' || change === 'paymentMethodUpdated' || change === 'paymentMethodDeleted') {
            void refetchAccount(accountPublicId);
        }
    }

    function ensureRealtimeBridge() {
        if (unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeAccountChanged = notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeAccountChanged?.();
        unsubscribeAccountChanged = null;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleAccountChanged
    };
}

export type PaymentMethodsRealtime = ReturnType<typeof createPaymentMethodsRealtime>;
