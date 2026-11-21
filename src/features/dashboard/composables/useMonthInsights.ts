import { ref, shallowRef, watch, type Ref } from 'vue';
import { insightsApi, type MonthInsights } from '@/features/dashboard/insights';

/**
 * Résumé d’un mois (`GET /api/insights/month`), rechargé quand le mois ou la devise change.
 * Une réponse arrivée après un changement plus récent est ignorée.
 */
export function useMonthInsights(month: Readonly<Ref<string>>, currency: Readonly<Ref<string | null | undefined>>) {
    const data = shallowRef<MonthInsights | null>(null);
    const loading = ref(true);
    const failed = ref(false);
    let seq = 0;

    async function load() {
        const ticket = ++seq;
        loading.value = true;
        failed.value = false;
        try {
            const result = await insightsApi.month(month.value, currency.value);
            if (ticket === seq) data.value = result;
        } catch {
            if (ticket === seq) {
                data.value = null;
                failed.value = true;
            }
        } finally {
            if (ticket === seq) loading.value = false;
        }
    }

    watch([month, currency], () => void load(), { immediate: true });

    return { data, loading, failed, reload: load };
}
