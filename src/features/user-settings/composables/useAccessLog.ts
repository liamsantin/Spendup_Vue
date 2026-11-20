import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, type AccessLogEntry } from '@/features/auth';
import {
    accessLogStatusColor,
    enumLabel,
    formatDateTime,
    formatDurationMinutes,
    formatTime
} from '@/features/user-settings/security-format';

/** Taille de page par défaut (l’API accepte jusqu’à 100). */
export const ACCESS_LOG_PAGE_SIZE = 20;

/** Ligne prête à afficher : champs formatés, valeurs brutes conservées. */
export type AccessLogRow = {
    id: string;
    openedAtText: string;
    durationText: string;
    categoryText: string;
    reason: string;
    viewsText: string;
    status: string;
    statusText: string;
    statusColor: string;
    codeUsed: boolean;
    emailText: string;
    emailSent: boolean;
};

/**
 * Sécurité → Accès techniques : consultations des données de l’utilisateur par le support,
 * paginées du plus récent au plus ancien.
 * @param pageSize Taille de page (défaut 20).
 * @returns État et actions (objet réactif).
 */
export function useAccessLog(pageSize = ACCESS_LOG_PAGE_SIZE) {
    const auth = useAuthStore();
    const { t, te, locale } = useI18n();

    const items = ref<AccessLogEntry[]>([]);
    const page = ref(1);
    const totalCount = ref(0);
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);

    const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)));
    const hasPrevious = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);
    /** Vide seulement une fois la première page chargée sans erreur. */
    const isEmpty = computed(() => loaded.value && !loading.value && !error.value && totalCount.value === 0 && items.value.length === 0);

    /** « comptes ×2, transactions ×1 » ; ressources traduites, inconnues telles quelles. */
    function formatViews(entry: AccessLogEntry): string {
        if (!entry.views?.length) return t('security.accessLog.viewsNone');
        return entry.views
            .map((view) =>
                t('security.accessLog.viewCount', {
                    resource: enumLabel(t, te, 'security.accessLog.resources', view.resource),
                    count: view.count
                })
            )
            .join(', ');
    }

    function toRow(entry: AccessLogEntry): AccessLogRow {
        const emailSent = !!entry.userEmailSentAt;
        return {
            id: entry.publicId,
            openedAtText: formatDateTime(locale.value, entry.openedAt),
            durationText: formatDurationMinutes(t, entry.durationMinutes),
            categoryText: enumLabel(t, te, 'security.categories', entry.category),
            reason: entry.reason,
            viewsText: formatViews(entry),
            status: entry.status,
            statusText: enumLabel(t, te, 'security.accessLog.status', entry.status),
            statusColor: accessLogStatusColor(entry.status),
            codeUsed: entry.codeUsed,
            emailText: emailSent ? formatTime(locale.value, entry.userEmailSentAt) : t('security.accessLog.emailNotSent'),
            emailSent
        };
    }

    const rows = computed(() => items.value.map(toRow));

    const paginationText = computed(() =>
        t('security.accessLog.pagination.summary', { page: page.value, pages: totalPages.value, count: totalCount.value })
    );

    /**
     * Charge une page ; en cas d’erreur la page courante reste affichée.
     * @param target Numéro de page (défaut : page courante).
     */
    async function load(target: number = page.value) {
        loading.value = true;
        error.value = null;
        try {
            const result = await auth.getAccessLog(Math.max(1, target), pageSize);
            items.value = result.items ?? [];
            totalCount.value = result.totalCount ?? items.value.length;
            page.value = result.page || target;
            loaded.value = true;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    async function next() {
        if (!hasNext.value || loading.value) return;
        await load(page.value + 1);
    }

    async function previous() {
        if (!hasPrevious.value || loading.value) return;
        await load(page.value - 1);
    }

    onMounted(() => {
        void load(1);
    });

    return reactive({
        items,
        rows,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasPrevious,
        hasNext,
        isEmpty,
        loading,
        loaded,
        error,
        paginationText,
        load,
        next,
        previous
    });
}
