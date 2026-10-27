import type { InvestmentsState } from '@/features/investments/stores/internal/investments-state';
import type { InvestmentsPositions } from '@/features/investments/stores/internal/investments-positions';
import type { InvestmentsOperations } from '@/features/investments/stores/internal/investments-operations';
import type { InvestmentsRealtime } from '@/features/investments/stores/internal/investments-realtime';

type LifecycleDeps = Pick<InvestmentsPositions, 'loadPositions' | 'cancelPendingPositions'> &
    Pick<InvestmentsOperations, 'loadOperations' | 'cancelPendingOperations'> &
    Pick<InvestmentsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createInvestmentsLifecycle(state: InvestmentsState, deps: LifecycleDeps) {
    const { loadPositions, cancelPendingPositions, loadOperations, cancelPendingOperations, ensureRealtimeBridge, teardownRealtimeBridge } =
        deps;

    /** Branche le temps réel puis charge positions + journal du compte donné. */
    async function bootstrap(accountPublicId: string, options: { includeClosed?: boolean } = {}) {
        ensureRealtimeBridge();
        await Promise.all([loadPositions(accountPublicId, options), loadOperations(accountPublicId)]);
        state.initialized.value = true;
    }

    function reset() {
        cancelPendingPositions();
        cancelPendingOperations();
        state.cache.reset();
        state.positionsByAccount.value = {};
        state.includeClosedByAccount.value = {};
        state.operationsByAccount.value = {};
        state.loadingPositions.value = false;
        state.loadingOperations.value = false;
        state.resetActing();
        state.initialized.value = false;
        state.error.value = null;
        state.clearRecentMutations();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type InvestmentsLifecycle = ReturnType<typeof createInvestmentsLifecycle>;
