import { useNotificationsStore } from '@/features/notifications';
import { parsePersonalLoanChangedPayload } from '@/features/notifications/normalize';
import type { PersonalLoanChangedPayload } from '@/features/notifications';
import type { PersonalLoansCrud } from '@/features/personal-loans/stores/internal/personal-loans-crud';
import type { PersonalLoansState } from '@/features/personal-loans/stores/internal/personal-loans-state';

type RealtimeDeps = Pick<PersonalLoansCrud, 'refetchActive' | 'fetchPersonalLoan'>;

/** `personalLoanChanged` — CRUD perso, acteur inclus : la mutation locale (2,5 s) est ignorée, le reste refetch. */
export function createPersonalLoansRealtime(state: PersonalLoansState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchPersonalLoan } = deps;

    let unsubscribePersonalLoanChanged: (() => void) | null = null;
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

    function handlePersonalLoanChanged(payload: PersonalLoanChangedPayload) {
        const parsed = parsePersonalLoanChangedPayload(payload);
        if (!parsed) return;
        const { change, personalLoanPublicId } = parsed;

        if (consumeLocalMutation(personalLoanPublicId)) return;

        if (change === 'personalLoanDeleted') {
            removeItemLocal(personalLoanPublicId);
            invalidateAllLists();
            notifyDeleted(personalLoanPublicId);
            scheduleRefetch();
            return;
        }

        invalidateAllLists();
        if (change === 'personalLoanUpdated' && knownById.has(personalLoanPublicId)) {
            void fetchPersonalLoan(personalLoanPublicId, true).catch(() => undefined);
        }
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribePersonalLoanChanged) return;
        const notifications = useNotificationsStore();
        unsubscribePersonalLoanChanged = notifications.subscribeToPersonalLoanChanged(handlePersonalLoanChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribePersonalLoanChanged?.();
        unsubscribePersonalLoanChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handlePersonalLoanChanged
    };
}

export type PersonalLoansRealtime = ReturnType<typeof createPersonalLoansRealtime>;
