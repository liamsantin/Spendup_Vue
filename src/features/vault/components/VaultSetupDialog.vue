<script setup lang="ts">
/**
 * Création du Coffre d’un compte existant (`POST /api/vault`, step-up) : phrase de Coffre pour un compte
 * Google seul (saisie deux fois, jamais transmise au serveur), mot de passe pour un compte inscrit sans Coffre.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import { withStepUpRetry } from '@/features/auth/step-up';
import { useVaultSecret } from '@/features/vault/composables/useVaultSecret';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { getErrorMessage } from '@/utils/errors/app-error';

/** Longueur minimale d’une phrase de Coffre : elle protège seule la clé d’un compte Google. */
const VAULT_PHRASE_MIN_LENGTH = 12;

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; created: [] }>();

const { t } = useI18n();
const vault = useVaultStore();
const secretKind = useVaultSecret();

const secret = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const isPhrase = computed(() => secretKind.kind.value === 'phrase');

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        secret.value = '';
        confirm.value = '';
        error.value = null;
        loading.value = false;
    }
);

async function create() {
    error.value = null;
    if (!secret.value) {
        error.value = t('vault.setup.errors.required', { label: secretKind.label.value });
        return;
    }
    if (isPhrase.value) {
        if (secret.value.length < VAULT_PHRASE_MIN_LENGTH) {
            error.value = t('vault.setup.errors.tooShort', { min: VAULT_PHRASE_MIN_LENGTH });
            return;
        }
        if (secret.value !== confirm.value) {
            error.value = t('vault.setup.errors.mismatch');
            return;
        }
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await withStepUpRetry((stepUp) => vault.createWithSecret(secret.value, secretKind.proof(secret.value, stepUp)));
        secret.value = '';
        confirm.value = '';
        emit('created');
        open.value = false;
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t(isPhrase ? 'vault.setup.titlePhrase' : 'vault.setup.titlePassword')"
        :subtitle="t(isPhrase ? 'vault.setup.subtitlePhrase' : 'vault.setup.subtitlePassword')"
        :max-width="520"
        :scrollable="false"
    >
        <form class="vault-setup" @submit.prevent="create">
            <AuthPasswordField
                v-model="secret"
                :label="secretKind.label.value"
                :autocomplete="isPhrase ? 'new-password' : 'current-password'"
                data-test="vault-setup-secret"
            />
            <AuthPasswordField
                v-if="isPhrase"
                v-model="confirm"
                :label="t('vault.setup.confirmLabel')"
                autocomplete="new-password"
                class="mt-3"
                data-test="vault-setup-confirm"
            />
            <p v-if="isPhrase" class="vault-setup__hint">{{ t('vault.setup.phraseHint', { min: VAULT_PHRASE_MIN_LENGTH }) }}</p>
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="loading" data-test="vault-setup-submit" @click="create">
                <span v-if="loading" class="su-spin" aria-hidden="true" />
                {{ t('vault.setup.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.vault-setup__hint {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--violet-ink);
}
</style>
