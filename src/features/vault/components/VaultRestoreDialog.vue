<script setup lang="ts">
/**
 * Secours après une réinitialisation de mot de passe sans code : le code de récupération déballe la DEK,
 * ré-emballée par le mot de passe courant (ou la phrase de Coffre) puis `PUT /api/vault/password-wrap`.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import { withStepUpRetry } from '@/features/auth/step-up';
import { useVaultSecret } from '@/features/vault/composables/useVaultSecret';
import { VaultCryptoError } from '@/features/vault/crypto';
import { isValidRecoveryCode } from '@/features/vault/recovery-code';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; restored: [] }>();

const { t } = useI18n();
const vault = useVaultStore();
const secretKind = useVaultSecret();

const code = ref('');
const secret = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        code.value = '';
        secret.value = '';
        error.value = null;
        loading.value = false;
    }
);

async function restore() {
    error.value = null;
    if (!isValidRecoveryCode(code.value)) {
        error.value = t('vault.restore.errors.codeInvalid');
        return;
    }
    if (!secret.value) {
        error.value = t('vault.restore.errors.secretRequired', { label: secretKind.label.value });
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await withStepUpRetry((stepUp) => vault.restoreWithRecoveryCode(code.value, secret.value, secretKind.proof(secret.value, stepUp)));
        secret.value = '';
        code.value = '';
        emit('restored');
        open.value = false;
    } catch (e: unknown) {
        error.value =
            e instanceof VaultCryptoError && e.code === 'wrong_password' ? t('vault.restore.errors.wrongCode') : getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('vault.restore.title')"
        :subtitle="t('vault.restore.subtitle')"
        :max-width="520"
        :scrollable="false"
    >
        <form class="vault-restore" @submit.prevent="restore">
            <label class="vault-restore__label" for="vault-restore-code">{{ t('vault.restore.codeLabel') }}</label>
            <v-text-field
                id="vault-restore-code"
                v-model="code"
                :placeholder="t('vault.restore.codePlaceholder')"
                color="primary"
                variant="outlined"
                hide-details="auto"
                class="vault-restore__code"
                autocomplete="off"
                spellcheck="false"
                data-test="vault-restore-code"
            />
            <AuthPasswordField
                v-model="secret"
                :label="secretKind.label.value"
                :autocomplete="secretKind.autocomplete.value"
                class="mt-4"
                data-test="vault-restore-secret"
            />
            <p class="vault-restore__hint">{{ t('vault.restore.secretHint', { label: secretKind.label.value }) }}</p>
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="loading" data-test="vault-restore-submit" @click="restore">
                <span v-if="loading" class="su-spin" aria-hidden="true" />
                {{ t('vault.restore.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.vault-restore__label {
    display: block;
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--ink);
}

.vault-restore__code :deep(input) {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.vault-restore__hint {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--gray);
}
</style>
