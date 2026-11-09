<script setup lang="ts">
/**
 * Section Coffre — état (actif / migration / absent), périmètre couvert et rappel du code de récupération.
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useVaultSecurity } from '@/features/user-settings/composables/useVaultSecurity';
import VaultRecoveryDialog from '@/features/user-settings/components/security/VaultRecoveryDialog.vue';

const { t } = useI18n();
const vaultSecurity = useVaultSecurity();
</script>

<template>
    <section class="su-settings security-vault">
        <div class="su-settings__lead">
            <h2>{{ t('security.vault.title') }}</h2>
            <p>{{ t('security.vault.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="vaultSecurity.error" type="error" class="is-full su-alert" closable @dismiss="vaultSecurity.error = null">
                {{ vaultSecurity.error }}
            </AppAlert>

            <!-- État = petit carré (bleu actif, violet en cours, gris absent) + texte. -->
            <div class="is-full security-vault__row">
                <div class="security-vault__text">
                    <div v-if="vaultSecurity.loading" class="su-loading security-vault__loading">
                        <span class="su-spin" />
                    </div>
                    <span
                        v-else
                        class="su-chip security-vault__status"
                        data-test="vault-status"
                        :style="{ '--chip-color': vaultSecurity.statusColor }"
                    >
                        {{ vaultSecurity.statusText }}
                    </span>
                    <p>{{ t('security.vault.description') }}</p>
                    <p v-if="!vaultSecurity.loading && !vaultSecurity.exists" class="security-vault__hint">
                        {{ t('security.vault.absentHint') }}
                    </p>
                    <p v-else-if="!vaultSecurity.loading && vaultSecurity.locked && !vaultSecurity.lost" class="security-vault__hint">
                        {{ t('security.vault.lockedHint') }}
                    </p>
                </div>
            </div>

            <!-- Périmètre couvert : socle pour tous, étendu selon l’offre. -->
            <div v-if="vaultSecurity.exists" class="is-full su-kv security-vault__scope" data-test="vault-scope">
                <dt>{{ t('security.vault.scope.label') }}</dt>
                <dd>{{ vaultSecurity.scopeText }}</dd>
            </div>

            <!-- Code de récupération : rappel honnête tant qu’il n’existe pas, renouvellement ensuite. -->
            <div v-if="vaultSecurity.canManageRecovery" class="is-full security-vault__recovery" data-test="vault-recovery">
                <div class="security-vault__text">
                    <p class="security-vault__recovery-title" :class="{ 'is-reminder': !vaultSecurity.hasRecovery }">
                        {{ vaultSecurity.recoveryText }}
                    </p>
                    <p>{{ t(vaultSecurity.hasRecovery ? 'security.vault.recovery.doneText' : 'security.vault.recovery.reminderText') }}</p>
                    <p v-if="vaultSecurity.hasRecovery" class="security-vault__hint">{{ t('security.vault.recovery.renewHint') }}</p>
                </div>
                <button
                    type="button"
                    class="su-btn"
                    :class="vaultSecurity.hasRecovery ? '' : 'su-btn--ink'"
                    data-test="vault-recovery-generate"
                    @click="vaultSecurity.openRecovery"
                >
                    {{ vaultSecurity.recoveryButtonLabel }}
                </button>
            </div>
        </div>

        <VaultRecoveryDialog v-model="vaultSecurity.recoveryOpen" @saved="vaultSecurity.load" />
    </section>
</template>

<style scoped>
.security-vault__row,
.security-vault__recovery {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
}

.security-vault__text {
    flex: 1 1 24ch;
    min-width: 0;
}

.security-vault__text p {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.45;
}

.security-vault__loading {
    padding: 0;
    justify-content: flex-start;
}

.security-vault__status {
    height: auto;
    white-space: normal;
}

.security-vault__hint {
    color: var(--ink);
}

.security-vault__scope {
    padding-top: 12px;
}

/* Bloc récupération : filet 2 px au-dessus, titre en noir (violet tant que le rappel est actif). */
.security-vault__recovery {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 2px solid var(--ink);
}

.security-vault__recovery-title {
    font-weight: 700;
    color: var(--ink) !important;
}

.security-vault__recovery-title.is-reminder {
    color: var(--violet-ink) !important;
}

.security-vault__recovery .su-btn {
    flex: none;
}
</style>
