import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, type SupportCode, type SupportCodeStatus } from '@/features/auth';

/** Durée d’affichage du libellé « Copié » sur le bouton. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Code d’assistance (consultation support en lecture seule) : état courant,
 * génération et copie du code, montré une seule fois.
 * @returns État et actions (objet réactif).
 */
export function useSupportCode() {
    const auth = useAuthStore();
    const { t, locale } = useI18n();

    const status = ref<SupportCodeStatus | null>(null);
    const statusLoading = ref(false);
    const generated = ref<SupportCode | null>(null);
    const generating = ref(false);
    const copied = ref(false);
    const error = ref<string | null>(null);

    let copiedTimer: ReturnType<typeof setTimeout> | null = null;

    const dateFormatter = computed(
        () =>
            new Intl.DateTimeFormat(locale.value, {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
    );

    /**
     * Formate une date ISO pour l’UI ; renvoie la chaîne brute si invalide.
     * @param value ISO ou chaîne brute.
     */
    function formatDate(value: string | null | undefined): string {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return dateFormatter.value.format(date);
    }

    /** Un code actif existe (état serveur ou code tout juste généré). */
    const hasActiveCode = computed(() => !!generated.value || status.value?.hasActiveCode === true);

    /** Phrase d’état : actif jusqu’au…, utilisé le…, ou aucun code. */
    const statusText = computed(() => {
        const current = status.value;
        if (!current) return '';
        if (current.hasActiveCode && current.expiresAt) {
            return t('security.supportCode.status.active', { date: formatDate(current.expiresAt) });
        }
        if (current.usedAt) {
            return t('security.supportCode.status.used', { date: formatDate(current.usedAt) });
        }
        return t('security.supportCode.status.none');
    });

    /** Libellé du bouton : « nouveau code » quand un code est déjà actif. */
    const generateLabel = computed(() => (hasActiveCode.value ? t('security.supportCode.regenerate') : t('security.supportCode.generate')));

    /** Date d’expiration du code tout juste généré, formatée. */
    const generatedExpiresText = computed(() =>
        generated.value ? t('security.supportCode.expiresAt', { date: formatDate(generated.value.expiresAt) }) : ''
    );

    /** Charge l’état du code courant depuis l’API. */
    async function loadStatus() {
        statusLoading.value = true;
        error.value = null;
        try {
            status.value = await auth.getSupportCodeStatus();
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            status.value = null;
        } finally {
            statusLoading.value = false;
        }
    }

    /** Génère un code (remplace le précédent) et met l’état à jour. */
    async function generate() {
        if (generating.value) return;
        generating.value = true;
        error.value = null;
        copied.value = false;
        try {
            const result = await auth.generateSupportCode();
            generated.value = result;
            status.value = {
                hasActiveCode: true,
                expiresAt: result.expiresAt,
                usedAt: null
            };
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            generating.value = false;
        }
    }

    /** Copie le code affiché dans le presse-papiers. */
    async function copyCode() {
        const code = generated.value?.code;
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            copied.value = true;
            if (copiedTimer) clearTimeout(copiedTimer);
            copiedTimer = setTimeout(() => {
                copied.value = false;
            }, COPIED_FEEDBACK_MS);
        } catch {
            error.value = t('security.supportCode.errors.copyFailed');
        }
    }

    onMounted(() => {
        void loadStatus();
    });

    onUnmounted(() => {
        if (copiedTimer) clearTimeout(copiedTimer);
    });

    return reactive({
        status,
        statusLoading,
        generated,
        generating,
        copied,
        error,
        hasActiveCode,
        statusText,
        generateLabel,
        generatedExpiresText,
        formatDate,
        loadStatus,
        generate,
        copyCode
    });
}
