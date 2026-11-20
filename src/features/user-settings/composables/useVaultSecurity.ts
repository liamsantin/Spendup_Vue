import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useVaultStore } from '@/features/vault/stores/vault-store';

/**
 * Carte « Coffre » de la page Sécurité : état du Coffre, périmètre couvert, rappel du code de récupération.
 * @returns État et actions (objet réactif).
 */
export function useVaultSecurity() {
    const vault = useVaultStore();
    const { t, locale } = useI18n();

    const loading = ref(false);
    const error = ref<string | null>(null);
    const success = ref<string | null>(null);
    const recoveryOpen = ref(false);
    const setupOpen = ref(false);
    const disableOpen = ref(false);
    const restoreOpen = ref(false);
    const resetOpen = ref(false);

    const dateFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }));

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

    const exists = computed(() => vault.exists);
    /** Aucune DEK emballée ne subsiste côté serveur : rien ne rouvrira ces champs. */
    const lost = computed(() => vault.status?.locked === true);
    const hasRecovery = computed(() => vault.hasRecovery);
    /** Emballage par mot de passe perdu (réinitialisation sans code) : secours par code ou remise à zéro. */
    const passwordWrapLost = computed(() => vault.passwordWrapLost);
    const canManageRecovery = computed(() => exists.value && !lost.value && !passwordWrapLost.value && vault.state !== 'disabling');
    /** Aucun Coffre : compte Google (phrase) ou compte inscrit avec un client ancien (mot de passe). */
    const canActivate = computed(() => vault.status != null && !exists.value);
    const canDisable = computed(() => exists.value && !lost.value && !passwordWrapLost.value && vault.state !== 'disabling');
    const isDisabling = computed(() => vault.state === 'disabling');
    const secretIsPhrase = computed(() => useAuthStore().user?.hasPassword === false);

    /** Phrase d’état et couleur de son carré : bleu actif, violet en cours ou fermé, gris absent. */
    const statusText = computed(() => {
        if (!exists.value) return t('security.vault.status.absent');
        if (lost.value) return t('security.vault.status.lost');
        if (passwordWrapLost.value) return t('security.vault.status.wrapLost');
        if (vault.state === 'migrating') return t('security.vault.status.migrating', { count: vault.pendingCount });
        if (vault.state === 'disabling') return t('security.vault.status.disabling');
        if (vault.locked) return t('security.vault.status.locked');
        return t('security.vault.status.active');
    });

    const statusColor = computed(() => {
        if (!exists.value || lost.value) return 'var(--gray)';
        if (vault.state === 'migrating' || vault.state === 'disabling' || vault.locked || passwordWrapLost.value) return 'var(--violet)';
        return 'var(--blue)';
    });

    const scopeText = computed(() => t(vault.allowedScope === 'extended' ? 'security.vault.scope.extended' : 'security.vault.scope.core'));

    const recoveryText = computed(() => {
        if (hasRecovery.value) return t('security.vault.recovery.done', { date: formatDate(vault.status?.recoveryCreatedAt) });
        return t('security.vault.recovery.reminder');
    });

    const recoveryButtonLabel = computed(() => t(hasRecovery.value ? 'security.vault.recovery.renew' : 'security.vault.recovery.generate'));

    /** Charge l’état depuis l’API (`GET /api/vault`). */
    async function load() {
        loading.value = true;
        error.value = null;
        try {
            await vault.ensureReady();
            const status = await vault.loadStatus();
            if (!status) error.value = t('security.vault.status.absent');
        } finally {
            loading.value = false;
        }
    }

    function openRecovery() {
        recoveryOpen.value = true;
    }

    function openSetup() {
        success.value = null;
        setupOpen.value = true;
    }

    function openDisable() {
        success.value = null;
        disableOpen.value = true;
    }

    function openRestore() {
        success.value = null;
        restoreOpen.value = true;
    }

    function openReset() {
        success.value = null;
        resetOpen.value = true;
    }

    async function onCreated() {
        success.value = t(secretIsPhrase.value ? 'security.vault.success.createdPhrase' : 'security.vault.success.created');
        await load();
    }

    async function onDisabled() {
        success.value = t('security.vault.success.disabled');
        await load();
    }

    async function onRestored() {
        success.value = t('security.vault.success.restored');
        await load();
    }

    async function onReset() {
        success.value = t('security.vault.success.reset');
        await load();
    }

    onMounted(() => {
        void load();
    });

    return reactive({
        loading,
        error,
        success,
        recoveryOpen,
        setupOpen,
        disableOpen,
        restoreOpen,
        resetOpen,
        exists,
        lost,
        passwordWrapLost,
        hasRecovery,
        canManageRecovery,
        canActivate,
        canDisable,
        isDisabling,
        secretIsPhrase,
        statusText,
        statusColor,
        scopeText,
        recoveryText,
        recoveryButtonLabel,
        locked: computed(() => vault.locked),
        formatDate,
        load,
        openRecovery,
        openSetup,
        openDisable,
        openRestore,
        openReset,
        onCreated,
        onDisabled,
        onRestored,
        onReset
    });
}
