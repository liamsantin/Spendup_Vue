import { useNotificationsStore } from '@/features/notifications';
import { parseAccountChangedPayload, parseAssetChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload, AssetChangedPayload } from '@/features/notifications';
import type { AssetsCrud } from '@/features/assets/stores/internal/assets-crud';
import type { AssetsState } from '@/features/assets/stores/internal/assets-state';

type RealtimeDeps = Pick<AssetsCrud, 'refetchActive' | 'fetchAsset'>;

/**
 * `assetChanged` — CRUD perso, acteur inclus, pas d’inbox.
 * `accountChanged` (toute valeur) — une épargne adossée suit le solde de son compte.
 */
export function createAssetsRealtime(state: AssetsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized, invalidateAllLists, invalidateSubLists, removeItemLocal, notifyDeleted, knownById } = state;
    const { refetchActive, fetchAsset } = deps;

    let unsubscribeAssetChanged: (() => void) | null = null;
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

    function handleAssetChanged(payload: AssetChangedPayload) {
        const parsed = parseAssetChangedPayload(payload);
        if (!parsed) return;
        const { change, assetPublicId } = parsed;

        if (consumeLocalMutation(assetPublicId)) return;

        if (change === 'assetDeleted') {
            removeItemLocal(assetPublicId);
            invalidateAllLists();
            notifyDeleted(assetPublicId);
            scheduleRefetch();
            return;
        }

        // Mise à jour d’un actif connu : refetch du détail seul (`upsertItem` replace l’actif dans les listes).
        if ((change === 'assetUpdated' || change === 'assetRealEstateChanged') && knownById.has(assetPublicId)) {
            invalidateSubLists(assetPublicId);
            void fetchAsset(assetPublicId, true).catch(() => undefined);
            return;
        }

        // Création (ou mise à jour d’un actif inconnu) : refetch de la liste active.
        invalidateAllLists();
        scheduleRefetch();
    }

    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed) return;
        // Seuls les actifs dont la valeur suit le solde de ce compte sont refetchés (détail → listes via `upsertItem`).
        for (const asset of [...knownById.values()]) {
            if (asset.isValueFromAccount && asset.savingsAccount?.accountPublicId === parsed.accountPublicId) {
                invalidateSubLists(asset.publicId);
                void fetchAsset(asset.publicId, true).catch(() => undefined);
            }
        }
    }

    function ensureRealtimeBridge() {
        if (unsubscribeAssetChanged && unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeAssetChanged ??= notifications.subscribeToAssetChanged(handleAssetChanged);
        unsubscribeAccountChanged ??= notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeAssetChanged?.();
        unsubscribeAccountChanged?.();
        unsubscribeAssetChanged = null;
        unsubscribeAccountChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleAssetChanged,
        handleAccountChanged
    };
}

export type AssetsRealtime = ReturnType<typeof createAssetsRealtime>;
