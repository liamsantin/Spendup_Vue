import { useNotificationsStore } from '@/features/notifications';
import { parseTierChangedPayload } from '@/features/notifications/normalize';
import type { TierChangedPayload } from '@/features/notifications';
import type { TiersCrud } from '@/features/tiers/stores/internal/tiers-crud';
import type { TiersState } from '@/features/tiers/stores/internal/tiers-state';

type RealtimeDeps = Pick<TiersCrud, 'refetchActive' | 'fetchTier'>;

/**
 * Abonnement SignalR `tierChanged` — sync multi-onglets / multi-appareils du même utilisateur.
 * L’émetteur reçoit aussi son propre événement : ignoré si la mutation vient d’ici (`consumeLocalMutation`).
 */
export function createTiersRealtime(state: TiersState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchTier } = deps;

    let unsubscribeTierChanged: (() => void) | null = null;
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

    function handleTierChanged(payload: TierChangedPayload) {
        const parsed = parseTierChangedPayload(payload);
        if (!parsed) return;
        const { change, tierPublicId } = parsed;

        if (consumeLocalMutation(tierPublicId)) return;

        if (change === 'tierDeleted') {
            removeItemLocal(tierPublicId);
            invalidateAllLists();
            notifyDeleted(tierPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change === 'tierUpdated' && knownById.has(tierPublicId)) {
            void fetchTier(tierPublicId).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeTierChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeTierChanged = notifications.subscribeToTierChanged(handleTierChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeTierChanged?.();
        unsubscribeTierChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleTierChanged
    };
}

export type TiersRealtime = ReturnType<typeof createTiersRealtime>;
