import { useNotificationsStore } from '@/features/notifications';
import { parseSavingsGoalChangedPayload } from '@/features/notifications/normalize';
import type { SavingsGoalChangedPayload } from '@/features/notifications';
import type { SavingsGoalsCrud } from '@/features/savings-goals/stores/internal/savings-goals-crud';
import type { SavingsGoalsState } from '@/features/savings-goals/stores/internal/savings-goals-state';

type RealtimeDeps = Pick<SavingsGoalsCrud, 'refetchActive' | 'fetchSavingsGoal'>;

/**
 * `savingsGoalChanged` — CRUD perso, acteur inclus, pas d’inbox.
 */
export function createSavingsGoalsRealtime(state: SavingsGoalsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchSavingsGoal } = deps;

    let unsubscribeSavingsGoalChanged: (() => void) | null = null;
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

    function handleSavingsGoalChanged(payload: SavingsGoalChangedPayload) {
        const parsed = parseSavingsGoalChangedPayload(payload);
        if (!parsed) return;
        const { change, savingsGoalPublicId } = parsed;

        if (consumeLocalMutation(savingsGoalPublicId)) return;

        if (change === 'savingsGoalDeleted') {
            removeItemLocal(savingsGoalPublicId);
            invalidateAllLists();
            notifyDeleted(savingsGoalPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change === 'savingsGoalUpdated' && knownById.has(savingsGoalPublicId)) {
            void fetchSavingsGoal(savingsGoalPublicId, true).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeSavingsGoalChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeSavingsGoalChanged = notifications.subscribeToSavingsGoalChanged(handleSavingsGoalChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeSavingsGoalChanged?.();
        unsubscribeSavingsGoalChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleSavingsGoalChanged
    };
}

export type SavingsGoalsRealtime = ReturnType<typeof createSavingsGoalsRealtime>;
