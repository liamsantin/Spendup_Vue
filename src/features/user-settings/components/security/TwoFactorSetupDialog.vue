<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import QRCode from 'qrcode';
import { useAuthStore, type TwoFactorSetup } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    enabled: [];
}>();

const auth = useAuthStore();
const { t } = useI18n();
const modalRef = ref<InstanceType<typeof AppModalBase> | null>(null);

const step = ref<'loading' | 'setup' | 'verify'>('loading');
const setup = ref<TwoFactorSetup | null>(null);
const qrDataUrl = ref<string | null>(null);
const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const copiedSecret = ref(false);
const copiedCodes = ref(false);
const codesAcknowledged = ref(false);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

async function startSetup() {
    step.value = 'loading';
    setup.value = null;
    qrDataUrl.value = null;
    code.value = '';
    error.value = null;
    copiedSecret.value = false;
    copiedCodes.value = false;
    codesAcknowledged.value = false;
    loading.value = true;
    try {
        const result = await auth.setupTwoFactor();
        setup.value = result;
        qrDataUrl.value = await QRCode.toDataURL(result.otpAuthUri, {
            width: 220,
            margin: 2,
            errorCorrectionLevel: 'M'
        });
        step.value = 'setup';
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
        step.value = 'setup';
    } finally {
        loading.value = false;
        await modalRef.value?.refreshScrollbar();
    }
}

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            void startSetup();
        }
    }
);

watch(step, async () => {
    await modalRef.value?.refreshScrollbar();
});

async function copyText(text: string, kind: 'secret' | 'codes') {
    try {
        await navigator.clipboard.writeText(text);
        if (kind === 'secret') {
            copiedSecret.value = true;
            setTimeout(() => {
                copiedSecret.value = false;
            }, 2000);
        } else {
            copiedCodes.value = true;
            setTimeout(() => {
                copiedCodes.value = false;
            }, 2000);
        }
    } catch {
        error.value = t('security.setupDialog.errors.copyFailed');
    }
}

function goToVerify() {
    error.value = null;
    if (!codesAcknowledged.value) {
        error.value = t('security.setupDialog.errors.acknowledgeRequired');
        return;
    }
    step.value = 'verify';
}

async function enable(submittedCode?: string) {
    error.value = null;
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = t('security.setupDialog.errors.invalidCode');
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        await auth.enableTwoFactor(otp);
        open.value = false;
        emit('enabled');
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <AppModalBase
        ref="modalRef"
        v-model="open"
        :title="t('security.setupDialog.title')"
        :subtitle="t('security.setupDialog.subtitle')"
        :max-width="520"
        :height="640"
    >
        <div v-if="step === 'loading'" class="d-flex justify-center py-10">
            <span class="su-spin" />
        </div>

        <template v-else-if="step === 'setup' && setup">
            <!-- Code QR dans un carré à cadre 1 px noir. -->
            <div class="two-factor-setup__qr-wrap">
                <img
                    v-if="qrDataUrl"
                    :src="qrDataUrl"
                    :alt="t('security.setupDialog.qrAlt')"
                    width="220"
                    height="220"
                    class="two-factor-setup__qr"
                />
            </div>

            <label class="two-factor-setup__label" for="two-factor-secret">{{ t('security.setupDialog.secretLabel') }}</label>
            <div class="two-factor-setup__secret">
                <v-text-field
                    id="two-factor-secret"
                    :model-value="setup.secret"
                    variant="outlined"
                    readonly
                    hide-details
                    density="comfortable"
                    class="two-factor-setup__secret-field"
                />
                <button type="button" class="su-btn su-btn--ink" @click="copyText(setup.secret, 'secret')">
                    {{ copiedSecret ? t('security.setupDialog.copied') : t('security.setupDialog.copy') }}
                </button>
            </div>

            <AppAlert type="warning" class="mb-4">
                {{ t('security.setupDialog.recoveryWarning') }}
            </AppAlert>

            <!-- Codes de secours : grille mono dans un encadré 1 px, bouton de copie pleine largeur. -->
            <div class="two-factor-setup__codes">
                <ul class="two-factor-setup__code-list">
                    <li v-for="recovery in setup.recoveryCodes" :key="recovery">{{ recovery }}</li>
                </ul>
                <button
                    type="button"
                    class="su-btn su-btn--ink two-factor-setup__copy-codes"
                    @click="copyText(setup.recoveryCodes.join('\n'), 'codes')"
                >
                    {{ copiedCodes ? t('security.setupDialog.codesCopied') : t('security.setupDialog.copyCodes') }}
                </button>
            </div>

            <AppCheckbox v-model="codesAcknowledged" :label="t('security.setupDialog.acknowledge')" />
        </template>

        <template v-else-if="step === 'verify'">
            <p class="two-factor-setup__label">{{ t('security.setupDialog.otpLabel') }}</p>
            <OtpDigitsInput v-model="code" field-class="two-factor-enable-otp" @complete="enable" />
        </template>

        <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="close">{{ t('common.cancel') }}</button>
            <template v-if="step === 'setup' || step === 'loading'">
                <button v-if="!setup" type="button" class="su-btn su-btn--ink" :disabled="loading" @click="startSetup">
                    {{ t('security.setupDialog.retry') }}
                </button>
                <button v-else type="button" class="su-btn su-btn--ink" @click="goToVerify">
                    {{ t('security.setupDialog.continue') }}
                </button>
            </template>
            <template v-else-if="step === 'verify'">
                <button type="button" class="su-btn" @click="step = 'setup'">{{ t('security.setupDialog.back') }}</button>
                <button type="button" class="su-btn su-btn--ink" :disabled="loading" @click="enable()">
                    {{ t('security.setupDialog.activate') }}
                </button>
            </template>
        </template>
    </AppModalBase>
</template>

<style scoped>
.two-factor-setup__qr-wrap {
    display: flex;
    justify-content: center;
    margin: 0 0 24px;
}

.two-factor-setup__qr {
    display: block;
    width: 220px;
    height: 220px;
    padding: 8px;
    border: 1px solid var(--ink);
    /* le QR reste sur blanc pour rester lisible par la caméra, y compris en mode sombre */
    background: #fff;
}

.two-factor-setup__label {
    display: block;
    margin: 0 0 8px;
    color: var(--ink);
    font-size: 13px;
}

.two-factor-setup__secret {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 24px;
}

.two-factor-setup__secret-field {
    flex: 1 1 auto;
    min-width: 0;
}

.two-factor-setup__secret-field :deep(input) {
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
}

.two-factor-setup__codes {
    margin: 0 0 16px;
    padding: 16px;
    border: 1px solid var(--line);
}

.two-factor-setup__code-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.two-factor-setup__copy-codes {
    width: 100%;
    margin-top: 16px;
}
</style>
