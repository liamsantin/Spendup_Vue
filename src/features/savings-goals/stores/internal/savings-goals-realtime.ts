import { useNotificationsStore } from '@/features/notifications';
import { parseAccountChangedPayload, parseSavingsGoalChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload, SavingsGoalChangedPayload } from '@/features/notifications';
import type { SavingsGoalsCrud } from '@/features/savings-goals/stores/internal/savings-goals-crud';
import type { SavingsGoalsState } from '@/features/savings-goals/stores/internal/savings-goals-state';

type RealtimeDeps = Pick<SavingsGoalsCrud, 'refetchActive' | 'fetchSavingsGoal'>;

const LINKED_TX_CHANGES = new Set(['transactionCreated', 'transactionUpdated', 'transactionDeleted']);

/**
 * `savingsGoalChanged` — CRUD perso, acteur inclus, pas d’inbox.
 * `accountChanged` transaction* — contributedAmount / status / projectedDate.
 */
export function createSavingsGoalsRealtime(state: SavingsGoalsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchSavingsGoal } = deps;

    let unsubscribeSavingsGoalChanged: (() => void) | null = null;
    let unsubscribeAccountChanged: (() => void) | null = null;
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

    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed || !LINKED_TX_CHANGES.has(parsed.change)) return;
        invalidateAllLists();
        for (const goal of knownById.values()) {
            if (goal.accountPublicId === parsed.accountPublicId) {
                void fetchSavingsGoal(goal.publicId, true).catch(() => undefined);
            }
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeSavingsGoalChanged && unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeSavingsGoalChanged ??= notifications.subscribeToSavingsGoalChanged(handleSavingsGoalChanged);
        unsubscribeAccountChanged ??= notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeSavingsGoalChanged?.();
        unsubscribeAccountChanged?.();
        unsubscribeSavingsGoalChanged = null;
        unsubscribeAccountChanged = null;
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
