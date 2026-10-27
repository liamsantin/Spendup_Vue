import { useNotificationsStore } from '@/features/notifications';
import { parseLiabilityChangedPayload } from '@/features/notifications/normalize';
import type { LiabilityChangedPayload } from '@/features/notifications';
import type { LiabilitiesCrud } from '@/features/liabilities/stores/internal/liabilities-crud';
import type { LiabilitiesState } from '@/features/liabilities/stores/internal/liabilities-state';

type RealtimeDeps = Pick<LiabilitiesCrud, 'refetchActive' | 'fetchLiability'>;

/** `liabilityChanged` — CRUD perso, acteur inclus : la mutation locale (2,5 s) est ignorée, le reste refetch. */
export function createLiabilitiesRealtime(state: LiabilitiesState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchLiability } = deps;

    let unsubscribeLiabilityChanged: (() => void) | null = null;
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

    function handleLiabilityChanged(payload: LiabilityChangedPayload) {
        const parsed = parseLiabilityChangedPayload(payload);
        if (!parsed) return;
        const { change, liabilityPublicId } = parsed;

        if (consumeLocalMutation(liabilityPublicId)) return;

        if (change === 'liabilityDeleted') {
            removeItemLocal(liabilityPublicId);
            invalidateAllLists();
            notifyDeleted(liabilityPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change === 'liabilityUpdated' && knownById.has(liabilityPublicId)) {
            void fetchLiability(liabilityPublicId, true).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeLiabilityChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeLiabilityChanged = notifications.subscribeToLiabilityChanged(handleLiabilityChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeLiabilityChanged?.();
        unsubscribeLiabilityChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleLiabilityChanged
    };
}

export type LiabilitiesRealtime = ReturnType<typeof createLiabilitiesRealtime>;
