import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { recurringSuggestionsApi } from '@/features/recurring-payments/api';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';
import type {
    AcceptRecurringSuggestionPayload,
    AcceptRecurringSuggestionResult,
    ListRecurringSuggestionsQuery,
    RecurringSuggestion
} from '@/features/recurring-payments/types';

/**
 * Suggestions de récurrences (`propose`) d’**une** portée à la fois : un compte (page Récurrences)
 * ou un import (panneau de résultat). Pas de SignalR dédié côté API : la liste est relue à l’ouverture.
 * Accepter crée le modèle ; `recurringExpenseChanged` / `recurringIncomeChanged` suivent (acteur inclus),
 * le store des récurrences est en plus relu tout de suite.
 */
export const useRecurringSuggestionsStore = defineStore('recurringSuggestions', () => {
    const items = ref<RecurringSuggestion[]>([]);
    const scopeKey = ref<string | null>(null);
    const loading = ref(false);
    const scanning = ref(false);
    /** `publicId` de la suggestion en cours d’acceptation / de refus. */
    const actingId = ref<string | null>(null);
    let requestSeq = 0;

    const hasItems = computed(() => items.value.length > 0);

    function keyFor(query: ListRecurringSuggestionsQuery): string {
        return `${query.accountPublicId ?? ''}|${query.importPublicId ?? ''}|${query.status ?? ''}`;
    }

    function removeLocal(publicId: string) {
        items.value = items.value.filter((item) => item.publicId !== publicId);
    }

    /** Remplace la liste ; une réponse d’une portée périmée est ignorée. */
    async function load(query: ListRecurringSuggestionsQuery) {
        const key = keyFor(query);
        if (scopeKey.value !== key) items.value = [];
        scopeKey.value = key;
        const seq = ++requestSeq;
        loading.value = true;
        try {
            const result = await recurringSuggestionsApi.list(query);
            if (seq === requestSeq) items.value = result.items;
        } finally {
            if (seq === requestSeq) loading.value = false;
        }
    }

    /** Relance la détection sur le compte et affiche ses suggestions. */
    async function scan(accountPublicId: string) {
        scopeKey.value = keyFor({ accountPublicId });
        const seq = ++requestSeq;
        scanning.value = true;
        try {
            const result = await recurringSuggestionsApi.scan(accountPublicId);
            if (seq === requestSeq) items.value = result.items;
        } finally {
            scanning.value = false;
            if (seq === requestSeq) loading.value = false;
        }
    }

    async function accept(publicId: string, body: AcceptRecurringSuggestionPayload = {}): Promise<AcceptRecurringSuggestionResult> {
        actingId.value = publicId;
        try {
            const result = await recurringSuggestionsApi.accept(publicId, body);
            removeLocal(publicId);
            void useRecurringPaymentsStore()
                .refetchKind(result.recurringIncome ? 'income' : 'expense')
                .catch(() => undefined);
            return result;
        } finally {
            actingId.value = null;
        }
    }

    async function dismiss(publicId: string): Promise<RecurringSuggestion> {
        actingId.value = publicId;
        try {
            const result = await recurringSuggestionsApi.dismiss(publicId);
            removeLocal(publicId);
            return result;
        } finally {
            actingId.value = null;
        }
    }

    function reset() {
        requestSeq++;
        items.value = [];
        scopeKey.value = null;
        loading.value = false;
        scanning.value = false;
        actingId.value = null;
    }

    return { items, loading, scanning, actingId, hasItems, load, scan, accept, dismiss, reset };
});
