<script setup lang="ts">
/**
 * Réinitialisation du mot de passe par jeton e-mail. Si le compte a un Coffre, les paramètres sont lus
 * avec le jeton (`GET /api/auth/reset-password/vault`) : le code de récupération déballe la DEK et la
 * ré-emballe avec le nouveau mot de passe (`vaultWrap`). Sans code, l’utilisateur confirme explicitement
 * que les champs du Coffre seront perdus avant l’envoi sans `vaultWrap`.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth';
import { authApi } from '@/features/auth/api';
import { clearPasswordResetTokenFromUrl, readPasswordResetToken } from '@/features/auth/password-reset-token';
import { rewrapWithRecoveryCode, VaultCryptoError } from '@/features/vault/crypto';
import { isValidRecoveryCode } from '@/features/vault/recovery-code';
import type { VaultResetParams, VaultWrapRequest } from '@/features/vault/types';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { t } = useI18n();

const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const capturedFromUrl = ref(false);

/** Paramètres du Coffre pour ce jeton ; `null` tant qu’ils ne sont pas connus (ou route indisponible). */
const vaultParams = ref<VaultResetParams | null>(null);
const vaultParamsLoading = ref(false);
const recoveryCode = ref('');
const acceptLoss = ref(false);

const showManualToken = computed(() => !capturedFromUrl.value && !token.value);
const vaultExists = computed(() => vaultParams.value?.exists === true);
const vaultHasRecovery = computed(() => vaultExists.value && vaultParams.value?.hasRecovery === true);
const usingRecoveryCode = computed(() => vaultHasRecovery.value && recoveryCode.value.trim() !== '');
/** Un Coffre existe et aucun code n’est saisi : l’envoi efface l’emballage, il faut l’accepter. */
const mustAcceptLoss = computed(() => vaultExists.value && !usingRecoveryCode.value);

const passwordRules = [
    (v: string) => !!v || t('auth.resetPassword.errors.required'),
    (v: string) => !!(v && v.length >= 8) || t('auth.resetPassword.errors.minLength'),
    (v: string) => /[A-Za-z]/.test(v) || t('auth.resetPassword.errors.letter'),
    (v: string) => /\d/.test(v) || t('auth.resetPassword.errors.digit')
];
const confirmPasswordRules = [
    (v: string) => !!v || t('auth.resetPassword.errors.required'),
    (v: string) => v === newPassword.value || t('auth.resetPassword.errors.mismatch')
];
const tokenRules = [(v: string) => !!v.trim() || t('auth.resetPassword.errors.required')];

let paramsRequestId = 0;

/** Lit les paramètres du Coffre pour le jeton courant ; une erreur (jeton invalide, route absente) est silencieuse ici. */
async function loadVaultParams(current: string) {
    const id = ++paramsRequestId;
    const trimmed = current.trim();
    if (!trimmed) {
        vaultParams.value = null;
        return;
    }
    vaultParamsLoading.value = true;
    try {
        const params = await authApi.resetPasswordVaultParams(trimmed);
        if (id !== paramsRequestId) return;
        vaultParams.value = params ?? null;
    } catch {
        if (id === paramsRequestId) vaultParams.value = null;
    } finally {
        if (id === paramsRequestId) vaultParamsLoading.value = false;
    }
}

onMounted(() => {
    const fromUrl = readPasswordResetToken(route);
    if (!fromUrl) return;
    token.value = fromUrl;
    capturedFromUrl.value = true;
    clearPasswordResetTokenFromUrl(router, route);
});

watch(token, (value) => void loadVaultParams(value), { immediate: true });

async function submit() {
    error.value = null;
    const currentToken = token.value.trim();
    if (!currentToken) return;
    if (newPassword.value !== confirmPassword.value) return;

    let vaultWrap: VaultWrapRequest | null = null;
    if (usingRecoveryCode.value && vaultParams.value) {
        if (!isValidRecoveryCode(recoveryCode.value)) {
            error.value = t('auth.resetPassword.vault.errors.codeInvalid');
            return;
        }
        try {
            vaultWrap = { dekWrappedPassword: await rewrapWithRecoveryCode(recoveryCode.value, vaultParams.value, newPassword.value) };
        } catch (e: unknown) {
            error.value =
                e instanceof VaultCryptoError && e.code === 'wrong_password'
                    ? t('auth.resetPassword.vault.errors.wrongCode')
                    : e instanceof Error
                      ? e.message
                      : String(e);
            return;
        }
    } else if (mustAcceptLoss.value && !acceptLoss.value) {
        error.value = t('auth.resetPassword.vault.errors.confirmLoss');
        return;
    }

    loading.value = true;
    try {
        await auth.resetPassword(currentToken, newPassword.value, vaultWrap);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="auth-form">
        <template v-if="showManualToken">
            <AppAlert type="info" class="mb-4">{{ t('auth.resetPassword.manualTokenHint') }}</AppAlert>
            <div class="auth-field">
                <label class="auth-field__label">{{ t('auth.resetPassword.token') }}</label>
                <VTextField v-model="token" :rules="tokenRules" hide-details="auto" autocomplete="off" />
            </div>
        </template>

        <AuthPasswordField
            v-model="newPassword"
            :label="t('auth.resetPassword.newPassword')"
            :rules="passwordRules"
            autocomplete="new-password"
        />
        <AuthPasswordField
            v-model="confirmPassword"
            :label="t('auth.resetPassword.confirmPassword')"
            :rules="confirmPasswordRules"
            autocomplete="new-password"
        />

        <!-- Coffre : code de récupération (s’il existe), sinon avertissement et confirmation explicite. -->
        <template v-if="vaultExists">
            <template v-if="vaultHasRecovery">
                <div class="auth-field" data-test="reset-vault-recovery">
                    <label class="auth-field__label">{{ t('auth.resetPassword.vault.codeLabel') }}</label>
                    <VTextField
                        v-model="recoveryCode"
                        :placeholder="t('auth.resetPassword.vault.codePlaceholder')"
                        hide-details="auto"
                        autocomplete="off"
                        spellcheck="false"
                        class="reset-vault__code"
                    />
                    <p class="reset-vault__hint">{{ t('auth.resetPassword.vault.codeHint') }}</p>
                </div>
            </template>
            <AppAlert v-if="mustAcceptLoss" type="warning" class="mb-2" data-test="reset-vault-warning">
                {{ t(vaultHasRecovery ? 'auth.resetPassword.vault.lossWarningNoCode' : 'auth.resetPassword.vault.lossWarningNoRecovery') }}
            </AppAlert>
            <AppCheckbox v-if="mustAcceptLoss" v-model="acceptLoss" class="reset-vault__accept" data-test="reset-vault-accept">
                <template #label>
                    <span class="reset-vault__accept-label">{{ t('auth.resetPassword.vault.acceptLoss') }}</span>
                </template>
            </AppCheckbox>
        </template>

        <button
            type="button"
            class="su-btn su-btn--ink auth-submit"
            :disabled="loading || vaultParamsLoading || (mustAcceptLoss && !acceptLoss)"
            @click="submit"
        >
            <span v-if="loading" class="su-spin" aria-hidden="true" />
            {{ t('auth.resetPassword.submit') }}
        </button>
        <AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>
    </div>
</template>

<style scoped>
.reset-vault__code :deep(input) {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.reset-vault__hint {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--gray);
}

.reset-vault__accept {
    margin-bottom: 8px;
}

.reset-vault__accept-label {
    font-size: 14px;
    line-height: 1.4;
}
</style>
