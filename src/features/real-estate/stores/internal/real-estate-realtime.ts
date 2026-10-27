import { useNotificationsStore, parseAssetChangedPayload } from '@/features/notifications';
import type { AssetChangedPayload } from '@/features/notifications';
import type { RealEstateCrud } from '@/features/real-estate/stores/internal/real-estate-crud';
import type { RealEstateState } from '@/features/real-estate/stores/internal/real-estate-state';

type RealtimeDeps = Pick<RealEstateCrud, 'refetchLoaded'>;

/**
 * `assetChanged` — un seul événement couvre le bien et ses sous-ressources.
 * `assetRealEstateChanged` / `assetUpdated` d’un bien chargé → refetch des sous-listes chargées
 * (la synthèse est rafraîchie par `@/features/assets`). `assetDeleted` → purge locale.
 */
export function createRealEstateRealtime(state: RealEstateState, deps: RealtimeDeps) {
    const { consumeLocalMutation, bucketOf, forget } = state;
    const { refetchLoaded } = deps;

    let unsubscribeAssetChanged: (() => void) | null = null;
    const scheduled = new Set<string>();

    /** Regroupe les événements d’une même tâche en un seul refetch par bien. */
    function scheduleRefetch(assetPublicId: string) {
        if (scheduled.has(assetPublicId)) return;
        scheduled.add(assetPublicId);
        queueMicrotask(() => {
            scheduled.delete(assetPublicId);
            if (!bucketOf(assetPublicId)) return;
            void refetchLoaded(assetPublicId);
        });
    }

    function handleAssetChanged(payload: AssetChangedPayload) {
        const parsed = parseAssetChangedPayload(payload);
        if (!parsed) return;
        const { change, assetPublicId } = parsed;

        if (change === 'assetDeleted') {
            forget(assetPublicId);
            return;
        }
        if (change !== 'assetRealEstateChanged' && change !== 'assetUpdated') return;
        // bien jamais ouvert : rien à rafraîchir
        if (!bucketOf(assetPublicId)) return;
        if (consumeLocalMutation(assetPublicId)) return;
        scheduleRefetch(assetPublicId);
    }

    function ensureRealtimeBridge() {
        if (unsubscribeAssetChanged) return;
        unsubscribeAssetChanged = useNotificationsStore().subscribeToAssetChanged(handleAssetChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeAssetChanged?.();
        unsubscribeAssetChanged = null;
        scheduled.clear();
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleAssetChanged
    };
}

export type RealEstateRealtime = ReturnType<typeof createRealEstateRealtime>;
