import { useNotificationsStore } from '@/features/notifications';
import type { NetWorthLoad } from '@/features/net-worth/stores/internal/net-worth-load';
import type { NetWorthState } from '@/features/net-worth/stores/internal/net-worth-state';

export const NET_WORTH_REFETCH_DEBOUNCE_MS = 800;

type RealtimeDeps = Pick<NetWorthLoad, 'load'>;

/**
 * Pas d’événement « patrimoine net » côté serveur : tout événement actif / passif / prêt /
 * dette partagée / compte déclenche un seul recalcul débouncé (`GET /api/net-worth`),
 * uniquement si la page a déjà été chargée.
 */
export function createNetWorthRealtime(state: NetWorthState, deps: RealtimeDeps) {
    const { initialized, cache } = state;
    const { load } = deps;

    let unsubscribers: (() => void)[] = [];
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;

    function cancelScheduledRefetch() {
        if (refetchTimer) clearTimeout(refetchTimer);
        refetchTimer = null;
    }

    function scheduleRefetch() {
        // Le prochain `load()` non forcé ne doit pas servir le cache même si le timer est annulé.
        cache.invalidate('*');
        if (refetchTimer) return;
        refetchTimer = setTimeout(() => {
            refetchTimer = null;
            if (!initialized.value) return;
            void load(true).catch(() => undefined);
        }, NET_WORTH_REFETCH_DEBOUNCE_MS);
    }

    function ensureRealtimeBridge() {
        if (unsubscribers.length) return;
        const notifications = useNotificationsStore();
        unsubscribers = [
            notifications.subscribeToAssetChanged(scheduleRefetch),
            notifications.subscribeToLiabilityChanged(scheduleRefetch),
            notifications.subscribeToPersonalLoanChanged(scheduleRefetch),
            notifications.subscribeToSharedDebtChanged(scheduleRefetch),
            notifications.subscribeToAccountChanged(scheduleRefetch)
        ];
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        for (const unsubscribe of unsubscribers) unsubscribe();
        unsubscribers = [];
        cancelScheduledRefetch();
    }

    return { scheduleRefetch, ensureRealtimeBridge, onAuthenticatedSession, teardownRealtimeBridge };
}

export type NetWorthRealtime = ReturnType<typeof createNetWorthRealtime>;
