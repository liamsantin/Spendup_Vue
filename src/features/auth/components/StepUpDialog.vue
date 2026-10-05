<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import OtpDigitsInput from '@/components/auth/OtpDigitsInput.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import { useStepUpStore } from '@/features/auth/stores/step-up-store';

const { t } = useI18n();
const store = useStepUpStore();
const { open, details } = storeToRefs(store);

const password = ref('');
const otp = ref('');
const googleIdToken = ref<string | null>(null);
const localError = ref<string | null>(null);

const needsPassword = computed(() => !!details.value?.requiresPassword);
const needsOtp = computed(() => !!details.value?.requiresOtp);
const needsGoogle = computed(() => !!details.value?.requiresGoogleIdToken);

const canSubmit = computed(() => {
    if (needsPassword.value && !password.value) return false;
    if (needsOtp.value && otp.value.replace(/\D/g, '').length < 6) return false;
    if (needsGoogle.value && !googleIdToken.value) return false;
    return needsPassword.value || needsOtp.value || needsGoogle.value;
});

watch(open, (value) => {
    if (!value) return;
    password.value = '';
    otp.value = '';
    googleIdToken.value = null;
    localError.value = null;
});

function onGoogleCredential(idToken: string) {
    googleIdToken.value = idToken;
    localError.value = null;
}

function submit() {
    localError.value = null;
    if (!canSubmit.value) {
        localError.value = t('auth.stepUp.errors.incomplete');
        return;
    }
    store.confirm({
        ...(needsPassword.value ? { password: password.value } : {}),
        ...(needsOtp.value ? { otp: otp.value.replace(/\D/g, '').slice(0, 6) } : {}),
        ...(needsGoogle.value && googleIdToken.value ? { googleIdToken: googleIdToken.value } : {})
    });
}

function onOpenChange(value: boolean) {
    if (!value) store.cancel();
}
</script>

<template>
    <AppModalBase
        :model-value="open"
        :title="t('auth.stepUp.title')"
        :subtitle="t('auth.stepUp.subtitle')"
        :max-width="440"
        :scrollable="false"
        @update:model-value="onOpenChange"
    >
        <AppAlert v-if="localError" type="error" class="mb-3" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div v-if="needsPassword" class="mb-4">
            <v-label class="mb-1 font-weight-medium">{{ t('auth.stepUp.fields.password') }}</v-label>
            <v-text-field
                v-model="password"
                type="password"
                variant="outlined"
                hide-details
                autocomplete="current-password"
                @keyup.enter="submit"
            />
        </div>

        <div v-if="needsOtp" class="mb-4">
            <v-label class="mb-2 font-weight-medium">{{ t('auth.stepUp.fields.otp') }}</v-label>
            <OtpDigitsInput v-model="otp" />
        </div>

        <div v-if="needsGoogle" class="mb-2">
            <div class="text-subtitle-1 text-medium-emphasis mb-3">{{ t('auth.stepUp.fields.google') }}</div>
            <GoogleSignInButton :label="t('auth.stepUp.googleConfirm')" @credential="onGoogleCredential" />
            <div v-if="googleIdToken" class="text-subtitle-2 text-success mt-2">{{ t('auth.stepUp.googleReady') }}</div>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="close">{{ t('common.cancel') }}</button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canSubmit" @click="submit">{{ t('auth.stepUp.confirm') }}</button>
        </template>
    </AppModalBase>
</template>
