import { useNotificationsStore } from '@/features/notifications';
import { parseSharedDebtChangedPayload } from '@/features/notifications/normalize';
import type { SharedDebtChangedPayload } from '@/features/notifications';
import type { SharedDebtsCrud } from '@/features/shared-debts/stores/internal/shared-debts-crud';
import type { SharedDebtsState } from '@/features/shared-debts/stores/internal/shared-debts-state';

type RealtimeDeps = Pick<SharedDebtsCrud, 'refetchActive' | 'fetchSharedDebt'>;

/**
 * `sharedDebtChanged` — reçu par le créancier **et** le débiteur, acteur inclus.
 * Une mutation locale (mémorisée 2,5 s) est ignorée ; tout autre `change` invalide et refetch.
 */
export function createSharedDebtsRealtime(state: SharedDebtsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchSharedDebt } = deps;

    let unsubscribeSharedDebtChanged: (() => void) | null = null;
    let refreshScheduled = false;

    function scheduleRefetch() {
        if (refreshScheduled) return;
        refreshScheduled = true;
        queueMicrotask(() => {
            refreshScheduled = false;
            if (!initialized.value) return;
            void refetchActive(true);
        });
    }

    function handleSharedDebtChanged(payload: SharedDebtChangedPayload) {
        const parsed = parseSharedDebtChangedPayload(payload);
        if (!parsed) return;
        const { change, sharedDebtPublicId } = parsed;

        if (consumeLocalMutation(sharedDebtPublicId)) return;

        if (change === 'sharedDebtDeleted') {
            removeItemLocal(sharedDebtPublicId);
            invalidateAllLists();
            notifyDeleted(sharedDebtPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change !== 'sharedDebtCreated' && knownById.has(sharedDebtPublicId)) {
            void fetchSharedDebt(sharedDebtPublicId, true).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeSharedDebtChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeSharedDebtChanged = notifications.subscribeToSharedDebtChanged(handleSharedDebtChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeSharedDebtChanged?.();
        unsubscribeSharedDebtChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleSharedDebtChanged
    };
}

export type SharedDebtsRealtime = ReturnType<typeof createSharedDebtsRealtime>;
