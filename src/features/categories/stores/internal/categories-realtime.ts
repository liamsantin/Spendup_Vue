import { useNotificationsStore } from '@/features/notifications';
import { parseCategoryChangedPayload } from '@/features/notifications/normalize';
import type { CategoryChangedPayload } from '@/features/notifications';
import type { CategoriesCrud } from '@/features/categories/stores/internal/categories-crud';
import type { CategoriesState } from '@/features/categories/stores/internal/categories-state';

type RealtimeDeps = Pick<CategoriesCrud, 'refetchTree'>;

/**
 * Abonnement SignalR `categoryChanged` — sync multi-onglets du même utilisateur.
 */
export function createCategoriesRealtime(state: CategoriesState, deps: RealtimeDeps) {
    const { consumeLocalMutation, initialized } = state;
    const { refetchTree } = deps;

    let unsubscribeCategoryChanged: (() => void) | null = null;
    let refreshScheduled = false;

    function scheduleRefetch() {
        if (refreshScheduled) return;
        refreshScheduled = true;
        queueMicrotask(() => {
            refreshScheduled = false;
            if (!initialized.value) return;
            void refetchTree();
        });
    }

    function handleCategoryChanged(payload: CategoryChangedPayload) {
        const parsed = parseCategoryChangedPayload(payload);
        if (!parsed) return;
        if (consumeLocalMutation(parsed.categoryPublicId)) return;
        scheduleRefetch();
    }

    function ensureRealtimeBridge() {
        if (unsubscribeCategoryChanged) return;
        const notifications = useNotificationsStore();
        unsubscribeCategoryChanged = notifications.subscribeToCategoryChanged(handleCategoryChanged);
    }

    function onAuthenticatedSession() {
        ensureRealtimeBridge();
    }

    function teardownRealtimeBridge() {
        unsubscribeCategoryChanged?.();
        unsubscribeCategoryChanged = null;
        refreshScheduled = false;
    }

    return {
        ensureRealtimeBridge,
        onAuthenticatedSession,
        teardownRealtimeBridge,
        handleCategoryChanged
    };
}

export type CategoriesRealtime = ReturnType<typeof createCategoriesRealtime>;
