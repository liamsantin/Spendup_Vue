import { useNotificationsStore } from '@/features/notifications';
import { isInvestmentAccountChange, parseAccountChangedPayload } from '@/features/notifications/normalize';
import type { AccountChangedPayload } from '@/features/notifications';
import { useInstrumentsStore } from '@/features/investments/stores/instruments-store';
import type { InvestmentsState } from '@/features/investments/stores/internal/investments-state';
import type { InvestmentsPositions } from '@/features/investments/stores/internal/investments-positions';
import type { InvestmentsOperations } from '@/features/investments/stores/internal/investments-operations';

type RealtimeDeps = Pick<InvestmentsPositions, 'refetchPositions'> & Pick<InvestmentsOperations, 'refetchOperations'>;

/**
 * `accountChanged` `investmentOperation*` → positions + journal du compte (mutation locale ignorée).
 * `investmentPriceUpdated` → positions du compte + instruments visibles (cours manuel partagé par plusieurs comptes).
 */
export function createInvestmentsRealtime(state: InvestmentsState, deps: RealtimeDeps) {
    const { consumeLocalMutation, isAccountLoaded, invalidateAccount, positionsFor } = state;
    const { refetchPositions, refetchOperations } = deps;

    let unsubscribeAccountChanged: (() => void) | null = null;
    const scheduled = new Set<string>();

    function scheduleAccountRefetch(accountPublicId: string, withOperations: boolean) {
        const token = `${accountPublicId}:${withOperations ? 'all' : 'positions'}`;
        if (scheduled.has(token)) return;
        scheduled.add(token);
        queueMicrotask(() => {
            scheduled.delete(token);
            if (!isAccountLoaded(accountPublicId)) return;
            void refetchPositions(accountPublicId);
            if (withOperations) void refetchOperations(accountPublicId);
        });
    }

    function refreshVisibleInstruments(accountPublicId: string) {
        const positions = positionsFor(accountPublicId);
        if (!positions) return;
        const instruments = useInstrumentsStore();
        for (const position of positions.items) {
            void instruments.fetchInstrument(position.instrument.publicId, true).catch(() => undefined);
        }
    }

    function handleAccountChanged(payload: AccountChangedPayload) {
        const parsed = parseAccountChangedPayload(payload);
        if (!parsed || !isInvestmentAccountChange(parsed.change)) return;
        const { change, accountPublicId } = parsed;

        if (change === 'investmentPriceUpdated') {
            invalidateAccount(accountPublicId);
            if (!isAccountLoaded(accountPublicId)) return;
            refreshVisibleInstruments(accountPublicId);
            scheduleAccountRefetch(accountPublicId, false);
            return;
        }

        invalidateAccount(accountPublicId);
        if (consumeLocalMutation(accountPublicId)) return;
        scheduleAccountRefetch(accountPublicId, true);
    }

    function ensureRealtimeBridge() {
        if (unsubscribeAccountChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeAccountChanged = notifications.subscribeToAccountChanged(handleAccountChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeAccountChanged?.();
        unsubscribeAccountChanged = null;
        scheduled.clear();
    }

    return { ensureRealtimeBridge, onAuthenticatedSession, teardownRealtimeBridge, handleAccountChanged };
}

export type InvestmentsRealtime = ReturnType<typeof createInvestmentsRealtime>;
