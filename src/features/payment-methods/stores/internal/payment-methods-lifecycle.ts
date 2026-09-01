import { KEY_GLOBAL, type PaymentMethodsState } from '@/features/payment-methods/stores/internal/payment-methods-state';
import type { PaymentMethodsCrud } from '@/features/payment-methods/stores/internal/payment-methods-crud';
import type { PaymentMethodsRealtime } from '@/features/payment-methods/stores/internal/payment-methods-realtime';
import { PAYMENT_METHOD_PAGE_SIZE_DEFAULT } from '@/features/payment-methods/types';

type LifecycleDeps = Pick<PaymentMethodsCrud, 'loadList' | 'cancelPendingLoads'> &
    Pick<PaymentMethodsRealtime, 'ensureRealtimeBridge' | 'teardownRealtimeBridge'>;

export function createPaymentMethodsLifecycle(state: PaymentMethodsState, deps: LifecycleDeps) {
    const { items, itemsByListKey, loading, loadingMore, initialized, error, cache, resetActing, activateList } = state;
    const { loadList, cancelPendingLoads, ensureRealtimeBridge, teardownRealtimeBridge } = deps;

    async function bootstrap(accountPublicId?: string | null) {
        ensureRealtimeBridge();
        await loadList({ accountPublicId: accountPublicId ?? undefined });
        initialized.value = true;
    }

    function reset() {
        cancelPendingLoads();
        cache.reset();
        itemsByListKey.clear();
        activateList(KEY_GLOBAL);
        items.value = [];
        loading.value = false;
        loadingMore.value = false;
        resetActing();
        initialized.value = false;
        error.value = null;
        state.page.value = 1;
        state.pageSize.value = PAYMENT_METHOD_PAGE_SIZE_DEFAULT;
        state.totalCount.value = 0;
        teardownRealtimeBridge();
    }

    return { bootstrap, reset };
}

export type PaymentMethodsLifecycle = ReturnType<typeof createPaymentMethodsLifecycle>;
