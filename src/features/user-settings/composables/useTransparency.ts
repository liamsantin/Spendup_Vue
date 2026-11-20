import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, type TransparencyReport } from '@/features/auth';
import {
    SUPPORT_ACCESS_CATEGORIES,
    enumLabel,
    formatCount,
    formatDateTime,
    formatDay,
    formatDurationMinutes,
    formatMonth
} from '@/features/user-settings/security-format';

export type TransparencyMonthRow = {
    month: string;
    monthText: string;
    consoleVisits: string;
    consultations: string;
    usersConsulted: string;
    loginsRefused: string;
};

export type TransparencyConsultationRow = {
    key: string;
    dayText: string;
    categoryText: string;
    durationText: string;
    codeText: string;
    codeUsed: boolean;
};

export type TransparencyVisitRow = {
    key: string;
    dayText: string;
    durationText: string;
    kind: string;
    kindText: string;
};

export type TransparencyCategoryRow = {
    category: string;
    categoryText: string;
    count: number;
    countText: string;
};

/**
 * Registre de transparence : activité de l’opérateur, identique pour tous les utilisateurs,
 * sans nom ni raison. Formate chaque bloc de `GET /api/auth/security/transparency`.
 * @returns État et lignes formatées (objet réactif).
 */
export function useTransparency() {
    const auth = useAuthStore();
    const { t, te, locale } = useI18n();

    const report = ref<TransparencyReport | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const category = (value: string) => enumLabel(t, te, 'security.categories', value);

    /** « Du 1 sept. 2026 au 5 nov. 2026 · 3 mois ». */
    const windowText = computed(() => {
        const current = report.value;
        if (!current) return '';
        return t('security.transparency.window', {
            from: formatDay(locale.value, current.fromDay),
            to: formatDay(locale.value, current.toDay),
            months: t('security.transparency.monthsShown', { n: current.monthsShown }, current.monthsShown)
        });
    });

    const generatedAtText = computed(() =>
        report.value ? t('security.transparency.generatedAt', { date: formatDateTime(locale.value, report.value.generatedAt) }) : ''
    );

    const months = computed<TransparencyMonthRow[]>(() =>
        (report.value?.months ?? []).map((m) => ({
            month: m.month,
            monthText: formatMonth(locale.value, m.month),
            consoleVisits: formatCount(locale.value, m.consoleVisits),
            consultations: formatCount(locale.value, m.consultations),
            usersConsulted: formatCount(locale.value, m.usersConsulted),
            loginsRefused: formatCount(locale.value, m.loginsRefused)
        }))
    );

    const consultations = computed<TransparencyConsultationRow[]>(() =>
        (report.value?.consultations ?? []).map((c, index) => ({
            key: `${c.day}-${index}`,
            dayText: formatDay(locale.value, c.day),
            categoryText: category(c.category),
            durationText: formatDurationMinutes(t, c.durationMinutes),
            codeText: c.codeUsed ? t('security.transparency.consultations.codeYes') : t('security.transparency.consultations.codeNo'),
            codeUsed: c.codeUsed
        }))
    );

    const visits = computed<TransparencyVisitRow[]>(() =>
        (report.value?.consoleVisits ?? []).map((v, index) => ({
            key: `${v.day}-${index}`,
            dayText: formatDay(locale.value, v.day),
            durationText: formatDurationMinutes(t, v.durationMinutes),
            kind: v.kind,
            kindText: enumLabel(t, te, 'security.transparency.visits.kinds', v.kind)
        }))
    );

    /** Les cinq catégories connues d’abord (toujours présentes, même à zéro), puis d’éventuelles catégories inconnues. */
    const byCategory = computed<TransparencyCategoryRow[]>(() => {
        if (!report.value) return [];
        const counts = new Map<string, number>();
        for (const entry of report.value.byCategory ?? []) counts.set(entry.category, entry.count);
        const ordered: string[] = [...SUPPORT_ACCESS_CATEGORIES];
        for (const key of counts.keys()) if (!ordered.includes(key)) ordered.push(key);
        return ordered.map((c) => {
            const count = counts.get(c) ?? 0;
            return { category: c, categoryText: category(c), count, countText: formatCount(locale.value, count) };
        });
    });

    const consultationsTotal = computed(() => byCategory.value.reduce((sum, row) => sum + row.count, 0));

    /** Compteur : nombre formaté, ou « indisponible » (jamais 0) quand `available` est faux. */
    const counterAvailable = computed(() => report.value?.humanInterventions?.available === true);
    const counterText = computed(() => {
        const counter = report.value?.humanInterventions;
        if (!counter || !counter.available) return t('security.transparency.counter.unavailable');
        return formatCount(locale.value, counter.eventsTotal ?? 0);
    });
    const counterUpdatedAtText = computed(() => {
        const counter = report.value?.humanInterventions;
        if (!counter?.available || !counter.updatedAt) return '';
        return t('security.transparency.counter.updatedAt', { date: formatDateTime(locale.value, counter.updatedAt) });
    });

    async function load() {
        loading.value = true;
        error.value = null;
        try {
            report.value = await auth.getTransparency();
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    onMounted(() => {
        void load();
    });

    return reactive({
        report,
        loading,
        error,
        windowText,
        generatedAtText,
        months,
        consultations,
        visits,
        byCategory,
        consultationsTotal,
        counterAvailable,
        counterText,
        counterUpdatedAtText,
        load
    });
}
