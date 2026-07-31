<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import QRCode from 'qrcode';
import { XIcon } from 'vue-tabler-icons';
import { useAuthStore, type TwoFactorSetup } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    enabled: [];
}>();

const auth = useAuthStore();

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
        error.value = 'Impossible de copier dans le presse-papiers.';
    }
}

function goToVerify() {
    error.value = null;
    if (!codesAcknowledged.value) {
        error.value = 'Confirmez avoir enregistré vos codes de récupération.';
        return;
    }
    step.value = 'verify';
}

async function enable(submittedCode?: string) {
    error.value = null;
    const otp = submittedCode ?? code.value;
    if (otp.length !== 6) {
        error.value = 'Saisissez le code à 6 chiffres de votre application.';
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

function close() {
    open.value = false;
}
</script>

<template>
    <v-dialog v-model="open" max-width="520" persistent>
        <v-card rounded="md" class="totp-dialog-card">
            <div class="totp-dialog-header">
                <div class="pr-10">
                    <h5 class="text-h5">Activer la double authentification</h5>
                    <div class="text-subtitle-1 text-medium-emphasis mt-1">
                        Utilisez une application comme Google Authenticator ou Authy.
                    </div>
                </div>
                <v-btn class="totp-dialog-close" icon variant="text" size="small" aria-label="Fermer" @click="close">
                    <XIcon size="20" />
                </v-btn>
            </div>

            <v-divider class="flex-grow-0" />

            <div class="totp-dialog-body">
                <div v-if="step === 'loading'" class="d-flex justify-center py-10">
                    <v-progress-circular indeterminate color="primary" size="40" />
                </div>

                <template v-else-if="step === 'setup' && setup">
                    <div class="text-center mb-6">
                        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code 2FA" width="220" height="220" class="rounded-md" />
                    </div>

                    <v-label class="mb-2 font-weight-medium">Clé secrète (saisie manuelle)</v-label>
                    <div class="d-flex align-center ga-2 mb-6">
                        <v-text-field :model-value="setup.secret" variant="outlined" readonly hide-details density="comfortable" />
                        <v-btn variant="tonal" color="primary" flat @click="copyText(setup.secret, 'secret')">
                            {{ copiedSecret ? 'Copié' : 'Copier' }}
                        </v-btn>
                    </div>

                    <AppAlert type="warning" variant="tonal" class="mb-4">
                        Conservez ces codes de récupération en lieu sûr. Ils ne seront affichés qu’une seule fois.
                    </AppAlert>

                    <v-sheet border rounded="md" class="pa-4 mb-4">
                        <div class="d-flex flex-wrap ga-2">
                            <v-chip v-for="recovery in setup.recoveryCodes" :key="recovery" variant="tonal" color="primary">
                                {{ recovery }}
                            </v-chip>
                        </div>
                        <v-btn
                            class="mt-4"
                            variant="tonal"
                            color="primary"
                            flat
                            block
                            @click="copyText(setup.recoveryCodes.join('\n'), 'codes')"
                        >
                            {{ copiedCodes ? 'Codes copiés' : 'Copier les codes' }}
                        </v-btn>
                    </v-sheet>

                    <v-checkbox
                        v-model="codesAcknowledged"
                        hide-details
                        color="primary"
                        label="J’ai enregistré mes codes de récupération"
                    />
                </template>

                <template v-else-if="step === 'verify'">
                    <v-label class="text-subtitle-1 font-weight-semibold pb-2">Code de l’application</v-label>
                    <OtpDigitsInput v-model="code" field-class="two-factor-enable-otp" @complete="enable" />
                </template>

                <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
            </div>

            <v-divider class="flex-grow-0" />

            <div class="totp-dialog-footer">
                <v-btn variant="text" flat @click="close">Annuler</v-btn>
                <v-spacer />
                <template v-if="step === 'setup' || step === 'loading'">
                    <v-btn v-if="!setup" color="primary" flat :loading="loading" @click="startSetup">Réessayer</v-btn>
                    <v-btn v-else color="primary" flat @click="goToVerify">Continuer</v-btn>
                </template>
                <template v-else-if="step === 'verify'">
                    <v-btn variant="text" flat class="mr-2" @click="step = 'setup'">Retour</v-btn>
                    <v-btn color="primary" flat :loading="loading" @click="enable()">Activer</v-btn>
                </template>
            </div>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.totp-dialog-card {
    display: flex;
    flex-direction: column;
    max-height: min(85vh, 720px);
    overflow: hidden;
}

.totp-dialog-header {
    position: relative;
    flex-shrink: 0;
    padding: 20px 24px;
}

.totp-dialog-close {
    position: absolute;
    top: 12px;
    right: 12px;
}

.totp-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
}

.totp-dialog-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
}
</style>
