import type { RealEstateCrud } from '@/features/real-estate/stores/internal/real-estate-crud';
import type { RealEstateRealtime } from '@/features/real-estate/stores/internal/real-estate-realtime';
import type { RealEstateState } from '@/features/real-estate/stores/internal/real-estate-state';

type LifecycleDeps = Pick<RealEstateCrud, 'cancelPendingLoads'> &
    Pick<RealEstateRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createRealEstateLifecycle(state: RealEstateState, deps: LifecycleDeps) {
    const { cache, error, resetActing, clearRecentMutations, clearAll } = state;
    const { cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    /** Aucune liste globale : les sous-listes se chargent à l’ouverture d’une fiche. */
    async function bootstrap() {
        ensureRealtimeBridge();
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        clearAll();
        resetActing();
        error.value = null;
        clearRecentMutations();
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type RealEstateLifecycle = ReturnType<typeof createRealEstateLifecycle>;
