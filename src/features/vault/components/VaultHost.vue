<script setup lang="ts">
/**
 * Hôte du Coffre dans `/app` : relit l’état au montage puis affiche, selon la situation,
 * - le bandeau de migration silencieuse ;
 * - le bandeau « Coffre verrouillé » (emballage par mot de passe perdu) avec secours par code ou remise à zéro ;
 * - la demande de phrase de Coffre après une connexion Google sur un appareil sans clé ;
 * - une fois, discrètement, la proposition de définir une phrase de Coffre à un compte Google sans Coffre.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import VaultMigrationBanner from '@/features/vault/components/VaultMigrationBanner.vue';
import VaultPhraseUnlockDialog from '@/features/vault/components/VaultPhraseUnlockDialog.vue';
import VaultRestoreDialog from '@/features/vault/components/VaultRestoreDialog.vue';
import VaultResetDialog from '@/features/vault/components/VaultResetDialog.vue';
import VaultSetupDialog from '@/features/vault/components/VaultSetupDialog.vue';

/** Clé `localStorage` (par utilisateur) : la proposition de phrase n’est montrée qu’une fois. */
const SETUP_HINT_KEY_PREFIX = 'spendup.vault.setupHint.';

const { t } = useI18n();
const auth = useAuthStore();
const vault = useVaultStore();

const unlockOpen = ref(false);
const restoreOpen = ref(false);
const resetOpen = ref(false);
const setupOpen = ref(false);
const setupHintDismissed = ref(false);
const bootstrapped = ref(false);

const userId = computed(() => auth.user?.userPublicId ?? null);

function hintKey(): string | null {
    return userId.value ? `${SETUP_HINT_KEY_PREFIX}${userId.value}` : null;
}

function hintAlreadyShown(): boolean {
    const key = hintKey();
    if (!key) return true;
    try {
        return localStorage.getItem(key) === '1';
    } catch {
        return true;
    }
}

function rememberHintShown(): void {
    const key = hintKey();
    if (!key) return;
    try {
        localStorage.setItem(key, '1');
    } catch {
        // Stockage indisponible : la proposition reviendra à la prochaine connexion.
    }
}

/** Emballage par mot de passe perdu : secours par code si possible, sinon remise à zéro. */
const lockedBannerVisible = computed(() => bootstrapped.value && vault.passwordWrapLost);

/** Compte Google seul, sans Coffre : proposition discrète, une seule fois. */
const setupHintVisible = computed(
    () =>
        bootstrapped.value &&
        !setupHintDismissed.value &&
        auth.user?.hasPassword === false &&
        vault.status != null &&
        !vault.exists &&
        !hintAlreadyShown()
);

function dismissSetupHint(): void {
    setupHintDismissed.value = true;
    rememberHintShown();
}

function openSetupFromHint(): void {
    dismissSetupHint();
    setupOpen.value = true;
}

/** Connexion Google : un Coffre existe, l’appareil n’a pas la clé → demander la phrase. */
async function maybePromptPhrase(): Promise<void> {
    if (!vault.phraseUnlockRequested) return;
    vault.clearPhraseUnlockRequest();
    if (await vault.ensureReady()) return;
    const status = vault.status ?? (await vault.loadStatus());
    if (!status?.exists || !status.dekWrappedPassword) return;
    unlockOpen.value = true;
}

onMounted(async () => {
    await vault.bootstrap();
    bootstrapped.value = true;
    vault.startBackgroundMigration();
    await maybePromptPhrase();
});

watch(
    () => vault.phraseUnlockRequested,
    (requested) => {
        if (requested && bootstrapped.value) void maybePromptPhrase();
    }
);

function afterChange(): void {
    void vault.loadStatus();
}
</script>

<template>
    <div class="vault-host">
        <!-- Secours : une ligne sur filet 2 px en bas d’écran, deux actions au plus. -->
        <div v-if="lockedBannerVisible" class="vault-locked" role="alert" data-test="vault-locked-banner">
            <div class="vault-locked__text">
                <strong>{{ t('vault.locked.title') }}</strong>
                <span>{{ t(vault.hasRecovery ? 'vault.locked.textRecoverable' : 'vault.locked.textLost') }}</span>
            </div>
            <div class="vault-locked__actions">
                <button
                    v-if="vault.hasRecovery"
                    type="button"
                    class="su-btn su-btn--ink su-btn--sm"
                    data-test="vault-locked-restore"
                    @click="restoreOpen = true"
                >
                    {{ t('vault.locked.restore') }}
                </button>
                <button type="button" class="su-btn su-btn--sm" data-test="vault-locked-reset" @click="resetOpen = true">
                    {{ t('vault.locked.reset') }}
                </button>
            </div>
        </div>

        <!-- Proposition discrète (compte Google sans Coffre), une seule fois. -->
        <div v-else-if="setupHintVisible" class="vault-hint" role="status" data-test="vault-setup-hint">
            <span class="vault-hint__text">{{ t('vault.setup.hintText') }}</span>
            <div class="vault-locked__actions">
                <button type="button" class="su-btn su-btn--ink su-btn--sm" data-test="vault-setup-hint-open" @click="openSetupFromHint">
                    {{ t('vault.setup.hintAction') }}
                </button>
                <button type="button" class="su-btn su-btn--ghost su-btn--sm" data-test="vault-setup-hint-later" @click="dismissSetupHint">
                    {{ t('vault.setup.hintLater') }}
                </button>
            </div>
        </div>

        <VaultMigrationBanner v-else />

        <VaultPhraseUnlockDialog v-model="unlockOpen" @unlocked="afterChange" />
        <VaultRestoreDialog v-model="restoreOpen" @restored="afterChange" />
        <VaultResetDialog v-model="resetOpen" @reset="afterChange" />
        <VaultSetupDialog v-model="setupOpen" @created="afterChange" />
    </div>
</template>

<style scoped>
.vault-locked,
.vault-hint {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    padding: 12px 16px;
    background: var(--bg);
    border-top: 2px solid var(--ink);
    font-size: 13px;
    color: var(--gray);
}

.vault-locked {
    border-top-color: var(--violet-ink);
}

.vault-locked__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 28ch;
    min-width: 0;
}

.vault-locked__text strong {
    color: var(--ink);
}

.vault-hint__text {
    flex: 1 1 28ch;
    min-width: 0;
    color: var(--ink);
}

.vault-locked__actions {
    display: flex;
    gap: 8px;
    flex: none;
}
</style>
