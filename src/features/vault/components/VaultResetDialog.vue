<script setup lang="ts">
/**
 * Remise à zéro du Coffre : mot de passe et code perdus, les valeurs encore chiffrées sont effacées
 * définitivement (`POST /api/vault/reset`, step-up) et un Coffre neuf est créé avec le secret saisi.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import { withStepUpRetry } from '@/features/auth/step-up';
import { useVaultSecret } from '@/features/vault/composables/useVaultSecret';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; reset: [] }>();

const { t } = useI18n();
const vault = useVaultStore();
const secretKind = useVaultSecret();

const secret = ref('');
const confirmed = ref(false);
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
        secret.value = '';
        confirmed.value = false;
        error.value = null;
        loading.value = false;
    }
);

async function reset() {
    error.value = null;
    if (!confirmed.value) {
        error.value = t('vault.reset.errors.confirmRequired');
        return;
    }
    if (!secret.value) {
        error.value = t('vault.reset.errors.secretRequired', { label: secretKind.label.value });
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await withStepUpRetry((stepUp) => vault.resetVault(secret.value, secretKind.proof(secret.value, stepUp)));
        secret.value = '';
        emit('reset');
        open.value = false;
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('vault.reset.title')" :max-width="520" :scrollable="false">
        <form class="vault-reset" @submit.prevent="reset">
            <AppAlert type="warning">{{ t('vault.reset.warning') }}</AppAlert>
            <AuthPasswordField
                v-model="secret"
                :label="secretKind.label.value"
                :autocomplete="secretKind.autocomplete.value"
                class="mt-4"
                data-test="vault-reset-secret"
            />
            <AppCheckbox v-model="confirmed" class="vault-reset__confirm" data-test="vault-reset-confirm">
                <template #label>
                    <span class="vault-reset__confirm-label">{{ t('vault.reset.confirmLabel') }}</span>
                </template>
            </AppCheckbox>
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
            <button
                type="button"
                class="su-btn su-btn--ink"
                :disabled="loading || !confirmed"
                data-test="vault-reset-submit"
                @click="reset"
            >
                <span v-if="loading" class="su-spin" aria-hidden="true" />
                {{ t('vault.reset.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.vault-reset__confirm {
    margin-top: 12px;
}

.vault-reset__confirm-label {
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink);
}
</style>
