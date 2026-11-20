<script setup lang="ts">
/**
 * Génération du code de récupération : mot de passe (déballe la DEK, sert de preuve step-up), puis code
 * affiché une seule fois, confirmé par la saisie de ses 4 premiers caractères.
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import { withStepUpRetry } from '@/features/auth/step-up';
import { VaultCryptoError } from '@/features/vault/crypto';
import { normalizeRecoveryCode } from '@/features/vault/recovery-code';
import { useVaultStore } from '@/features/vault/stores/vault-store';
import { getErrorMessage } from '@/utils/errors/app-error';

/** Caractères du code à ressaisir pour confirmer qu’il a été noté. */
const CONFIRM_LENGTH = 4;
const COPIED_FEEDBACK_MS = 2000;

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const vault = useVaultStore();

const step = ref<'password' | 'show'>('password');
const password = ref('');
const code = ref<string | null>(null);
const confirmInput = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const confirmMatches = computed(() => {
    if (!code.value) return false;
    const expected = normalizeRecoveryCode(code.value).slice(0, CONFIRM_LENGTH);
    return normalizeRecoveryCode(confirmInput.value) === expected;
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        step.value = 'password';
        password.value = '';
        code.value = null;
        confirmInput.value = '';
        error.value = null;
        loading.value = false;
        copied.value = false;
    }
);

async function generate() {
    error.value = null;
    if (!password.value) {
        error.value = t('security.vault.dialog.errors.passwordRequired');
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        code.value = await withStepUpRetry((stepUp) => vault.createRecoveryCode(password.value, stepUp));
        password.value = '';
        step.value = 'show';
        emit('saved');
    } catch (e: unknown) {
        error.value =
            e instanceof VaultCryptoError && e.code === 'wrong_password'
                ? t('security.vault.dialog.errors.wrongPassword')
                : getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

async function copyCode() {
    if (!code.value) return;
    try {
        await navigator.clipboard.writeText(code.value);
        copied.value = true;
        if (copiedTimer) clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => {
            copied.value = false;
        }, COPIED_FEEDBACK_MS);
    } catch {
        error.value = t('security.vault.dialog.errors.copyFailed');
    }
}

function finish() {
    if (!confirmMatches.value) {
        error.value = t('security.vault.dialog.errors.confirmMismatch');
        return;
    }
    code.value = null;
    open.value = false;
}

onUnmounted(() => {
    if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('security.vault.dialog.title')"
        :subtitle="step === 'password' ? t('security.vault.dialog.subtitle') : undefined"
        :max-width="520"
        :scrollable="false"
    >
        <form v-if="step === 'password'" class="vault-recovery" @submit.prevent="generate">
            <AuthPasswordField
                v-model="password"
                :label="t('security.vault.dialog.passwordLabel')"
                autocomplete="current-password"
                data-test="vault-recovery-password"
            />
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <div v-else class="vault-recovery" role="status" aria-live="polite">
            <p class="vault-recovery__label">{{ t('security.vault.dialog.codeLabel') }}</p>
            <div class="vault-recovery__code-row">
                <code class="vault-recovery__code" data-test="vault-recovery-code">{{ code }}</code>
                <button type="button" class="su-btn su-btn--sm" data-test="vault-recovery-copy" @click="copyCode">
                    {{ copied ? t('security.vault.dialog.copied') : t('security.vault.dialog.copy') }}
                </button>
            </div>
            <p class="vault-recovery__warning">{{ t('security.vault.dialog.oneTimeWarning') }}</p>
            <label class="vault-recovery__confirm-label" for="vault-recovery-confirm">{{ t('security.vault.dialog.confirmLabel') }}</label>
            <v-text-field
                id="vault-recovery-confirm"
                v-model="confirmInput"
                :placeholder="t('security.vault.dialog.confirmPlaceholder')"
                :maxlength="CONFIRM_LENGTH + 1"
                color="primary"
                variant="outlined"
                hide-details="auto"
                class="vault-recovery__confirm"
                autocomplete="off"
                data-test="vault-recovery-confirm"
                @keydown.enter.prevent="finish"
            />
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </div>

        <template #footer="{ close }">
            <template v-if="step === 'password'">
                <button type="button" class="su-btn su-btn--ghost" :disabled="loading" @click="close">{{ t('common.cancel') }}</button>
                <button type="button" class="su-btn su-btn--ink" :disabled="loading" data-test="vault-recovery-generate" @click="generate">
                    {{ t('security.vault.dialog.generate') }}
                </button>
            </template>
            <button
                v-else
                type="button"
                class="su-btn su-btn--ink"
                :disabled="!confirmMatches"
                data-test="vault-recovery-close"
                @click="finish"
            >
                {{ t('security.vault.dialog.close') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.vault-recovery__label,
.vault-recovery__confirm-label {
    display: block;
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--gray);
}

.vault-recovery__confirm-label {
    margin-top: 20px;
    color: var(--ink);
}

.vault-recovery__code-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 24px;
}

/* Le code en chasse fixe, sélectionnable d’un clic ; les groupes passent à la ligne sur mobile. */
.vault-recovery__code {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.5;
    letter-spacing: 0.06em;
    color: var(--ink);
    background: none;
    padding: 0;
    user-select: all;
    overflow-wrap: anywhere;
}

.vault-recovery__warning {
    margin: 12px 0 0;
    font-size: 14px;
    line-height: 1.45;
    color: var(--violet-ink);
}

.vault-recovery__confirm {
    max-width: 160px;
}

.vault-recovery__confirm :deep(input) {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}
</style>
