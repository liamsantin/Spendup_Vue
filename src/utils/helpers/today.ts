import { computed, onScopeDispose, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { todayYmdInTimeZone } from '@/features/accounts/format';

/**
 * Fuseau à utiliser pour « aujourd'hui » : celui des réglages de l'utilisateur, sinon celui du navigateur.
 * C'est la règle de l'API, qui juge le « futur » dans le fuseau de l'utilisateur, jamais en UTC.
 */
export function effectiveTimeZone(timeZone?: string | null): string {
    const configured = timeZone?.trim();
    if (configured) return configured;
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

/** Date du jour (`YYYY-MM-DD`) dans le fuseau effectif. */
export function todayInTimeZone(timeZone?: string | null, now = new Date()): string {
    return todayYmdInTimeZone(effectiveTimeZone(timeZone), now);
}

/**
 * « Aujourd'hui » réactif : suit le fuseau donné et se recalcule chaque minute, donc passe au jour suivant
 * après minuit même si la page reste ouverte. Le minuteur s'arrête avec le composant (ou le scope) appelant.
 */
export function useTodayYmd(timeZone: MaybeRefOrGetter<string | null | undefined>, intervalMs = 60_000): ComputedRef<string> {
    const now = ref(new Date());
    const timer = setInterval(() => {
        now.value = new Date();
    }, intervalMs);
    onScopeDispose(() => clearInterval(timer));
    return computed(() => todayInTimeZone(toValue(timeZone), now.value));
}
