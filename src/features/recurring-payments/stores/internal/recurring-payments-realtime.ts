import { useNotificationsStore } from '@/features/notifications';
import type { AccountChangedPayload, RecurringExpenseChangedPayload, RecurringIncomeChangedPayload } from '@/features/notifications';
import type { RecurringPaymentsCrud } from '@/features/recurring-payments/stores/internal/recurring-payments-crud';
import type { RecurringPaymentsState } from '@/features/recurring-payments/stores/internal/recurring-payments-state';

type RealtimeDeps = Pick<RecurringPaymentsCrud, 'refetchKind' | 'getExpense' | 'getIncome' | 'loadDues'>;

export function createRecurringPaymentsRealtime(state: RecurringPaymentsState, deps: RealtimeDeps) {
    const { refetchKind, getExpense, getIncome, loadDues } = deps;

    let unsubscribeExpense: (() => void) | null = null;
    let unsubscribeIncome: (() => void) | null = null;
    let unsubscribeAccount: (() => void) | null = null;

    function handleExpenseChanged(payload: RecurringExpenseChangedPayload) {
        if (!payload?.change || !payload.recurringExpensePublicId) return;
        if (payload.change === 'recurringExpenseDeleted') {
            state.removeExpenseLocal(payload.recurringExpensePublicId);
        }
        void refetchKind('expense');
        if (payload.change !== 'recurringExpenseDeleted' && state.getDetail('expense', payload.recurringExpensePublicId)) {
            void getExpense(payload.recurringExpensePublicId, true).catch(() => undefined);
        }
    }

    function handleIncomeChanged(payload: RecurringIncomeChangedPayload) {
        if (!payload?.change || !payload.recurringIncomePublicId) return;
        if (payload.change === 'recurringIncomeDeleted') {
            state.removeIncomeLocal(payload.recurringIncomePublicId);
        }
        void refetchKind('income');
        if (payload.change !== 'recurringIncomeDeleted' && state.getDetail('income', payload.recurringIncomePublicId)) {
            void getIncome(payload.recurringIncomePublicId, true).catch(() => undefined);
        }
    }

    function handleAccountChanged(payload: AccountChangedPayload) {
        if (
            payload?.change !== 'transactionDeleted' &&
            payload?.change !== 'transactionCreated' &&
            payload?.change !== 'transactionUpdated'
        ) {
            return;
        }
        const keys = new Set([...state.details.keys(), ...state.duesByTemplate.keys()]);
        for (const key of keys) {
            const colon = key.indexOf(':');
            if (colon < 0) continue;
            const kind = key.slice(0, colon);
            const publicId = key.slice(colon + 1);
            if ((kind === 'expense' || kind === 'income') && publicId) {
                if (kind === 'expense') void getExpense(publicId, true).catch(() => undefined);
                else void getIncome(publicId, true).catch(() => undefined);
                void loadDues(kind, publicId, { force: true }).catch(() => undefined);
            }
        }
        void refetchKind('expense');
        void refetchKind('income');
    }

    function ensureRealtimeBridge() {
        if (unsubscribeExpense && unsubscribeIncome && unsubscribeAccount) return;
        const notifications = useNotificationsStore();
        unsubscribeExpense ??= notifications.subscribeToRecurringExpenseChanged(handleExpenseChanged);
        unsubscribeIncome ??= notifications.subscribeToRecurringIncomeChanged(handleIncomeChanged);
        unsubscribeAccount ??= notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeExpense?.();
        unsubscribeIncome?.();
        unsubscribeAccount?.();
        unsubscribeExpense = null;
        unsubscribeIncome = null;
        unsubscribeAccount = null;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleExpenseChanged,
        handleIncomeChanged
    };
}

export type RecurringPaymentsRealtime = ReturnType<typeof createRecurringPaymentsRealtime>;
