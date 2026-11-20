<script setup lang="ts">
/**
 * Désactivation du Coffre : `POST /api/vault/disable` (step-up), déchiffrement de toutes les valeurs par
 * lots, puis `DELETE /api/vault` (step-up). L’API refuse la suppression tant qu’une valeur `enc:v1:` subsiste :
 * l’erreur est affichée telle quelle et l’utilisateur peut relancer.
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
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; disabled: [] }>();

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

const needsSecret = computed(() => secretKind.kind.value === 'password');
const progressText = computed(() => {
    switch (vault.disabling.step) {
        case 'disabling':
            return t('vault.disable.progress.disabling');
        case 'decrypting':
            return t('vault.disable.progress.decrypting', { done: vault.disabling.done, total: vault.disabling.total });
        case 'deleting':
            return t('vault.disable.progress.deleting');
        default:
            return null;
    }
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

async function disable() {
    error.value = null;
    if (!confirmed.value) {
        error.value = t('vault.disable.errors.confirmRequired');
        return;
    }
    if (needsSecret.value && !secret.value) {
        error.value = t('vault.disable.errors.secretRequired');
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await withStepUpRetry((stepUp) => vault.disableVault(secretKind.proof(secret.value, stepUp)));
        secret.value = '';
        emit('disabled');
        open.value = false;
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('vault.disable.title')" :max-width="520" :persistent="loading" :scrollable="false">
        <form class="vault-disable" @submit.prevent="disable">
            <AppAlert type="warning">{{ t('vault.disable.warning') }}</AppAlert>
            <AuthPasswordField
                v-if="needsSecret"
                v-model="secret"
                :label="secretKind.label.value"
                :autocomplete="secretKind.autocomplete.value"
                class="mt-4"
                data-test="vault-disable-secret"
            />
            <AppCheckbox v-model="confirmed" class="vault-disable__confirm" :disabled="loading" data-test="vault-disable-confirm">
                <template #label>
                    <span class="vault-disable__confirm-label">{{ t('vault.disable.confirmLabel') }}</span>
                </template>
            </AppCheckbox>
            <p
                v-if="loading && progressText"
                class="vault-disable__progress"
                role="status"
                aria-live="polite"
                data-test="vault-disable-progress"
            >
                <span class="su-spin" aria-hidden="true" /> {{ progressText }}
            </p>
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
            <button
                type="button"
                class="su-btn su-btn--ink"
                :disabled="loading || !confirmed"
                data-test="vault-disable-submit"
                @click="disable"
            >
                {{ t('vault.disable.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.vault-disable__confirm {
    margin-top: 12px;
}

.vault-disable__confirm-label {
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink);
}

.vault-disable__progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 0;
    font-size: 14px;
    color: var(--gray);
    font-variant-numeric: tabular-nums;
}
</style>
